import { Router, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { z } from 'zod';

const router = Router();

// Aplicar seguridad para Trabajadores Autónomos y Super Admin
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
    console.error('Error al obtener dashboard:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener dashboard' });
  }
});

// Helper de validación de identificador UUID para prevenir inyecciones o errores sintácticos de PostgreSQL
const isValidUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

// -------------------------------------------------------------
// 2. CLIENTAS (CARTERA PRIVADA DEL TRABAJADOR)
// -------------------------------------------------------------
const clientaSchema = z.object({
  nombre: z.string().min(2, 'El nombre completo es requerido').max(100),
  telefono: z.string().max(30).optional().or(z.literal('')),
  direccion: z.string().max(255).optional().or(z.literal('')),
  email: z.string().email('Correo electrónico inválido').max(100).optional().or(z.literal('')),
  notas: z.string().max(1000).optional().or(z.literal('')),
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
    console.error('Error al obtener clientas:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener clientas' });
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
    console.error('Error al guardar clienta:', error);
    return res.status(500).json({ success: false, message: 'Error al guardar clienta' });
  }
});

router.put('/clients/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Identificador de clienta inválido (formato UUID requerido)' });
    }
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
    console.error('Error al actualizar clienta:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar clienta' });
  }
});

router.delete('/clients/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Identificador de clienta inválido (formato UUID requerido)' });
    }

    const existing = await prisma.clienta.findFirst({ where: { id, workerId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Clienta no encontrada' });
    }

    await prisma.clienta.delete({ where: { id } });
    return res.json({ success: true, message: 'Clienta eliminada con éxito' });
  } catch (error: any) {
    console.error('Error al eliminar clienta:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar clienta' });
  }
});

// -------------------------------------------------------------
// 3. SERVICIOS (CATÁLOGO PERSONAL DEL TRABAJADOR)
// -------------------------------------------------------------
const servicioSchema = z.object({
  nombre: z.string().min(2, 'Nombre del servicio requerido').max(100),
  precio: z.number().positive('El precio debe ser mayor a 0').max(99999999.99, 'El precio excede el límite permitido'),
  duracion: z.number().int().positive().max(1440, 'Duración máxima 24 horas').optional().default(45),
  color: z.string().max(30).optional().default('#d97706'),
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
    console.error('Error al obtener servicios:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener servicios' });
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
    console.error('Error al crear servicio:', error);
    return res.status(500).json({ success: false, message: 'Error al crear servicio' });
  }
});

router.put('/services/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Identificador de servicio inválido (formato UUID requerido)' });
    }
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
    console.error('Error al actualizar servicio:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar servicio' });
  }
});

router.delete('/services/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Identificador de servicio inválido (formato UUID requerido)' });
    }

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
    console.error('Error al eliminar servicio:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar servicio' });
  }
});

// -------------------------------------------------------------
// 4. CITAS Y AGENDA (CALENDARIO PRIVADO DEL TRABAJADOR - PROTECCIÓN ANTI-IDOR)
// -------------------------------------------------------------
const citaSchema = z.object({
  clientaId: z.string().uuid('ID de clienta inválido (formato UUID requerido)'),
  servicioId: z.string().uuid('ID de servicio inválido (formato UUID requerido)'),
  fechaHora: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Formato de fecha y hora inválido (debe ser una fecha válida)',
  }),
  duracionMinutos: z.number().int().positive().max(1440, 'Duración no puede exceder 24 horas').optional(),
  precioCobrado: z.number().min(0, 'El precio no puede ser negativo').max(99999999.99, 'El precio excede el límite permitido'),
  notas: z.string().max(2000, 'Notas no pueden exceder 2000 caracteres').optional().nullable(),
});

