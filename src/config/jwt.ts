import dotenv from 'dotenv';
dotenv.config();
import crypto from 'crypto';

const INSECURE_FALLBACK_KEYS = [
  'secret-key-emporio-saas-2026',
  'emporio-tecnologico-beauty-barber-saas-master-key-2026',
  'secret',
  'jwt_secret',
  '123456',
];

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: Variable de entorno JWT_SECRET no configurada en entorno de producción.');
    }
    console.warn('⚠️ ADVERTENCIA: JWT_SECRET no configurada. Generando clave criptográfica efímera segura para desarrollo/testing.');
    return crypto.randomBytes(32).toString('hex');
  }

  if (INSECURE_FALLBACK_KEYS.includes(secret) || secret.length < 16) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET utiliza una clave predeterminada débil o demasiado corta en producción.');
    }
    console.warn('⚠️ ADVERTENCIA: Usando clave JWT de desarrollo no recomendada para producción.');
  }

  return secret;
}

export const JWT_SECRET = resolveJwtSecret();
