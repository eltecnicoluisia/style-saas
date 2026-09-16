import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando inicialización de datos semilla (Seeder Multi-Tenant)...');

  // 1. Super Administrador Maestro Requerido (Solo Administrador de Sistemas / Desarrollador)
  const masterPasswordHash = await bcrypt.hash('qwerty1234', 10);
  
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

  // 2. Planes de Suscripción para el Super Admin
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
