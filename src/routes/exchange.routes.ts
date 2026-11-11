import { Router, Request, Response } from 'express';
import { ExchangeService } from '../services/exchange.service.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../config/prisma.js';
import { z } from 'zod';

const router = Router();

// 1. Obtener Tasa Oficial en Tiempo Real (Público / Autenticado)
router.get('/rate', async (_req: Request, res: Response) => {
  try {
    const rateData = await ExchangeService.getOfficialRate();
    return res.json({
      success: true,
      ...rateData,
    });
  } catch (error: any) {
    console.error('Error al consultar tasa de cambio:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar tasa de cambio' });
  }
});

// 2. Sobrescribir tasa manualmente si el Super Admin lo requiere
router.post('/rate', authenticateJWT, requireRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rate, reset } = z.object({
      rate: z.number().positive().optional(),
      reset: z.boolean().optional(),
    }).parse(req.body);

    if (reset) {
      ExchangeService.resetToAutomatic();
      const officialRate = await ExchangeService.getOfficialRate();

      try {
        await prisma.auditLog.create({
          data: {
            actorId: req.user!.userId,
            action: 'EXCHANGE_RATE_RESET_AUTOMATIC',
            targetEntity: 'ExchangeRate',
            metadata: { restoredRate: officialRate.rate },
          },
        });
      } catch (logErr) {
        console.warn('Advertencia al registrar auditoría de tasa:', logErr);
      }

      return res.json({
        success: true,
        message: 'Tasa restaurada a sincronización automática oficial',
        ...officialRate,
      });
    }

    if (!rate) {
      return res.status(400).json({ success: false, message: 'Se requiere un valor de tasa válido' });
    }

    const updated = ExchangeService.setManualRate(rate);

    try {
      await prisma.auditLog.create({
        data: {
          actorId: req.user!.userId,
          action: 'EXCHANGE_RATE_OVERRIDE_MANUAL',
          targetEntity: 'ExchangeRate',
          metadata: { newRate: rate, source: updated.source },
        },
      });
    } catch (logErr) {
      console.warn('Advertencia al registrar auditoría de tasa manual:', logErr);
    }

    return res.json({ success: true, message: 'Tasa actualizada manualmente y fijada', ...updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('Error al actualizar tasa de cambio:', error);
    return res.status(500).json({ success: false, message: 'Error al procesar la tasa de cambio' });
  }
});

// 3. Restaurar tasa a sincronización automática (Solo Super Admin)
router.delete('/rate', authenticateJWT, requireRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    ExchangeService.resetToAutomatic();
    const officialRate = await ExchangeService.getOfficialRate();

    try {
      await prisma.auditLog.create({
        data: {
          actorId: req.user!.userId,
          action: 'EXCHANGE_RATE_RESET_AUTOMATIC',
          targetEntity: 'ExchangeRate',
          metadata: { restoredRate: officialRate.rate },
        },
      });
    } catch (logErr) {
      console.warn('Advertencia al registrar auditoría de tasa:', logErr);
    }

    return res.json({
      success: true,
      message: 'Sincronización automática de tasa BCV reactivada',
      ...officialRate,
    });
  } catch (error: any) {
    console.error('Error al restaurar tasa automática:', error);
    return res.status(500).json({ success: false, message: 'Error al restaurar tasa automática' });
  }
});

export default router;
