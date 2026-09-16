#!/bin/sh
set -e

echo "🔄 Sincronizando esquema de base de datos con PostgreSQL..."
npx prisma db push --skip-generate --accept-data-loss

echo "🌱 Ejecutando Seeder de inicialización (Super Administrador Luis Uzcategui)..."
node dist/prisma/seed.js || npx tsx src/prisma/seed.ts

echo "🚀 Iniciando servidor SaaS Emporio Tecnológico..."
exec node dist/server.js
