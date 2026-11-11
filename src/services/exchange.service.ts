export interface ExchangeRateData {
  rate: number;
  source: string;
  updatedAt: string;
  cachedAt: string;
  isManual?: boolean;
}

let cachedRate: ExchangeRateData | null = null;
let lastFetchTime = 0;
let isManualOverride = false;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos de caché

export class ExchangeService {
  /**
   * Obtiene la tasa oficial del BCV en tiempo real con caché y fallback.
   * Si el Super Admin ha establecido una tasa manual, esta se preserva
   * y NO es sobreescrita automáticamente por la API externa.
   */
  static async getOfficialRate(): Promise<ExchangeRateData> {
    // Si la tasa fue fijada manualmente por el Super Admin, se respeta indefinidamente
    if (isManualOverride && cachedRate) {
      return cachedRate;
    }

    const now = Date.now();

    if (cachedRate && now - lastFetchTime < CACHE_TTL_MS) {
      return cachedRate;
    }

    try {
      const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data: any = await response.json();
        const rateValue = Number(data?.promedio || data?.precio || 0);

        if (rateValue > 0) {
          cachedRate = {
            rate: rateValue,
            source: 'Banco Central de Venezuela (BCV Oficial)',
            updatedAt: data.fechaActualizacion || new Date().toISOString(),
            cachedAt: new Date().toISOString(),
            isManual: false,
          };
          lastFetchTime = now;
          return cachedRate;
        }
      }
    } catch (err: any) {
      console.warn('Fallo consulta a DolarAPI, intentando fuente de respaldo...', err.message);
    }

    // Si la caché previa existe, retornarla aunque haya vencido el TTL
    if (cachedRate) {
      return cachedRate;
    }

    // Fallback por defecto si no hay conexión
    return {
      rate: 850.00,
      source: 'BCV Oficial (Estimado)',
      updatedAt: new Date().toISOString(),
      cachedAt: new Date().toISOString(),
      isManual: false,
    };
  }

  /**
   * Establece una tasa manual administrativa fijada por el Super Admin.
   * Marca el flag de anulación manual para prevenir sobreescrituras automáticas.
   */
  static setManualRate(rate: number): ExchangeRateData {
    if (!rate || isNaN(rate) || rate <= 0) {
      throw new Error('La tasa manual debe ser un número positivo válido');
    }
    isManualOverride = true;
    cachedRate = {
      rate,
      source: 'Ajuste Manual SysAdmin',
      updatedAt: new Date().toISOString(),
      cachedAt: new Date().toISOString(),
      isManual: true,
    };
    lastFetchTime = Date.now();
    return cachedRate;
  }

  /**
   * Permite al Super Admin restaurar la sincronización automática con la API oficial.
   */
  static resetToAutomatic(): void {
    isManualOverride = false;
    cachedRate = null;
    lastFetchTime = 0;
  }

  static isManualRateActive(): boolean {
    return isManualOverride;
  }
}
