import { Router, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { z } from 'zod';

const router = Router();

// Aplicar seguridad para Trabajadores Autónomos
router.use(authenticateJWT);
router.use(requireRoles('WORKER', 'SUPER_ADMIN'));

// -------------------------------------------------------------
// 1. DASHBOARD & MÉTRICAS DEL TRABAJADOR
// -------------------------------------------------------------
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [totalClientas, totalServicios, todayAppointments, completedCitas] = await Promise.all([
      prisma.clienta.count({ where: { workerId } }),
      prisma.servicio.count({ where: { workerId, activo: true } }),
      prisma.cita.findMany({
        where: {
          workerId,
          fechaHora: { gte: todayStart, lt: todayEnd }
        },
        include: { clienta: true, servicio: true },
        orderBy: { fechaHora: 'asc' }
      }),
      prisma.cita.findMany({
        where: { workerId, estado: 'COMPLETED' },
        select: { precioCobrado: true }
      })
    ]);

    const totalIngresos = completedCitas.reduce((sum, c) => sum + Number(c.precioCobrado), 0);

    return res.json({
      success: true,
      summary: {
        totalClientas,
        totalServicios,
        todayAppointmentsCount: todayAppointments.length,
        totalIngresos,
      },
      todayAppointments,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error al obtener dashboard', error: error.message });
  }
});

// -------------------------------------------------------------
// 2. CLIENTAS (CARTERA PRIVADA DEL TRABAJADOR)
// Campos Requeridos por Regla de Negocio: Nombre Completo, Teléfono, Dirección Corta
// -------------------------------------------------------------
const clientaSchema = z.object({
  nombre: z.string().min(2, 'El nombre completo es requerido'),
  telefono: z.string().optional().or(z.literal('')),
  direccion: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
  notas: z.string().optional().or(z.literal('')),
});

router.get('/clients', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const clientas = await prisma.clienta.findMany({
      where: { workerId },
      include: {
        _count: { select: { citas: true } },
        citas: {
          take: 1,
          orderBy: { fechaHora: 'desc' },
          include: { servicio: true }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    return res.json({ success: true, count: clientas.length, clientas });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error al obtener clientas', error: error.message });
  }
});

router.post('/clients', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const data = clientaSchema.parse(req.body);

    const clienta = await prisma.clienta.create({
      data: {
        nombre: data.nombre,
        telefono: data.telefono || null,
        direccion: data.direccion || null,
        email: data.email || null,
        notas: data.notas || null,
        workerId,
      }
    });

    return res.status(201).json({ success: true, clienta });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Error al guardar clienta', error: error.message });
  }
});

router.put('/clients/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const { id } = req.params;
    const data = clientaSchema.parse(req.body);

    const existing = await prisma.clienta.findFirst({ where: { id, workerId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Clienta no encontrada' });
    }

    const updated = await prisma.clienta.update({
      where: { id },
      data: {
        nombre: data.nombre,
        telefono: data.telefono || null,
        direccion: data.direccion || null,
        email: data.email || null,
        notas: data.notas || null,
      }
    });

    return res.json({ success: true, clienta: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Error al actualizar clienta', error: error.message });
  }
});

router.delete('/clients/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.clienta.findFirst({ where: { id, workerId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Clienta no encontrada' });
    }

    await prisma.clienta.delete({ where: { id } });
    return res.json({ success: true, message: 'Clienta eliminada con éxito' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error al eliminar clienta', error: error.message });
  }
});

// -------------------------------------------------------------
// 3. SERVICIOS (CATÁLOGO PERSONAL DEL TRABAJADOR)
// Campos Requeridos por Regla de Negocio: Nombre del Servicio y Precio ($)
// -------------------------------------------------------------
const servicioSchema = z.object({
  nombre: z.string().min(2, 'Nombre del servicio requerido'),
  precio: z.number().positive('El precio debe ser mayor a 0'),
  duracion: z.number().int().positive().optional().default(45),
  color: z.string().optional().default('#d97706'),
  activo: z.boolean().optional().default(true),
});

