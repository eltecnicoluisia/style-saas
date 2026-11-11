import { Router, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { z } from 'zod';

const router = Router();
router.use(authenticateJWT);

const createPlanSchema = z.object({
  name: z.string().min(2, 'El nombre del plan debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']),
  maxWorkers: z.number().int().positive('El número de trabajadores debe ser mayor a 0'),
});

// Listar Planes
router.get('/plans', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { subscriptions: true }
        }
      }
    });
    return res.json({ success: true, plans });
  } catch (error: any) {
    console.error('Error al obtener planes:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener planes' });
  }
});

// Crear Plan de Suscripción (Solo Super Admin)
router.post('/plans', requireRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = createPlanSchema.parse(req.body);
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        billingCycle: data.billingCycle,
        maxWorkers: data.maxWorkers,
      }
    });

    return res.status(201).json({ success: true, plan });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('Error al crear plan:', error);
    return res.status(500).json({ success: false, message: 'Error al crear plan' });
  }
});

// Asignar o Actualizar Suscripción a Usuario
const assignSubscriptionSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido'),
  planId: z.string().min(1, 'ID de plan de suscripción requerido'),
  status: z.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED']).default('ACTIVE'),
  durationMonths: z.number().int().positive('La duración debe ser al menos 1 mes').default(1),
});

router.post('/assign', requireRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = assignSubscriptionSchema.parse(req.body);

    // 1. Validar existencia del usuario destinatario
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // 2. Validar existencia del plan de suscripción
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: data.planId },
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan de suscripción no encontrado' });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + data.durationMonths);

    // Cancelar cualquier suscripción activa anterior para unificar el ciclo
    if (data.status === 'ACTIVE') {
      await prisma.subscription.updateMany({
        where: { userId: data.userId, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId: data.userId,
        planId: data.planId,
        status: data.status,
        startDate,
        endDate,
      },
      include: {
        plan: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, nationalId: true }
        }
      }
    });

    // 3. Si el usuario estaba pendiente de aprobación y la suscripción es activa, activarlo
    if (user.status === 'PENDING_APPROVAL' && data.status === 'ACTIVE') {
      await prisma.user.update({
        where: { id: data.userId },
        data: { status: 'ACTIVE' },
      });
    }

    // 4. Registro de auditoría
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.userId,
        action: 'SUBSCRIPTION_ASSIGNED',
        targetEntity: 'Subscription',
        targetId: subscription.id,
        metadata: {
          userId: data.userId,
          userNationalId: user.nationalId,
          planId: data.planId,
          planName: plan.name,
          status: data.status,
          durationMonths: data.durationMonths,
          endDate: endDate.toISOString(),
        }
      }
    });

    return res.status(201).json({ success: true, subscription });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('Error al asignar suscripción:', error);
    return res.status(500).json({ success: false, message: 'Error al asignar suscripción' });
  }
});

export default router;
