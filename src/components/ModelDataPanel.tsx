import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, Download, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { loadFinancialLedger } from '../services/financialService';
import { dateKey, addDays } from '../utils/cashFlow';
import { prepareModelData, modelDataCSV } from '../utils/modelData';
import { formatCurrency } from '../utils/formatters';

export default function ModelDataPanel() {
  const { session } = useAuth();
  if (session?.userId === undefined || session?.userId === null || !String(session.userId).trim()) return <div className="alert alert-warning">Vuelve a iniciar sesión para preparar los datos históricos.</div>;
  return <ModelDataForm key={String(session.userId)} userId={String(session.userId)} />;
}

function ModelDataForm({ userId }: { userId: string }) {
  const today = dateKey(new Date());
  const [initial] = useState(() => {
    try { return { ledger: loadFinancialLedger(userId), error: '' }; }
    catch { return { ledger: null, error: 'No se pudo leer el histórico financiero. Revisa el almacenamiento del navegador.' }; }
  });
  const [ledger, setLedger] = useState(initial.ledger);
  const [message, setMessage] = useState(initial.error);
  const [from, setFrom] = useState(initial.ledger?.openingDate ?? today);
  const [to, setTo] = useState(addDays(today, -1));
  const [minDays, setMinDays] = useState('30');
  const [reviewed, setReviewed] = useState(true);
  const [page, setPage] = useState(1);
  const analysis = useMemo(() => {
    if (!ledger) return { data: null, error: '' };
    try { return { data: prepareModelData(ledger, from, to, today, reviewed, Number(minDays)), error: '' }; }
    catch (error) { return { data: null, error: error instanceof Error ? error.message : 'No se pudo preparar la serie.' }; }
  }, [ledger, from, to, today, reviewed, minDays]);
  const data = analysis.data;
  const pages = Math.max(1, Math.ceil((data?.rows.length ?? 0) / 10));
  const currentPage = Math.min(page, pages);
  const money = (cents: number | null) => cents === null ? 'Sin verificar' : formatCurrency(cents / 100);

  function refresh() {
    setReviewed(false); setPage(1);
    try {
      const current = loadFinancialLedger(userId); setLedger(current);
      if (current && from < current.openingDate) setFrom(current.openingDate);
      setMessage(current ? 'Histórico actualizado. Revisa nuevamente la cobertura antes de exportar.' : 'Configura primero el saldo inicial y registra o importa movimientos.');
    } catch { setLedger(null); setMessage('No se pudo leer el histórico. No se han preparado datos para exportar.'); }
  }
  function download(format: 'csv' | 'json') {
    if (!ledger || !data?.ready) return;
    try {
      if (JSON.stringify(loadFinancialLedger(userId)) !== JSON.stringify(ledger)) { refresh(); setMessage('El histórico cambió. Actualizamos los datos; revísalos y confirma otra vez antes de descargar.'); return; }
      const metadata = {
        schemaVersion: 1, generatedAt: new Date().toISOString(), source: 'registro_local_de_caja', currency: 'PEN', frequency: 'daily',
        from, to, openingDate: ledger.openingDate, openingBalance: ledger.openingCents / 100,
        minimumDays: Number(minDays), criterion: 'provisional_definido_por_usuario', coverageReviewed: true, modelConnected: false,
      };
      const content = format === 'csv' ? modelDataCSV(data.rows) : JSON.stringify({ metadata, rows: data.rows.map(row => ({ date: row.date, income: row.incomeCents! / 100, expense: row.expenseCents! / 100, net: row.netCents! / 100, closingBalance: row.closingCents! / 100, movementCount: row.movementCount, coverage: row.coverage })) }, null, 2);
      const url = URL.createObjectURL(new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `serie-financiera-${from}-${to}.${format}`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Serie preparada para descargar. El envío al modelo sigue pendiente.');
    } catch { setReviewed(false); setMessage('No se pudo comprobar el histórico actual. Actualiza los datos antes de descargar.'); }
  }

  return <section className="card p-3 p-md-4 mb-4" aria-labelledby="model-data-title">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3"><h2 id="model-data-title" className="h5 mb-0"><Database size={20} aria-hidden="true" /> Datos para la proyección</h2><button type="button" className="btn btn-sm btn-outline-primary" onClick={refresh}><RefreshCw size={15} aria-hidden="true" /> Actualizar histórico</button></div>
    <p className="small text-muted">El punto 8 prepara los cobros y pagos del histórico en una serie diaria. Puedes revisar y exportar los datos; la selección y conexión del modelo predictivo están pendientes.</p>
    {message && <div className="alert alert-info small" role="status">{message}</div>}
    {!ledger ? <div className="alert alert-warning mb-0">Necesitas datos de <Link to="/movimientos-financieros">Movimientos financieros</Link> o de <Link to="/importacion-financiera">Importación financiera</Link>. Al volver, actualiza el histórico.</div> : <>
      <div className="row g-3 mb-3"><div className="col-md-4"><label htmlFor="model-from" className="form-label">Inicio del período histórico</label><input id="model-from" type="date" className="form-control" min={ledger.openingDate} max={today} value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></div><div className="col-md-4"><label htmlFor="model-to" className="form-label">Último día cerrado</label><input id="model-to" type="date" className="form-control" min={from} max={today} value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></div><div className="col-md-4"><label htmlFor="model-minimum" className="form-label">Mínimo provisional de días</label><input id="model-minimum" type="number" min="1" max="3660" step="1" className="form-control" value={minDays} onChange={e => setMinDays(e.target.value)} /></div></div>
      <p className="small text-muted">Se propone revisar 30 días como criterio inicial del proyecto; puedes cambiarlo. Este mínimo no garantiza precisión ni sustituye los requisitos del modelo elegido. Por defecto se excluye hoy, porque puede seguir abierto.</p>
      {analysis.error && <div className="alert alert-warning" role="alert">{analysis.error}</div>}
      {data && <>
        <div className="row g-3 mb-3">{[['Días del período', data.rows.length], ['Días con movimientos', data.recordedDays], ['Días sin registros', data.missingDays], ['Movimientos activos', data.movementCount]].map(([label, value]) => <div key={label} className="col-sm-6 col-xl-3"><div className="rounded-3 bg-primary-subtle p-3"><span className="small text-muted">{label}</span><strong className="h4 d-block mt-2 mb-0">{value}</strong></div></div>)}</div>
        <p className="small text-muted">Se excluyeron {data.cancelledCount} movimientos anulados del período. Posibles duplicados activos: {data.duplicates}. {data.missingBefore > 0 && `Hay ${data.missingBefore} días sin registros antes del período seleccionado; también deben revisarse para calcular los saldos.`}</p>
        <div className="alert alert-info small">Un día sin registros permanece «Sin verificar». Después de confirmar que el histórico está completo, se interpreta como un día sin cobros ni pagos, con importes cero. Si hay un día sin verificar, su saldo y los posteriores quedan pendientes de comprobar.</div>
        <div className="form-check mb-3"><input id="model-review" type="checkbox" className="form-check-input" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /><label className="form-check-label" htmlFor="model-review">Confirmo que el saldo inicial y todos los cobros y pagos desde {ledger.openingDate} hasta {to} están completos y que esos días están cerrados. Los días sin registros corresponden a días sin movimientos.</label></div>
        <div className={`alert alert-${data.ready ? 'success' : 'warning'}`} role="status"><strong>{data.ready ? 'Serie preparada para exportar · Modelo pendiente' : 'Datos pendientes de revisión'}</strong>{data.issues.length > 0 && <ul className="small mt-2 mb-0">{data.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}</div>
        <div className="table-responsive"><table className="table align-middle cash-table"><caption>Serie diaria ordenada. Saldo de cierre = saldo anterior + ingresos − egresos. Los saldos incluyen los movimientos anteriores al período seleccionado.</caption><thead><tr><th>Fecha</th><th className="text-end">Ingresos</th><th className="text-end">Egresos</th><th className="text-end">Flujo neto</th><th className="text-end">Saldo de cierre</th><th>Movimientos</th><th>Cobertura</th></tr></thead><tbody>{data.rows.slice((currentPage - 1) * 10, currentPage * 10).map(row => <tr key={row.date}><th scope="row">{row.date}</th><td className="text-end">{money(row.incomeCents)}</td><td className="text-end">{money(row.expenseCents)}</td><td className="text-end">{money(row.netCents)}</td><td className="text-end">{money(row.closingCents)}</td><td>{row.movementCount}</td><td>{row.coverage === 'registrado' ? 'Con registros' : row.coverage === 'sin_verificar' ? 'Sin verificar' : 'Sin movimientos confirmado'}</td></tr>)}</tbody></table></div>
        {pages > 1 && <nav className="d-flex justify-content-end align-items-center gap-2 mb-3" aria-label="Páginas de la serie diaria"><button className="btn btn-sm btn-outline-secondary" type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><span className="small">{currentPage} / {pages}</span><button className="btn btn-sm btn-outline-secondary" type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Siguiente</button></nav>}
        <div className="d-flex flex-wrap gap-2"><button type="button" className="btn btn-primary" disabled={!data.ready} onClick={() => download('csv')}><Download size={16} aria-hidden="true" /> Descargar serie CSV</button><button type="button" className="btn btn-outline-primary" disabled={!data.ready} onClick={() => download('json')}>Descargar JSON con metadatos</button><Link className="btn btn-link" to="/movimientos-financieros">Revisar movimientos</Link></div>
      </>}
    </>}
  </section>;
}
