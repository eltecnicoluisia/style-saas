import { Router, Request, Response } from 'express';
import { ExchangeService } from '../services/exchange.service.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.middleware.js';
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
    return res.status(500).json({ success: false, message: 'Error al consultar tasa de cambio', error: error.message });
  }
});

// 2. Sobrescribir tasa manualmente si el Super Admin lo requiere
router.post('/rate', authenticateJWT, requireRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rate } = z.object({ rate: z.number().positive() }).parse(req.body);
    const updated = ExchangeService.setManualRate(rate);
    return res.json({ success: true, message: 'Tasa actualizada manualmente', ...updated });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: 'Valor de tasa inválido' });
  }
});

export default router;
