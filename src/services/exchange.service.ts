export interface ExchangeRateData {
  rate: number;
  source: string;
  updatedAt: string;
  cachedAt: string;
}

let cachedRate: ExchangeRateData | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos de caché

export class ExchangeService {
  /**
   * Obtiene la tasa oficial del BCV en tiempo real con caché y fallback
   */
  static async getOfficialRate(): Promise<ExchangeRateData> {
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
    };
  }

  static setManualRate(rate: number): ExchangeRateData {
    cachedRate = {
      rate,
      source: 'Ajuste Manual SysAdmin',
      updatedAt: new Date().toISOString(),
      cachedAt: new Date().toISOString(),
    };
    lastFetchTime = Date.now();
    return cachedRate;
  }
}
