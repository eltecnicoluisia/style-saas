FROM node:20-alpine

WORKDIR /app

# Instalar dependencias requeridas por Prisma en Alpine
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=4000

# Copiar manifiestos y dependencias de producción
COPY package*.json ./
RUN npm install --omit=dev

# Copiar esquema de Prisma y generar cliente
COPY prisma ./prisma/
RUN npx prisma generate

# Copiar backend y frontend ya compilados
COPY dist ./dist

# Copiar script de arranque
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["/bin/sh", "docker-entrypoint.sh"]
