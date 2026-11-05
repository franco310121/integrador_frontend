import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Cpu, Database, Download, Gauge, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getDefaultLedger, loadFinancialLedger, saveFinancialLedger } from '../services/financialService';
import {
  evaluarRendimientoSistema,
  getDesempenoModelo,
  validarDesempenoModelo,
} from '../services/flujoCajaIaService';
import type { DesempenoModeloResponse, RendimientoSistemaResponse } from '../types/finanzas';
import { dateKey, addDays } from '../utils/cashFlow';
import { prepareModelData, modelDataCSV } from '../utils/modelData';
import { formatCurrency } from '../utils/formatters';

export default function ModelDataPanel() {
  const { session } = useAuth();
  if (session?.userId === undefined || session?.userId === null || !String(session.userId).trim()) {
    return <div className="alert alert-warning">Vuelve a iniciar sesión para preparar los datos históricos.</div>;
  }
  return <ModelDataForm key={String(session.userId)} userId={String(session.userId)} />;
}

function ModelDataForm({ userId }: { userId: string }) {
  const today = dateKey(new Date());
  const [initial] = useState(() => {
    try {
      let current = loadFinancialLedger(userId);
      if (!current) {
        current = getDefaultLedger();
        saveFinancialLedger(userId, current, null);
      }
      return { ledger: current, error: '' };
    } catch {
      return { ledger: null, error: 'No se pudo leer el historial de ingresos y gastos.' };
    }
  });
  const [ledger, setLedger] = useState(initial.ledger);
  const [message, setMessage] = useState(initial.error);
  const [from, setFrom] = useState(initial.ledger?.openingDate ?? today);
  const [to, setTo] = useState(addDays(today, -1));
  const [minDays, setMinDays] = useState('30');
  const [reviewed, setReviewed] = useState(true);
  const [page, setPage] = useState(1);

  const [desempeno, setDesempeno] = useState<DesempenoModeloResponse | null>(null);
  const [validatingModel, setValidatingModel] = useState(false);
  const [rendimiento, setRendimiento] = useState<RendimientoSistemaResponse | null>(null);
  const [iteraciones, setIteraciones] = useState(20);
  const [testingPerf, setTestingPerf] = useState(false);

  useEffect(() => {
    getDesempenoModelo().then(setDesempeno).catch(() => {});
    evaluarRendimientoSistema(20).then(setRendimiento).catch(() => {});
  }, []);

  const handleValidarModelo = async () => {
    setValidatingModel(true);
    try {
      const res = await validarDesempenoModelo();
      setDesempeno(res);
      setMessage(`Revisión completada: las estimaciones tienen un ${res.precisionActualCalculada}% de acierto.`);
    } catch {
      setMessage('No se pudo comprobar la precisión en este momento.');
    } finally {
      setValidatingModel(false);
    }
  };

  const handleEvaluarRendimiento = async () => {
    setTestingPerf(true);
    try {
      const res = await evaluarRendimientoSistema(iteraciones);
      setRendimiento(res);
    } catch {
      setMessage('No se pudo comprobar la velocidad del sistema en este momento.');
    } finally {
      setTestingPerf(false);
    }
  };

  const analysis = useMemo(() => {
    if (!ledger) return { data: null, error: '' };
    try {
      return { data: prepareModelData(ledger, from, to, today, reviewed, Number(minDays)), error: '' };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'No se pudo preparar el resumen diario.' };
    }
  }, [ledger, from, to, today, reviewed, minDays]);
  const data = analysis.data;
  const pages = Math.max(1, Math.ceil((data?.rows.length ?? 0) / 10));
  const currentPage = Math.min(page, pages);
  const money = (cents: number | null) => (cents === null ? 'Sin verificar' : formatCurrency(cents / 100));

  function refresh() {
    setReviewed(false);
    setPage(1);
    try {
      const current = loadFinancialLedger(userId);
      setLedger(current);
      if (current && from < current.openingDate) setFrom(current.openingDate);
      setMessage(
        current
          ? 'Historial actualizado correctamente.'
          : 'Configura primero tu dinero inicial en Ingresos y gastos.'
      );
    } catch {
      setLedger(null);
      setMessage('No se pudo leer el historial.');
    }
  }

  function download(format: 'csv' | 'json') {
    if (!ledger || !data?.ready) return;
    try {
      if (JSON.stringify(loadFinancialLedger(userId)) !== JSON.stringify(ledger)) {
        refresh();
        setMessage('Tus movimientos cambiaron. Revisa nuevamente antes de descargar.');
        return;
      }
      const metadata = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        source: 'registro_local_de_caja',
        currency: 'PEN',
        frequency: 'daily',
        from,
        to,
        openingDate: ledger.openingDate,
        openingBalance: ledger.openingCents / 100,
        minimumDays: Number(minDays),
        criterion: 'provisional_definido_por_usuario',
        coverageReviewed: true,
        modelConnected: Boolean(desempeno),
        modelAlgorithm: desempeno?.versionAlgoritmo ?? null,
      };
      const content =
        format === 'csv'
          ? modelDataCSV(data.rows)
          : JSON.stringify(
              {
                metadata,
                rows: data.rows.map(row => ({
                  date: row.date,
                  income: row.incomeCents! / 100,
                  expense: row.expenseCents! / 100,
                  net: row.netCents! / 100,
                  closingBalance: row.closingCents! / 100,
                  movementCount: row.movementCount,
                  coverage: row.coverage,
                })),
              },
              null,
              2
            );
      const url = URL.createObjectURL(
        new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' })
      );
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `resumen-diario-${from}-${to}.${format}`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Archivo descargado correctamente.');
    } catch {
      setReviewed(false);
      setMessage('Actualiza los datos antes de descargar.');
    }
  }

  return (
    <details className="card p-3 p-md-4 mb-4">
      <summary className="fw-semibold d-flex flex-wrap justify-content-between align-items-center gap-2" style={{ cursor: 'pointer' }}>
        <span className="d-inline-flex align-items-center gap-2">
          <CheckCircle2 size={18} className="text-success" />
          <span>Opciones avanzadas: descargar historial diario y revisar precisión del sistema (opcional)</span>
        </span>
        {desempeno && (
          <span className="badge bg-success-subtle text-success">
            Nivel de acierto actual: {desempeno.precisionActualCalculada}%
          </span>
        )}
      </summary>

      <div className="mt-4 pt-3 border-top">
        <section className="mb-4" aria-labelledby="model-data-title">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h2 id="model-data-title" className="h6 fw-bold mb-0">
              <Database size={18} aria-hidden="true" /> Resumen diario de tus ingresos y gastos para descargar
            </h2>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={refresh}>
              <RefreshCw size={15} aria-hidden="true" /> Actualizar historial
            </button>
          </div>
          {message && (
            <div className="alert alert-info small" role="status">
              {message}
            </div>
          )}
          {!ledger ? (
            <div className="alert alert-warning mb-0">
              Registra primero tus datos en <Link to="/movimientos-financieros">Ingresos y gastos</Link> o en{' '}
              <Link to="/importacion-financiera">Cargar desde Excel</Link>.
            </div>
          ) : (
            <>
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label htmlFor="model-from" className="form-label small">
                    Desde la fecha
                  </label>
                  <input
                    id="model-from"
                    type="date"
                    className="form-control"
                    min={ledger.openingDate}
                    max={today}
                    value={from}
                    onChange={e => {
                      setFrom(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="model-to" className="form-label small">
                    Hasta la fecha
                  </label>
                  <input
                    id="model-to"
                    type="date"
                    className="form-control"
                    min={from}
                    max={today}
                    value={to}
                    onChange={e => {
                      setTo(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="col-md-4">
                  <label htmlFor="model-minimum" className="form-label small">
                    Días mínimos de historial
                  </label>
                  <input
                    id="model-minimum"
                    type="number"
                    min="1"
                    max="3660"
                    step="1"
                    className="form-control"
                    value={minDays}
                    onChange={e => setMinDays(e.target.value)}
                  />
                </div>
              </div>
              {analysis.error && (
                <div className="alert alert-warning" role="alert">
                  {analysis.error}
                </div>
              )}
              {data && (
                <>
                  <div className="row g-3 mb-3">
                    {[
                      ['Días revisados', data.rows.length],
                      ['Días con movimientos', data.recordedDays],
                      ['Días sin movimientos', data.missingDays],
                      ['Total de registros', data.movementCount],
                    ].map(([label, value]) => (
                      <div key={label} className="col-sm-6 col-xl-3">
                        <div className="rounded-3 bg-light border p-3">
                          <span className="small text-muted">{label}</span>
                          <strong className="h5 d-block mt-1 mb-0">{value}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="form-check mb-3">
                    <input
                      id="model-review"
                      type="checkbox"
                      className="form-check-input"
                      checked={reviewed}
                      onChange={e => setReviewed(e.target.checked)}
                    />
                    <label className="form-check-label small" htmlFor="model-review">
                      Confirmo que todos mis ingresos y gastos desde {ledger.openingDate} hasta {to} están completos.
                    </label>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle cash-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th className="text-end">Dinero recibido</th>
                          <th className="text-end">Gastos pagados</th>
                          <th className="text-end">Diferencia del día</th>
                          <th className="text-end">Dinero al cierre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.slice((currentPage - 1) * 10, currentPage * 10).map(row => (
                          <tr key={row.date}>
                            <th scope="row">{row.date}</th>
                            <td className="text-end">{money(row.incomeCents)}</td>
                            <td className="text-end">{money(row.expenseCents)}</td>
                            <td className="text-end">{money(row.netCents)}</td>
                            <td className="text-end fw-semibold">{money(row.closingCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {pages > 1 && (
                    <nav className="d-flex justify-content-end align-items-center gap-2 mb-3" aria-label="Páginas del resumen diario">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setPage(currentPage - 1)}
                      >
                        Anterior
                      </button>
                      <span className="small">
                        {currentPage} / {pages}
                      </span>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        type="button"
                        disabled={currentPage === pages}
                        onClick={() => setPage(currentPage + 1)}
                      >
                        Siguiente
                      </button>
                    </nav>
                  )}
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={!data.ready}
                      onClick={() => download('csv')}
                    >
                      <Download size={15} aria-hidden="true" /> Descargar para Excel (CSV)
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      disabled={!data.ready}
                      onClick={() => download('json')}
                    >
                      Descargar respaldo (JSON)
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <div className="row g-3 pt-3 border-top">
          <div className="col-lg-6">
            <div className="p-3 border rounded-3 h-100 bg-light">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                <h3 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                  <ShieldCheck size={18} className="text-primary" /> Precisión de las estimaciones
                </h3>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                  onClick={handleValidarModelo}
                  disabled={validatingModel}
                >
                  <RefreshCw size={14} /> {validatingModel ? 'Comprobando...' : 'Comprobar precisión'}
                </button>
              </div>
              {desempeno ? (
                <div className="small">
                  <p className="mb-2 text-muted">{desempeno.mensajeValidacion}</p>
                  <div className="d-flex flex-wrap gap-3">
                    <span>
                      <strong>Nivel de acierto:</strong> {desempeno.precisionActualCalculada}%
                    </span>
                    <span>
                      <strong>Margen de variación:</strong> {desempeno.errorPorcentualMedio}%
                    </span>
                    <span>
                      <strong>Estado:</strong> {desempeno.estadoSaludModelo}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="small text-muted mb-0">
                  Comprueba qué tan cercanas han sido las estimaciones frente a tus ingresos y gastos reales.
                </p>
              )}
            </div>
          </div>

          <div className="col-lg-6">
            <div className="p-3 border rounded-3 h-100 bg-light">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                <h3 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                  <Gauge size={18} className="text-primary" /> Velocidad y respuesta del sistema
                </h3>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={200}
                    className="form-control form-control-sm"
                    style={{ width: 70 }}
                    value={iteraciones}
                    onChange={e => setIteraciones(Math.max(1, Math.min(200, Number(e.target.value) || 20)))}
                    aria-label="Cantidad de pruebas"
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                    onClick={handleEvaluarRendimiento}
                    disabled={testingPerf}
                  >
                    <Cpu size={14} /> {testingPerf ? 'Midiendo...' : 'Probar rapidez'}
                  </button>
                </div>
              </div>
              {rendimiento ? (
                <div className="small">
                  <div className="d-flex flex-wrap gap-3 mb-1">
                    <span>
                      <strong>Estado:</strong> {rendimiento.estadoSistema}
                    </span>
                    <span>
                      <strong>Tiempo de respuesta:</strong> {rendimiento.latenciaTotalMs} ms
                    </span>
                    <span>
                      <strong>Capacidad:</strong> {rendimiento.throughputOperacionesPorSegundo} consultas/seg
                    </span>
                  </div>
                </div>
              ) : (
                <p className="small text-muted mb-0">
                  Comprueba que el sistema responda con rapidez al consultar tus datos.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}