router.get('/services', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const servicios = await prisma.servicio.findMany({
      where: { workerId },
      orderBy: { nombre: 'asc' }
    });

    return res.json({ success: true, count: servicios.length, servicios });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error al obtener servicios', error: error.message });
  }
});

router.post('/services', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const data = servicioSchema.parse(req.body);

    const servicio = await prisma.servicio.create({
      data: {
        nombre: data.nombre,
        precio: data.precio,
        duracion: data.duracion || 45,
        color: data.color || '#d97706',
        activo: data.activo !== undefined ? data.activo : true,
        workerId,
      }
    });

    return res.status(201).json({ success: true, servicio });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Error al crear servicio', error: error.message });
  }
});

// Editar Servicio
router.put('/services/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const { id } = req.params;
    const data = servicioSchema.parse(req.body);

    const existing = await prisma.servicio.findFirst({
      where: { id, workerId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
    }

    const updated = await prisma.servicio.update({
      where: { id },
      data: {
        nombre: data.nombre,
        precio: data.precio,
        duracion: data.duracion || 45,
        color: data.color || existing.color,
        activo: data.activo !== undefined ? data.activo : true,
      }
    });

    return res.json({ success: true, message: 'Servicio actualizado con éxito', servicio: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Error al actualizar servicio', error: error.message });
  }
});

// Eliminar Servicio
router.delete('/services/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.servicio.findFirst({
      where: { id, workerId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
    }

    await prisma.servicio.delete({
      where: { id }
    });

    return res.json({ success: true, message: 'Servicio eliminado con éxito' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error al eliminar servicio', error: error.message });
  }
});

// -------------------------------------------------------------
// 4. CITAS Y AGENDA (CALENDARIO PRIVADO DEL TRABAJADOR)
// -------------------------------------------------------------
const citaSchema = z.object({
  clientaId: z.string().uuid(),
  servicioId: z.string().uuid(),
  fechaHora: z.string(), // ISO String
  duracionMinutos: z.number().int().positive().optional(),
  precioCobrado: z.number().positive(),
  notas: z.string().optional(),
});

router.get('/appointments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const { status, date } = req.query;

    const where: any = { workerId };
    if (status) where.estado = status;
    if (date) {
      const dStart = new Date(String(date));
      dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(dStart);
      dEnd.setDate(dEnd.getDate() + 1);
      where.fechaHora = { gte: dStart, lt: dEnd };
    }

    const citas = await prisma.cita.findMany({
      where,
      include: {
        clienta: true,
        servicio: true,
      },
      orderBy: { fechaHora: 'asc' }
    });

    return res.json({ success: true, count: citas.length, appointments: citas });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error al obtener citas', error: error.message });
  }
});

router.post('/appointments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const data = citaSchema.parse(req.body);

    const cita = await prisma.cita.create({
      data: {
        workerId,
        clientaId: data.clientaId,
        servicioId: data.servicioId,
        fechaHora: new Date(data.fechaHora),
        duracionMinutos: data.duracionMinutos || 45,
        precioCobrado: data.precioCobrado,
        notas: data.notas || null,
        estado: 'SCHEDULED',
      },
      include: {
        clienta: true,
        servicio: true,
      }
    });

    return res.status(201).json({ success: true, appointment: cita });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Error al agendar cita', error: error.message });
  }
});

// Modificar Estado de Cita (COMPLETED, CANCELLED, etc.)
router.patch('/appointments/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const { id } = req.params;
    const { estado } = z.object({ estado: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) }).parse(req.body);

    const cita = await prisma.cita.findFirst({
      where: { id, workerId }
    });

    if (!cita) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada' });
    }

    const updated = await prisma.cita.update({
      where: { id },
      data: { estado },
      include: { clienta: true, servicio: true }
    });

    return res.json({ success: true, message: `Cita marcada como ${estado}`, appointment: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Error al actualizar cita', error: error.message });
  }
});

export default router;
