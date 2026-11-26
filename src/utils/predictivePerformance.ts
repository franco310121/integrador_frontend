import type { DesempenoModeloResponse } from '../types/finanzas';

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function formatMetric(value: number | null | undefined, prefix = '', suffix = ''): string {
  const valid = finite(value);
  return valid === null ? 'N/D' : prefix + valid.toLocaleString('es-PE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }) + suffix;
}

export function observedPerformance(data: DesempenoModeloResponse) {
  const current = data.versionAlgoritmo === 'MEDIA-MOVIL-30D-v1'
    && ['SIN_DATOS', 'EVALUADO'].includes(data.estadoSaludModelo);
  const periods = current ? finite(data.totalProyeccionesEvaluadas) : null;
  const closed = periods !== null && periods > 0;
  const mape = closed ? finite(data.errorPorcentualMedio) : null;
  return {
    algorithm: data.versionAlgoritmo === 'MEDIA-MOVIL-30D-v1' ? 'Media móvil de 30 días' : 'Versión anterior',
    periods,
    mae: closed ? finite(data.mae) : null,
    rmse: closed ? finite(data.rmse) : null,
    mape,
    mapeCount: current ? finite(data.observacionesMape) : null,
    label: !current ? 'Evaluación no disponible' : mape === null ? 'Sin MAPE disponible' : 'Evaluado',
    message: !current ? 'La API aún no proporciona una evaluación por periodos cerrados.'
      : data.mensajeValidacion || 'Los indicadores corresponden a periodos de proyección finalizados.',
  };
}
