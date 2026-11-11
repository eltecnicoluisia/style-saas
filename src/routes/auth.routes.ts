import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/prisma.js';
import { JWT_SECRET } from '../config/jwt.js';

const router = Router();

// Rate limiter específico para login (protección contra fuerza bruta: 10 intentos por cada 15 min por IP)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de acceso fallidos desde esta dirección IP. Por favor, espere 15 minutos antes de volver a intentar.',
  },
});

// Rate limiter para registro (anti-spam de creación de cuentas: 10 registros por cada 15 min por IP)
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de registro desde esta dirección IP. Intente de nuevo más tarde.',
  },
});

const registerSchema = z.object({
  firstName: z.string().min(2, 'El nombre es obligatorio'),
  lastName: z.string().min(2, 'El apellido es obligatorio'),
  email: z.string().email('Correo electrónico inválido'),
  nationalId: z.string().min(4, 'Número de cédula inválido'),
  phone: z.string().min(7, 'Número de celular inválido'),
  address: z.string().min(3, 'Dirección obligatoria'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe incluir al menos una letra mayúscula')
    .regex(/[a-z]/, 'La contraseña debe incluir al menos una letra minúscula')
    .regex(/[0-9]/, 'La contraseña debe incluir al menos un número'),
  role: z.enum(['WORKER', 'CLIENT']).default('WORKER'),
});

const loginSchema = z.object({
  nationalId: z.string().min(1, 'La cédula es requerida para iniciar sesión'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

// Registro Centralizado de Trabajadores / Inquilinos
router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { nationalId: validatedData.nationalId },
          { email: validatedData.email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.nationalId === validatedData.nationalId) {
        return res.status(400).json({ success: false, message: 'Ya existe un usuario registrado con esta cédula' });
      }
      return res.status(400).json({ success: false, message: 'Ya existe un usuario registrado con este correo electrónico' });
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const newUser = await prisma.user.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        nationalId: validatedData.nationalId,
        phone: validatedData.phone,
        address: validatedData.address,
        password: hashedPassword,
        role: 'WORKER',
        status: 'PENDING_APPROVAL',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        nationalId: true,
        phone: true,
        address: true,
        role: true,
        status: true,
        createdAt: true,
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'USER_REGISTERED',
        targetEntity: 'User',
        targetId: newUser.id,
        metadata: {
          nationalId: newUser.nationalId,
          status: newUser.status
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Registro exitoso. Tu cuenta está en revisión y espera asignación de licencia por el Administrador de Sistemas.',
      user: newUser,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('Error al registrar usuario:', error);
    return res.status(500).json({ success: false, message: 'Error en el servidor al procesar el registro' });
  }
});

// Login Centralizado (Acceso mediante Cédula)
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { nationalId, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { nationalId },
      include: {
        subscriptions: {
          orderBy: { endDate: 'desc' },
          take: 1,
          include: { plan: true }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas (Cédula o contraseña incorrecta)' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas (Cédula o contraseña incorrecta)' });
    }

    if (user.role === 'WORKER' && user.status === 'PENDING_APPROVAL') {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta aún está pendiente de activación/asignación de licencia por el Administrador de Sistemas.',
        status: user.status
      });
    }

    if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta se encuentra suspendida. Contacta al Administrador de Sistemas.',
        status: user.status
      });
    }

    // Calcular estado de licencia para trabajadores
    let licenseInfo = null;
    if (user.role === 'WORKER') {
      const latestSub = user.subscriptions[0];
      const now = new Date();
      const isActive = latestSub && latestSub.status === 'ACTIVE' && new Date(latestSub.endDate) > now;
      const daysRemaining = latestSub ? Math.ceil((new Date(latestSub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      licenseInfo = {
        hasLicense: !!latestSub,
        isActive,
        status: latestSub ? latestSub.status : 'NO_LICENSE',
        startDate: latestSub ? latestSub.startDate : null,
        endDate: latestSub ? latestSub.endDate : null,
        daysRemaining: Math.max(0, daysRemaining),
        planName: latestSub?.plan?.name || 'Licencia Estándar',
      };
    }

    const payload = {
      userId: user.id,
      nationalId: user.nationalId,
      email: user.email,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        nationalId: user.nationalId,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        license: licenseInfo,
      },
      redirectTo: user.role === 'SUPER_ADMIN' ? '/admin/dashboard' : '/worker/dashboard'
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('Error en login:', error);
    return res.status(500).json({ success: false, message: 'Error en el inicio de sesión' });
  }
});

const resetPasswordSchema = z.object({
  nationalId: z.string().min(4, 'Número de cédula inválido'),
  email: z.string().email('Correo electrónico inválido'),
  newPassword: z.string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
    .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
});

// Endpoint seguro de Restablecimiento de Contraseña (Verificación de Identidad: Cédula + Email registrado)
router.post('/reset-password', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { nationalId, email, newPassword } = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        nationalId: nationalId.trim(),
        email: email.trim().toLowerCase(),
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró ninguna cuenta que coincida con esa cédula y correo electrónico.',
      });
    }

    if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta se encuentra suspendida. Contacta al Administrador de Sistemas.',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'PASSWORD_RESET_SELF',
        targetEntity: 'User',
        targetId: user.id,
        metadata: {
          nationalId: user.nationalId,
          email: user.email,
          ip: req.ip,
        },
      },
    });

    return res.json({
      success: true,
      message: '¡Contraseña restablecida con éxito! Ya puedes iniciar sesión con tu nueva contraseña.',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('Error al restablecer contraseña:', error);
    return res.status(500).json({ success: false, message: 'Error en el servidor al restablecer contraseña' });
  }
});

export default router;
