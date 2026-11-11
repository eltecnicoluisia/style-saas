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
router.get('/workers', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const workers = await prisma.user.findMany({
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
    console.error('Error al obtener usuarios:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
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
          where: { status: 'ACTIVE' },
          orderBy: { endDate: 'desc' },
          take: 1,
        }
      }
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Buscar o crear plan estándar por defecto
    let defaultPlan = await prisma.subscriptionPlan.findFirst({
      where: { isActive: true }
    });

    if (!defaultPlan) {
      defaultPlan = await prisma.subscriptionPlan.create({
        data: {
          id: 'plan-basic-2026',
          name: 'Licencia Profesional Multi-Tenant',
          description: 'Gestión ilimitada para centros de estética y barberías',
          price: 19.99,
          billingCycle: 'MONTHLY',
          maxWorkers: 1,
        }
      });
    }

    const now = new Date();
    let calculatedEndDate = new Date();

    const currentActiveSub = targetUser.subscriptions[0];
    if (currentActiveSub && new Date(currentActiveSub.endDate) > now) {
      calculatedEndDate = new Date(currentActiveSub.endDate);
    }

    if (unit === 'DAYS') {
      calculatedEndDate.setDate(calculatedEndDate.getDate() + amount);
    } else if (unit === 'MONTHS') {
      calculatedEndDate.setMonth(calculatedEndDate.getMonth() + amount);
    } else if (unit === 'YEARS') {
      calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + amount);
    } else if (unit === 'CUSTOM' && customEndDate) {
      calculatedEndDate = new Date(customEndDate);
    }

    // Cancelar licencias previas activas
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
    console.error('Error al gestionar licencia:', error);
    return res.status(500).json({ success: false, message: 'Error al gestionar licencia' });
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
    console.error('Error al revocar licencia:', error);
    return res.status(500).json({ success: false, message: 'Error al revocar licencia' });
  }
});

// 4. Registrar Trabajador Directamente desde el Panel Super Admin
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

    // Asignar licencia inicial si se requirió
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
    console.error('Error al crear trabajador:', error);
    return res.status(500).json({ success: false, message: 'Error al crear trabajador' });
  }
});

// 5. Aprobación y Modificación de Estado (Activar / Suspender)
// Protección estricta: No se permite auto-suspensión ni suspender/modificar cuentas SUPER_ADMIN
const updateWorkerStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE', 'PENDING_APPROVAL']),
});

router.patch('/workers/:workerId/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workerId } = req.params;
    const { status } = updateWorkerStatusSchema.parse(req.body);

    // Protección 1: No permitir que el Super Admin se auto-suspenda o modifique su propio estado
    if (req.user?.userId === workerId) {
      return res.status(400).json({
        success: false,
        message: 'Acción no permitida: No puedes modificar ni suspender tu propio estado de administrador.',
      });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: workerId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Protección 2: No permitir suspender o alterar estados de cuentas SUPER_ADMIN
    if (targetUser.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Acción denegada: No se puede modificar ni suspender el estado de un Super Administrador del Sistema.',
      });
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
    console.error('Error al actualizar estado:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar estado' });
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
    console.error('Error al obtener métricas:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener métricas' });
  }
});

// 7. Registro de Auditoría del Sistema
router.get('/audit-logs', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { firstName: true, lastName: true, nationalId: true, role: true }
        }
      }
    });

    return res.json({ success: true, logs });
  } catch (error: any) {
    console.error('Error al obtener auditoría:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener registros de auditoría' });
  }
});

// 8. Eliminación Definitiva de Cuenta de Trabajador
router.delete('/workers/:workerId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workerId } = req.params;

    if (req.user?.userId === workerId) {
      return res.status(400).json({ success: false, message: 'No puedes eliminar tu propia cuenta de administrador' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: workerId }
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'No se puede eliminar la cuenta de Super Administrador del Sistema' });
    }

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

    await prisma.user.delete({
      where: { id: workerId }
    });

    return res.json({
      success: true,
      message: `Usuario ${targetUser.firstName} ${targetUser.lastName} (Cédula: ${targetUser.nationalId}) eliminado permanentemente.`
    });
  } catch (error: any) {
    console.error('Error al eliminar usuario:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
  }
});

export default router;
