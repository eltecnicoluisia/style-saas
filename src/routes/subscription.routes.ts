import { Router, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { z } from 'zod';

const router = Router();
router.use(authenticateJWT);

const createPlanSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().min(0),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']),
  maxWorkers: z.number().int().positive(),
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
    return res.status(500).json({ success: false, message: 'Error al obtener planes', error: error.message });
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
    return res.status(500).json({ success: false, message: 'Error al crear plan', error: error.message });
  }
});

// Asignar o Actualizar Suscripción a Usuario
const assignSubscriptionSchema = z.object({
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  status: z.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED']).default('ACTIVE'),
  durationMonths: z.number().int().positive().default(1),
});

router.post('/assign', requireRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = assignSubscriptionSchema.parse(req.body);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + data.durationMonths);

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

    return res.status(201).json({ success: true, subscription });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Error al asignar suscripción', error: error.message });
  }
});

export default router;
