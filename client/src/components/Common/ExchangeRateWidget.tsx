import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { DollarSign, RefreshCw, TrendingUp } from 'lucide-react';

interface ExchangeRateWidgetProps {
  onRateLoaded?: (rate: number) => void;
}

export const ExchangeRateWidget: React.FC<ExchangeRateWidgetProps> = ({ onRateLoaded }) => {
  const [rate, setRate] = useState<number>(846.50);
  const [source, setSource] = useState<string>('BCV Oficial');
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchRate = async () => {
    setLoading(true);
    try {
      const data = await api.getExchangeRate();
      if (data.rate) {
        setRate(Number(data.rate));
        setSource(data.source || 'BCV Oficial');
        setUpdatedAt(data.updatedAt || new Date().toISOString());
        if (onRateLoaded) onRateLoaded(Number(data.rate));
      }
    } catch (err) {
      console.warn('Error al cargar tasa:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
    // Actualizar periódicamente cada 5 minutos
    const interval = setInterval(fetchRate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-900 border border-amber-500/30 rounded-xl text-xs shadow-inner">
      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-slate-400 font-medium">Tasa BCV:</span>
      <span className="font-mono font-bold text-amber-400">
        Bs. {rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / $
      </span>

      <button
        onClick={fetchRate}
        disabled={loading}
        title="Actualizar tasa oficial en vivo"
        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded transition"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
      </button>
    </div>
  );
};
