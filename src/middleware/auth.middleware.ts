import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role, UserStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-emporio-saas-2026';

export interface AuthPayload {
  userId: string;
  nationalId: string;
  email: string;
  role: Role;
  status: UserStatus;
  firstName: string;
  lastName: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Acceso no autorizado: Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Token inválido o expirado' });
  }
};

export const requireRoles = (...allowedRoles: Role[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Acceso denegado: Permisos insuficientes' });
    }

    // Si es Super Admin, tiene acceso total sin restricción de licencia
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Para Trabajadores: Verificar estado y vigencia de Licencia en base de datos
    if (req.user.role === 'WORKER') {
      const userRecord = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            orderBy: { endDate: 'desc' },
            take: 1,
          }
        }
      });

      if (!userRecord) {
        return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
      }

      if (userRecord.status === 'PENDING_APPROVAL') {
        return res.status(403).json({
          success: false,
          code: 'PENDING_APPROVAL',
          message: 'Tu cuenta está en espera de activación por el Administrador de Sistemas.'
        });
      }

      if (userRecord.status === 'SUSPENDED' || userRecord.status === 'INACTIVE') {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_SUSPENDED',
          message: 'Tu cuenta se encuentra suspendida. Contacta al Administrador.'
        });
      }

      // Verificación de Licencia Activa y No Vencida
      const activeSubscription = userRecord.subscriptions[0];
      const now = new Date();

      if (!activeSubscription || new Date(activeSubscription.endDate) < now) {
        const expiredDateStr = activeSubscription ? new Date(activeSubscription.endDate).toLocaleDateString() : 'Sin licencia previa';
        return res.status(403).json({
          success: false,
          code: 'LICENSE_EXPIRED',
          message: `Tu licencia de uso no está activa o expiró (${expiredDateStr}). Contacta a tu Administrador para renovarla.`,
          expiredAt: activeSubscription ? activeSubscription.endDate : null,
        });
      }
    }

    next();
  };
};
