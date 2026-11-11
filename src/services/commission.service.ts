export interface CommissionParams {
  workerBaseRate: number;
  serviceCommissionRate: number;
  servicePrice: number;
  supplyCost?: number;
  customFixedBonus?: number;
}

export interface CommissionResult {
  amount: number;
  type: 'PERCENTAGE' | 'MIXED' | 'FIXED';
  details: string;
}

export class CommissionService {
  /**
   * Calcula la comisión para un servicio realizado por un trabajador.
   * Soporta comisiones mixtas (Porcentaje sobre servicio neto + Bonos fijos o descuentos de insumos).
   */
  static calculateServiceCommission(params: CommissionParams): CommissionResult {
    const { workerBaseRate, serviceCommissionRate, servicePrice, supplyCost = 0, customFixedBonus = 0 } = params;

    const cleanPrice = Math.max(0, isNaN(servicePrice) ? 0 : Number(servicePrice));
    const cleanSupplyCost = Math.max(0, isNaN(supplyCost) ? 0 : Number(supplyCost));
    const cleanBonus = Math.max(0, isNaN(customFixedBonus) ? 0 : Number(customFixedBonus));

    // Se prioriza la tasa específica del servicio si es > 0, de lo contrario la base del trabajador
    const rawEffective = serviceCommissionRate > 0 ? serviceCommissionRate : workerBaseRate;
    const effectivePercentage = Math.max(0, Math.min(100, isNaN(rawEffective) ? 0 : Number(rawEffective)));

    // Base imponible: Precio de servicio menos costo directo de insumos aplicados
    const netBasePrice = Math.max(0, cleanPrice - cleanSupplyCost);
    const percentageAmount = (netBasePrice * effectivePercentage) / 100;
    const finalAmount = Number((percentageAmount + cleanBonus).toFixed(2));

    let type: 'PERCENTAGE' | 'MIXED' | 'FIXED' = 'PERCENTAGE';
    if (cleanBonus > 0 && effectivePercentage > 0) {
      type = 'MIXED';
    } else if (cleanBonus > 0 && effectivePercentage === 0) {
      type = 'FIXED';
    }

    const details = `Comisión calculada: ${effectivePercentage}% sobre base neta $${netBasePrice.toFixed(2)} ($${cleanPrice.toFixed(2)} - insumos $${cleanSupplyCost.toFixed(2)}) + Bono $${cleanBonus.toFixed(2)} = $${finalAmount.toFixed(2)}`;

    return {
      amount: finalAmount,
      type,
      details,
    };
  }
}
