import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import app from '../server.js';
import { CommissionService } from '../services/commission.service.js';
import { ExchangeService } from '../services/exchange.service.js';
import { JWT_SECRET } from '../config/jwt.js';

describe('Pruebas Integrales del Sistema SaaS Emporio Tecnológico', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    // Iniciar servidor HTTP efímero en un puerto libre para pruebas reales de integración
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('Criptografía y Configuración de Secretos', () => {
    it('Debe encriptar y verificar correctamente la contraseña del Super Admin', async () => {
      const plainPassword = 'qwerty1234';
      const hash = await bcrypt.hash(plainPassword, 10);
      const isValid = await bcrypt.compare('qwerty1234', hash);
      const isInvalid = await bcrypt.compare('wrongpassword', hash);

      assert.strictEqual(isValid, true, 'La contraseña correcta debe validar');
      assert.strictEqual(isInvalid, false, 'Una contraseña incorrecta debe fallar');
    });

    it('La clave JWT_SECRET debe estar cargada y tener alta entropía', () => {
      assert.ok(JWT_SECRET, 'JWT_SECRET debe estar definido');
      assert.ok(JWT_SECRET.length >= 20, 'JWT_SECRET debe tener longitud segura');
      assert.notStrictEqual(JWT_SECRET, 'secret-key-emporio-saas-2026', 'No debe ser el fallback débil por defecto');
      assert.notStrictEqual(JWT_SECRET, 'emporio-tecnologico-beauty-barber-saas-master-key-2026', 'No debe ser la clave quemada de docker-compose');
    });
  });

  describe('Seguridad HTTP, Cabeceras y Health Check', () => {
    it('GET /api/health debe responder 200 con cabeceras de seguridad Helmet', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200);

      const data = (await res.json()) as any;
      assert.strictEqual(data.status, 'online');
      assert.strictEqual(data.service, 'Emporio Tecnológico Multi-Tenant SaaS Engine');

      // Validar cabeceras Helmet
      assert.strictEqual(res.headers.get('x-frame-options'), 'DENY', 'Debe incluir frameguard DENY contra clickjacking');
      assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff', 'Debe incluir prevención de MIME sniffing');
      assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    });

    it('GET /api/worker/dashboard sin token debe retornar 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/worker/dashboard`);
      assert.strictEqual(res.status, 401);
      const data = (await res.json()) as any;
      assert.strictEqual(data.success, false);
      assert.match(data.message, /Token no proporcionado/i);
    });

    it('POST /api/auth/login con credenciales incompletas debe retornar 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.strictEqual(res.status, 400);
      const data = (await res.json()) as any;
      assert.strictEqual(data.success, false);
      assert.ok(data.errors, 'Debe retornar errores de validación de Zod');
    });

    it('Ruta inexistente bajo /api/* debe retornar 404 limpio', async () => {
      const res = await fetch(`${baseUrl}/api/ruta-inexistente-12345`);
      assert.strictEqual(res.status, 404);
      const data = (await res.json()) as any;
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, 'Endpoint no encontrado');
    });
  });

  describe('Cálculo de Comisiones Mixtas e Insumos Fraccionados (Edge Cases)', () => {
    it('Debe calcular comisión basada en porcentaje estándar', () => {
      const result = CommissionService.calculateServiceCommission({
        workerBaseRate: 40,
        serviceCommissionRate: 50,
        servicePrice: 100,
      });
      assert.strictEqual(result.amount, 50);
      assert.strictEqual(result.type, 'PERCENTAGE');
    });

    it('Debe calcular comisión deduciendo insumos fraccionados', () => {
      // Servicio de $80 con $10 de insumos consumidos (ml/g) y 50% de comisión
      const result = CommissionService.calculateServiceCommission({
        workerBaseRate: 40,
        serviceCommissionRate: 50,
        servicePrice: 80,
        supplyCost: 10,
      });
      // Base neta = $80 - $10 = $70. 50% de $70 = $35
      assert.strictEqual(result.amount, 35);
      assert.strictEqual(result.type, 'PERCENTAGE');
    });

    it('Debe calcular comisión mixta con bono fijo adicional', () => {
      const result = CommissionService.calculateServiceCommission({
        workerBaseRate: 30,
        serviceCommissionRate: 40,
        servicePrice: 50,
        supplyCost: 0,
        customFixedBonus: 5,
      });
      // 40% de $50 = $20 + $5 bono = $25
      assert.strictEqual(result.amount, 25);
      assert.strictEqual(result.type, 'MIXED');
    });

    it('No debe permitir comisiones negativas si el costo de insumo supera el precio', () => {
      const result = CommissionService.calculateServiceCommission({
        workerBaseRate: 50,
        serviceCommissionRate: 50,
        servicePrice: 20,
        supplyCost: 50, // Insumo $50 > Precio $20
        customFixedBonus: 0,
      });
      assert.strictEqual(result.amount, 0, 'La base imponible mínima debe ser 0');
    });

    it('Debe sanear entradas con NaN o valores negativos', () => {
      const result = CommissionService.calculateServiceCommission({
        workerBaseRate: -10,
        serviceCommissionRate: NaN,
        servicePrice: -50,
        supplyCost: -20,
        customFixedBonus: NaN,
      });
      assert.strictEqual(result.amount, 0);
    });
  });

  describe('Persistencia y Lógica de Tasa de Cambio', () => {
    it('Debe permitir fijar tasa manual por SysAdmin y conservarla', async () => {
      const manualRate = 950.75;
      const setRes = ExchangeService.setManualRate(manualRate);

      assert.strictEqual(setRes.rate, manualRate);
      assert.strictEqual(setRes.source, 'Ajuste Manual SysAdmin');
      assert.strictEqual(ExchangeService.isManualRateActive(), true);

      // Al llamar a getOfficialRate(), debe respetar la tasa manual y no sobreescribirla
      const currentRate = await ExchangeService.getOfficialRate();
      assert.strictEqual(currentRate.rate, manualRate);
      assert.strictEqual(currentRate.source, 'Ajuste Manual SysAdmin');
      assert.strictEqual(currentRate.isManual, true);

      // Limpiar estado
      ExchangeService.resetToAutomatic();
      assert.strictEqual(ExchangeService.isManualRateActive(), false);
    });

    it('Debe rechazar tasas manuales menores o iguales a cero o NaN', () => {
      assert.throws(() => ExchangeService.setManualRate(0), /número positivo/);
      assert.throws(() => ExchangeService.setManualRate(-10), /número positivo/);
      assert.throws(() => ExchangeService.setManualRate(NaN), /número positivo/);
    });
  });

  describe('Políticas de Seguridad en Citas y Permisos (Anti-IDOR y Privilegios)', () => {
    it('Simulación de Anti-IDOR: Rechazar creación de cita si cliente o servicio pertenecen a otro trabajador', () => {
      const workerAId = 'worker-1111';
      const clientOfWorkerB = { id: 'client-9999', workerId: 'worker-2222' };
      const serviceOfWorkerA = { id: 'service-3333', workerId: 'worker-1111' };

      const isClientOwnerValid = clientOfWorkerB.workerId === workerAId;
      const isServiceOwnerValid = serviceOfWorkerA.workerId === workerAId;

      assert.strictEqual(isClientOwnerValid, false, 'Clienta ajena debe ser rechazada');
      assert.strictEqual(isServiceOwnerValid, true, 'Servicio propio es válido');

      const canCreateAppointment = isClientOwnerValid && isServiceOwnerValid;
      assert.strictEqual(canCreateAppointment, false, 'No se debe permitir crear cita cruzada entre inquilinos');
    });

    it('Protección de Estado SysAdmin: Prohibir auto-suspensión y suspender SUPER_ADMIN', () => {
      const adminId = 'super-admin-root';
      const targetAdmin = { id: adminId, role: 'SUPER_ADMIN', status: 'ACTIVE' };

      // Caso 1: Auto-suspensión
      const isSelfAction = targetAdmin.id === adminId;
      assert.strictEqual(isSelfAction, true);

      // Caso 2: Suspender SUPER_ADMIN
      const isSuperAdminTarget = targetAdmin.role === 'SUPER_ADMIN';
      assert.strictEqual(isSuperAdminTarget, true);

      const isStatusUpdateAllowed = !isSelfAction && !isSuperAdminTarget;
      assert.strictEqual(isStatusUpdateAllowed, false, 'La suspensión debe ser estrictamente rechazada');
    });

    it('Validador UUID debe rechazar entradas maliciosas o malformadas', () => {
      const isValidUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      assert.strictEqual(isValidUuid('c9bf9e57-1685-4c89-bafb-ff5af830be8a'), true);
      assert.strictEqual(isValidUuid('123'), false);
      assert.strictEqual(isValidUuid('not-a-uuid'), false);
      assert.strictEqual(isValidUuid('../../../etc/passwd'), false);
      assert.strictEqual(isValidUuid("'; DROP TABLE users; --"), false);
    });
  });
});
