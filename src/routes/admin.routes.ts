import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { z } from 'zod';

const router = Router();

// Aplicar seguridad para Super Administrador (Root / SysAdmin)
router.use(authenticateJWT);
router.use(requireRoles('SUPER_ADMIN'));

// 1. Listar Usuarios Registrados con Estado de Licencia Detallado
router.get('/workers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.query;
    const whereCondition: any = { role: 'WORKER' };
    if (status) whereCondition.status = status;

    const workers = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        nationalId: true,
        phone: true,
        address: true,
        status: true,
        createdAt: true,
        subscriptions: {
          orderBy: { endDate: 'desc' },
          take: 1,
          include: { plan: true },
        },
        _count: {
          select: {
            clientas: true,
            servicios: true,
            citas: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const formattedWorkers = workers.map(w => {
      const latestSub = w.subscriptions[0] || null;
      let licenseInfo = {
        hasLicense: false,
        isActive: false,
        status: 'NO_LICENSE',
        startDate: null as string | null,
        endDate: null as string | null,
        daysRemaining: 0,
        planName: 'Sin Licencia',
        isExpired: false,
      };

      if (latestSub) {
        const subEnd = new Date(latestSub.endDate);
        const isActive = latestSub.status === 'ACTIVE' && subEnd > now;
        const daysRemaining = Math.ceil((subEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        licenseInfo = {
          hasLicense: true,
          isActive,
          status: latestSub.status,
          startDate: latestSub.startDate.toISOString(),
          endDate: latestSub.endDate.toISOString(),
          daysRemaining: Math.max(0, daysRemaining),
          planName: latestSub.plan?.name || 'Licencia Estándar',
          isExpired: !isActive || daysRemaining <= 0,
        };
      }

      return {
        ...w,
        license: licenseInfo,
      };
    });

    return res.json({ success: true, workers: formattedWorkers });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error al obtener usuarios', error: error.message });
  }
});

// 2. Gestionar / Asignar / Renovar Licencia de Usuario (Días, Meses, Años o Fecha)
const manageLicenseSchema = z.object({
  unit: z.enum(['DAYS', 'MONTHS', 'YEARS', 'CUSTOM']),
  amount: z.number().int().min(0).default(1),
  customEndDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'CANCELLED']).default('ACTIVE'),
});

router.post('/workers/:workerId/license', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workerId } = req.params;
    const { unit, amount, customEndDate, status } = manageLicenseSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({
      where: { id: workerId },
      include: {
        subscriptions: {
          orderBy: { endDate: 'desc' },
          take: 1,
        }
      }
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Obtener o crear un plan estándar de referencia
    let defaultPlan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true }
    });

    if (!defaultPlan) {
      defaultPlan = await prisma.subscriptionPlan.create({
        data: {
          name: 'Licencia Profesional Multi-Tenant',
          description: 'Acceso a gestión de clientas, servicios y agenda privada',
          price: 19.99,
          billingCycle: 'MONTHLY',
          maxWorkers: 1,
        }
      });
    }

    const now = new Date();
    const latestSub = targetUser.subscriptions[0];
    
    // Si la unidad es sumar días/meses/años y tiene suscripción activa no vencida, extendemos desde esa fecha
    let baseDate = new Date(now);
    if (unit !== 'CUSTOM' && latestSub && latestSub.status === 'ACTIVE' && new Date(latestSub.endDate) > now) {
      baseDate = new Date(latestSub.endDate);
    }

    let calculatedEndDate = new Date(baseDate);

    if (unit === 'DAYS') {
      calculatedEndDate.setDate(calculatedEndDate.getDate() + amount);
      calculatedEndDate.setHours(23, 59, 59, 999);
    } else if (unit === 'MONTHS') {
      calculatedEndDate.setMonth(calculatedEndDate.getMonth() + amount);
      calculatedEndDate.setHours(23, 59, 59, 999);
    } else if (unit === 'YEARS') {
      calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + amount);
      calculatedEndDate.setHours(23, 59, 59, 999);
    } else if (unit === 'CUSTOM' && customEndDate) {
      const parts = customEndDate.split('-');
      if (parts.length === 3) {
        calculatedEndDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
      } else {
        calculatedEndDate = new Date(customEndDate);
        calculatedEndDate.setHours(23, 59, 59, 999);
      }
    }

    // Cancelar cualquier suscripción activa anterior para mantener una sola activa limpia
    await prisma.subscription.updateMany({
      where: { userId: workerId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' }
    });

    // Crear la nueva suscripción activa
    const subscription = await prisma.subscription.create({
      data: {
        userId: workerId,
        planId: defaultPlan.id,
        status: status,
        startDate: now,
        endDate: calculatedEndDate,
        autoRenew: true,
      },
      include: {
        plan: true,
      }
    });

    // Activar al usuario si estaba en PENDING_APPROVAL
    if (targetUser.status === 'PENDING_APPROVAL' && status === 'ACTIVE') {
      await prisma.user.update({
        where: { id: workerId },
        data: { status: 'ACTIVE' },
      });
    }

    const daysRemaining = Math.max(0, Math.ceil((calculatedEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Auditoría
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.userId,
        action: 'LICENSE_ASSIGNED_OR_EXTENDED',
        targetEntity: 'Subscription',
        targetId: subscription.id,
        metadata: {
          workerId,
          nationalId: targetUser.nationalId,
          unit,
          amount,
          newEndDate: calculatedEndDate.toISOString(),
          daysRemaining,
        }
      }
    });

    return res.json({
      success: true,
      message: `Licencia actualizada con éxito hasta el ${calculatedEndDate.toLocaleDateString()} (${daysRemaining} días restantes).`,
      subscription,
      daysRemaining,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Error al gestionar licencia', error: error.message });
  }
});

