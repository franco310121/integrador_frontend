import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMetric, observedPerformance } from '../src/utils/predictivePerformance.ts';
import type { DesempenoModeloResponse } from '../src/types/finanzas.ts';

const base: DesempenoModeloResponse = {
  idModelo: 1, versionAlgoritmo: 'MEDIA-MOVIL-30D-v1', fechaEntrenamiento: '',
  precisionHistorica: null, precisionActualCalculada: null, errorPorcentualMedio: null,
  nivelConfianzaPromedio: null, totalProyeccionesEvaluadas: 0,
  ingresosRealesAcumulados: 0, egresosRealesAcumulados: 0,
  ultimaProyeccionIngreso: null, ultimaProyeccionEgreso: null,
  estadoSaludModelo: 'SIN_DATOS', mensajeValidacion: '', fechaValidacion: '',
};

test('missing observations do not become zero error or accuracy', () => {
  const result = observedPerformance(base);
  assert.equal(result.mape, null);
  assert.equal(result.mae, null);
  assert.equal(result.periods, 0);
  assert.equal(formatMetric(result.mape, '', '%'), 'N/D');
});

test('observed metrics retain actual zero and errors above 100 percent', () => {
  const result = observedPerformance({...base, estadoSaludModelo: 'EVALUADO',
    totalProyeccionesEvaluadas: 1, mae: 0, rmse: 0, errorPorcentualMedio: 150, observacionesMape: 2});
  assert.equal(result.mae, 0);
  assert.equal(result.mape, 150);
  assert.equal(result.mapeCount, 2);
  assert.equal(result.label, 'Evaluado');
});

test('legacy API values are not displayed as validated evidence', () => {
  const result = observedPerformance({...base, estadoSaludModelo: 'OPTIMO',
    versionAlgoritmo: 'ARIMA-v2.1', errorPorcentualMedio: 5.5, totalProyeccionesEvaluadas: 10});
  assert.equal(result.mape, null);
  assert.equal(result.periods, null);
});

test('closed periods with zero actual values can still expose MAE and RMSE', () => {
  const result = observedPerformance({...base, totalProyeccionesEvaluadas: 1,
    mae: 20, rmse: 30, observacionesMape: 0});
  assert.equal(result.mae, 20);
  assert.equal(result.rmse, 30);
  assert.equal(result.mape, null);
});

test('format rejects unavailable and nonfinite values', () => {
  assert.equal(formatMetric(undefined), 'N/D');
  assert.equal(formatMetric(NaN), 'N/D');
  assert.equal(formatMetric(0), (0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}));
});
