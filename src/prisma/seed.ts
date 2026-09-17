import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando inicialización de datos semilla (Seeder Multi-Tenant)...');

  // 1. Super Administrador Maestro Requerido (Solo Administrador de Sistemas / Desarrollador)
  const masterPasswordHash = await bcrypt.hash('admin123', 10);
  
  const superAdmin = await prisma.user.upsert({
    where: { nationalId: '12832779' },
    update: {
      password: masterPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
    create: {
      firstName: 'Luis',
      lastName: 'Uzcategui',
      email: 'luis.uzcategui@emporiosaas.com',
      nationalId: '12832779',
      phone: '+584120000000',
      address: 'Centro Empresarial Emporio, Piso 5',
      password: masterPasswordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Super Administrador Maestro: ${superAdmin.firstName} ${superAdmin.lastName} (Cédula: ${superAdmin.nationalId})`);

  // 2. Trabajadora Autónoma (Maresa - Estilista)
  const workerPasswordHash = await bcrypt.hash('maresa123', 10);
  const worker = await prisma.user.upsert({
    where: { nationalId: '24620872' },
    update: {
      password: workerPasswordHash,
      role: 'WORKER',
      status: 'ACTIVE',
    },
    create: {
      firstName: 'Maresa',
      lastName: 'Estilista',
      email: 'maresa@style.com',
      nationalId: '24620872',
      phone: '+584141234567',
      address: 'Salón de Belleza y Estética',
      password: workerPasswordHash,
      role: 'WORKER',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Trabajadora Activa: ${worker.firstName} (Cédula: ${worker.nationalId})`);

  // 3. Planes de Suscripción para el Super Admin
  await prisma.subscriptionPlan.upsert({
    where: { id: 'plan-basic-2026' },
    update: {},
    create: {
      id: 'plan-basic-2026',
      name: 'Plan Profesional Autónomo',
      description: 'Gestión ilimitada de clientas, catálogo personal, citas y recordatorios',
      price: 19.99,
      billingCycle: 'MONTHLY',
      maxWorkers: 1,
    }
  });

  console.log('✨ Base de datos multi-tenant inicializada con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