// 3. Revocar / Cancelar Licencia Inmediatamente
router.post('/workers/:workerId/license/revoke', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workerId } = req.params;

    const updated = await prisma.subscription.updateMany({
      where: { userId: workerId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' }
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.userId,
        action: 'LICENSE_REVOKED',
        targetEntity: 'Subscription',
        targetId: workerId,
        metadata: { workerId }
      }
    });

    return res.json({ success: true, message: 'Licencia revocada con éxito.', count: updated.count });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error al revocar licencia', error: error.message });
  }
});

// 4. Registrar Trabajador Directamente desde el Panel Super Admin (con opción de asignar licencia inicial)
const createWorkerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  nationalId: z.string().min(4),
  phone: z.string().min(7),
  address: z.string().min(3),
  password: z.string().min(6),
  status: z.enum(['ACTIVE', 'PENDING_APPROVAL']).default('ACTIVE'),
  initialLicenseMonths: z.number().int().min(0).default(1),
});

router.post('/workers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = createWorkerSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { nationalId: data.nationalId },
          { email: data.email }
        ]
      }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Ya existe un usuario con esta cédula o correo' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const worker = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        nationalId: data.nationalId,
        phone: data.phone,
        address: data.address,
        password: hashedPassword,
        role: 'WORKER',
        status: data.status,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nationalId: true,
        email: true,
        phone: true,
        address: true,
        status: true,
        createdAt: true,
      }
    });

    // Si se especificó licencia inicial > 0 meses, asignarla automáticamente
    if (data.initialLicenseMonths > 0) {
      let defaultPlan = await prisma.subscriptionPlan.findFirst({ where: { isActive: true } });
      if (!defaultPlan) {
        defaultPlan = await prisma.subscriptionPlan.create({
          data: {
            name: 'Licencia Profesional Multi-Tenant',
            price: 19.99,
            billingCycle: 'MONTHLY',
            maxWorkers: 1,
          }
        });
      }

      const now = new Date();
      const end = new Date(now);
      end.setMonth(end.getMonth() + data.initialLicenseMonths);

      await prisma.subscription.create({
        data: {
          userId: worker.id,
          planId: defaultPlan.id,
          status: 'ACTIVE',
          startDate: now,
          endDate: end,
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.userId,
        action: 'WORKER_CREATED_BY_ADMIN',
        targetEntity: 'User',
        targetId: worker.id,
        metadata: { nationalId: worker.nationalId, status: worker.status, initialLicenseMonths: data.initialLicenseMonths }
      }
    });

    return res.status(201).json({ success: true, message: 'Usuario trabajador registrado exitosamente con licencia.', worker });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Error al crear trabajador', error: error.message });
  }
});

// 5. Aprobación y Modificación de Estado (Activar / Suspender)
const updateWorkerStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE', 'PENDING_APPROVAL']),
});

router.patch('/workers/:workerId/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workerId } = req.params;
    const { status } = updateWorkerStatusSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({ where: { id: workerId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: workerId },
      data: { status },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.userId,
        action: 'WORKER_STATUS_UPDATED',
        targetEntity: 'User',
        targetId: workerId,
        metadata: { previousStatus: targetUser.status, newStatus: status }
      }
    });

    return res.json({
      success: true,
      message: `Estado actualizado a ${status}`,
      worker: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        status: updatedUser.status,
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Error al actualizar estado', error: error.message });
  }
});

// 6. Métricas de Plataforma (Exclusivas de Infraestructura & Administración)
router.get('/metrics', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const totalWorkers = await prisma.user.count({ where: { role: 'WORKER' } });
    const pendingWorkers = await prisma.user.count({ where: { role: 'WORKER', status: 'PENDING_APPROVAL' } });
    const activeWorkers = await prisma.user.count({ where: { role: 'WORKER', status: 'ACTIVE' } });
    const suspendedWorkers = await prisma.user.count({ where: { role: 'WORKER', status: 'SUSPENDED' } });
    
    // Licencias activas reales (no vencidas)
    const activeSubscriptions = await prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        endDate: { gt: new Date() }
      }
    });

    const totalAuditEvents = await prisma.auditLog.count();

    return res.json({
      success: true,
      metrics: {
        totalWorkers,
        pendingWorkers,
        activeWorkers,
        suspendedWorkers,
        activeSubscriptions,
        totalAuditEvents,
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error al obtener métricas', error: error.message });
  }
});

// 7. Registros de Auditoría
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nationalId: true,
            role: true,
          }
        }
      }
    });

    return res.json({ success: true, count: logs.length, logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error al obtener auditoría', error: error.message });
  }
});

// 8. Eliminar Usuario / Trabajador Permanentemente
router.delete('/workers/:workerId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workerId } = req.params;

    const targetUser = await prisma.user.findUnique({
      where: { id: workerId }
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      return res.status(400).json({ success: false, message: 'No se puede eliminar la cuenta de Super Administrador del Sistema' });
    }

    // Registrar en auditoría antes de eliminar
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.userId,
        action: 'WORKER_DELETED_BY_ADMIN',
        targetEntity: 'User',
        targetId: workerId,
        metadata: {
          deletedWorkerName: `${targetUser.firstName} ${targetUser.lastName}`,
          nationalId: targetUser.nationalId,
          email: targetUser.email,
        }
      }
    });

    // Eliminar usuario (las relaciones con clientas, citas, servicios y suscripciones se eliminan en cascada)
    await prisma.user.delete({
      where: { id: workerId }
    });

    return res.json({
      success: true,
      message: `Usuario ${targetUser.firstName} ${targetUser.lastName} (Cédula: ${targetUser.nationalId}) eliminado permanentemente.`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error al eliminar usuario', error: error.message });
  }
});

export default router;