router.get('/appointments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const { status, date } = req.query;

    const where: any = { workerId };
    if (status) {
      if (!['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(String(status))) {
        return res.status(400).json({ success: false, message: 'Estado de cita inválido' });
      }
      where.estado = status;
    }
    if (date) {
      const parsedTime = Date.parse(String(date));
      if (isNaN(parsedTime)) {
        return res.status(400).json({ success: false, message: 'Formato de fecha inválido en el parámetro date' });
      }
      const dStart = new Date(parsedTime);
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
    console.error('Error al obtener citas:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener citas' });
  }
});

router.post('/appointments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const data = citaSchema.parse(req.body);

    // Validación estricta anti-IDOR: Tanto la clienta como el servicio deben pertenecer al trabajador
    const [clienta, servicio] = await Promise.all([
      prisma.clienta.findFirst({ where: { id: data.clientaId, workerId } }),
      prisma.servicio.findFirst({ where: { id: data.servicioId, workerId } })
    ]);

    if (!clienta) {
      return res.status(404).json({
        success: false,
        message: 'Clienta no encontrada o no pertenece a la cartera del trabajador autenticado',
      });
    }

    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado o no pertenece al catálogo del trabajador autenticado',
      });
    }

    const cita = await prisma.cita.create({
      data: {
        workerId,
        clientaId: data.clientaId,
        servicioId: data.servicioId,
        fechaHora: new Date(data.fechaHora),
        duracionMinutos: data.duracionMinutos || servicio.duracion || 45,
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
    console.error('Error al agendar cita:', error);
    return res.status(500).json({ success: false, message: 'Error al agendar cita' });
  }
});

// Modificar Cita Completa (Anti-IDOR)
router.put('/appointments/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Identificador de cita inválido (formato UUID requerido)' });
    }
    const data = citaSchema.parse(req.body);

    const cita = await prisma.cita.findFirst({
      where: { id, workerId }
    });

    if (!cita) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada' });
    }

    // Validar clienta y servicio pertenecen al trabajador
    const [clienta, servicio] = await Promise.all([
      prisma.clienta.findFirst({ where: { id: data.clientaId, workerId } }),
      prisma.servicio.findFirst({ where: { id: data.servicioId, workerId } })
    ]);

    if (!clienta) {
      return res.status(404).json({
        success: false,
        message: 'Clienta no encontrada o no pertenece a su cartera',
      });
    }

    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado o no pertenece a su catálogo',
      });
    }

    const updated = await prisma.cita.update({
      where: { id },
      data: {
        clientaId: data.clientaId,
        servicioId: data.servicioId,
        fechaHora: new Date(data.fechaHora),
        duracionMinutos: data.duracionMinutos || cita.duracionMinutos,
        precioCobrado: data.precioCobrado,
        notas: data.notas || null,
      },
      include: { clienta: true, servicio: true }
    });

    return res.json({ success: true, appointment: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('Error al actualizar cita:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar cita' });
  }
});

// Modificar Estado de Cita (COMPLETED, CANCELLED, etc. - Anti-IDOR)
router.patch('/appointments/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Identificador de cita inválido (formato UUID requerido)' });
    }
    const { estado } = z.object({ estado: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']) }).parse(req.body);

    const cita = await prisma.cita.findFirst({
      where: { id, workerId }
    });

    if (!cita) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada o no pertenece al trabajador autenticado' });
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
    console.error('Error al actualizar estado de cita:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar cita' });
  }
});

// Cancelar / Eliminar Cita (Anti-IDOR)
router.delete('/appointments/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workerId = req.user!.userId;
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Identificador de cita inválido (formato UUID requerido)' });
    }

    const cita = await prisma.cita.findFirst({
      where: { id, workerId }
    });

    if (!cita) {
      return res.status(404).json({ success: false, message: 'Cita no encontrada o no pertenece al trabajador autenticado' });
    }

    await prisma.cita.delete({
      where: { id }
    });

    return res.json({ success: true, message: 'Cita eliminada con éxito' });
  } catch (error: any) {
    console.error('Error al eliminar cita:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar cita' });
  }
});

export default router;
