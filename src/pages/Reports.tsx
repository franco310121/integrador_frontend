import { useState, useEffect } from 'react';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Calendar,
  Download,
  Building,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { getSales } from '../services/ventaService';
import { getPurchases } from '../services/compraService';
import type { VentaDB } from '../types/venta';
import type { CompraDB } from '../types/compra';
import Loader from '../components/feedback/Loader';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function Reports() {
  const [sales, setSales] = useState<VentaDB[]>([]);
  const [purchases, setPurchases] = useState<CompraDB[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');
  const [filtV, setFiltV] = useState<VentaDB[]>([]);
  const [filtC, setFiltC] = useState<CompraDB[]>([]);

  useEffect(() => {
    Promise.all([getSales(), getPurchases()])
      .then(([s, c]) => {
        setSales(s);
        setPurchases(c);
        setFiltV(s);
        setFiltC(c);
      })
      .finally(() => setLoading(false));
  }, []);

  const applyFilter = () => {
    let s = [...sales];
    let c = [...purchases];

    if (filterFrom) {
      s = s.filter(x => {
        const fecha = (x.fechaVenta || x.fecha_venta || '').slice(0, 10);
        return fecha >= filterFrom;
      });
      c = c.filter(x => {
        const fecha = (x.fechaCompra || x.fecha_compra || '').slice(0, 10);
        return fecha >= filterFrom;
      });
    }

    if (filterTo) {
      s = s.filter(x => {
        const fecha = (x.fechaVenta || x.fecha_venta || '').slice(0, 10);
        return fecha <= filterTo;
      });
      c = c.filter(x => {
        const fecha = (x.fechaCompra || x.fecha_compra || '').slice(0, 10);
        return fecha <= filterTo;
      });
    }

    setFiltV(s);
    setFiltC(c);
  };

  const clearFilter = () => {
    setFilterFrom('');
    setFilterTo('');
    setFiltV(sales);
    setFiltC(purchases);
  };

  // KPIs
  const totalIngresos = filtV.reduce((a, v) => a + Number(v.total || 0), 0);
  const totalIGVVentas = filtV.reduce((a, v) => a + Number(v.igv || 0), 0);
  const totalCostos = filtC.reduce((a, c) => a + Number(c.total || 0), 0);
  const gananciaNet = totalIngresos - totalCostos;
  const nVentas = filtV.length;
  const ticketProm = nVentas > 0 ? totalIngresos / nVentas : 0;

  // Top Clientes
  interface ClienteStat {
    cliente: string;
    nVentas: number;
    total: number;
  }
  const clienteMap: Record<string, ClienteStat> = {};
  filtV.forEach(v => {
    const name = v.cliente || 'Consumidor Final';
    if (!clienteMap[name]) {
      clienteMap[name] = { cliente: name, nVentas: 0, total: 0 };
    }
    clienteMap[name].nVentas += 1;
    clienteMap[name].total += Number(v.total || 0);
  });
  const topClientes = Object.values(clienteMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const exportCSV = (
    data: any[],
    filename: string,
    headers: string[],
    rowFn: (item: any) => string
  ) => {
    const lines = [headers.join(','), ...data.map(rowFn)];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Loader />;

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h4 mb-0 fw-bold text-dark">📊 Reportes Financieros y Rentabilidad</h1>
          <p className="text-muted mb-0 small">Análisis consolidado de ventas, compras, márgenes y descarga de datos</p>
        </div>
      </div>

      {/* Filtros de Rango de Fechas y Exportación */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body p-3 d-flex flex-wrap gap-3 align-items-end">
          <div>
            <label className="form-label small text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '.7rem' }}>
              Desde
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light text-muted">
                <Calendar size={14} />
              </span>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filterFrom}
                onChange={e => setFilterFrom(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label small text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '.7rem' }}>
              Hasta
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light text-muted">
                <Calendar size={14} />
              </span>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filterTo}
                onChange={e => setFilterTo(e.target.value)}
              />
            </div>
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-2"
              onClick={clearFilter}
            >
              Limpiar
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm rounded-2 px-3 fw-semibold"
              onClick={applyFilter}
            >
              Aplicar Filtro
            </button>
          </div>

          <div className="ms-auto d-flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-outline-success btn-sm rounded-2 d-inline-flex align-items-center gap-1.5"
              onClick={() =>
                exportCSV(
                  filtV,
                  'reporte_ventas.csv',
                  ['Boleta', 'Cliente', 'Subtotal', 'IGV', 'Descuento', 'Total', 'Estado', 'Fecha', 'Vendedor'],
                  v =>
                    `"${v.numero_boleta || v.numeroBoleta || ''}","${v.cliente || ''}",${v.subtotal},${v.igv},${v.descuento},${v.total},"${v.estado}","${v.fecha_venta || v.fechaVenta || ''}","${v.vendedor_nombre || v.vendedorNombre || ''}"`
                )
              }
            >
              <Download size={14} />
              <span>Ventas CSV</span>
            </button>

            <button
              type="button"
              className="btn btn-outline-info btn-sm rounded-2 d-inline-flex align-items-center gap-1.5"
              onClick={() =>
                exportCSV(
                  filtC,
                  'reporte_compras.csv',
                  ['ID', 'Proveedor', 'Subtotal', 'IGV', 'Total', 'Fecha', 'Usuario'],
                  c =>
                    `"${c.id}","${c.proveedor_nombre || c.proveedorNombre || ''}",${c.subtotal},${c.igv},${c.total},"${c.fecha_compra || c.fechaCompra || ''}","${c.usuario_nombre || c.usuarioNombre || ''}"`
                )
              }
            >
              <Download size={14} />
              <span>Compras CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas de KPIs */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Facturación Ventas', value: formatCurrency(totalIngresos), icon: DollarSign, color: 'text-primary', border: '' },
          { label: 'IGV Fiscal Ventas', value: formatCurrency(totalIGVVentas), icon: Building, color: 'text-info', border: '' },
          { label: 'Costo de Compras', value: formatCurrency(totalCostos), icon: ShoppingCart, color: 'text-danger', border: '' },
          {
            label: 'Margen / Ganancia Neta',
            value: formatCurrency(gananciaNet),
            icon: TrendingUp,
            color: gananciaNet >= 0 ? 'text-success' : 'text-danger',
            border: gananciaNet < 0 ? 'border-danger' : 'border-success',
          },
          { label: 'Boletas Emitidas', value: String(nVentas), icon: BarChart3, color: 'text-primary', border: '' },
          { label: 'Ticket Promedio', value: formatCurrency(ticketProm), icon: FileSpreadsheet, color: 'text-warning', border: '' },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="col-6 col-md-4 col-lg-2">
              <div className={`card border-0 shadow-sm rounded-3 p-3 h-100 ${k.border}`}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="small text-muted text-uppercase fw-semibold" style={{ fontSize: '.68rem' }}>
                    {k.label}
                  </span>
                  <Icon size={16} className={k.color} />
                </div>
                <div className={`h5 mb-0 fw-bold ${k.color}`}>{k.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="row g-4 mb-4">
        {/* Top 5 Clientes */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
              <span className="fs-5">🏆</span>
              <span className="fw-bold text-dark small text-uppercase">Top Clientes por Facturación</span>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Cliente / Razón Social</th>
                    <th className="text-center">Operaciones</th>
                    <th className="text-end">Total Facturado</th>
                  </tr>
                </thead>
                <tbody>
                  {topClientes.map((c, i) => (
                    <tr key={c.cliente}>
                      <td className="text-muted fw-bold small">{i + 1}</td>
                      <td className="fw-semibold small text-dark">{c.cliente}</td>
                      <td className="text-center small">{c.nVentas} boletas</td>
                      <td className="text-end fw-bold text-success small">{formatCurrency(c.total)}</td>
                    </tr>
                  ))}
                  {topClientes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-muted text-center py-4 small">
                        No hay ventas registradas en el período seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Resumen Comercial */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
              <span className="fs-5">📋</span>
              <span className="fw-bold text-dark small text-uppercase">Balance Operativo</span>
            </div>
            <div className="card-body p-3 p-sm-4 d-flex flex-column justify-content-around">
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted small">Ventas completadas</span>
                <span className="fw-bold text-success small">{filtV.filter(v => v.estado !== 'anulada').length}</span>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted small">Ventas anuladas</span>
                <span className="fw-bold text-danger small">{filtV.filter(v => v.estado === 'anulada').length}</span>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted small">Órdenes de compra a proveedores</span>
                <span className="fw-bold text-dark small">{filtC.length}</span>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted small">IGV recaudado</span>
                <span className="fw-bold text-dark small">{formatCurrency(totalIGVVentas)}</span>
              </div>
              <div className="d-flex justify-content-between py-2">
                <span className="text-muted small">Margen bruto global</span>
                <span className={`fw-bold small ${gananciaNet >= 0 ? 'text-success' : 'text-danger'}`}>
                  {totalIngresos > 0 ? ((gananciaNet / totalIngresos) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detalle de Ventas */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
          <span className="fw-bold text-dark small text-uppercase">Detalle Reciente de Ventas ({filtV.length})</span>
          <span className="text-muted small">Mostrando hasta las últimas 50 operaciones</span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Comprobante</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th className="text-end">Subtotal</th>
                <th className="text-end">IGV (18%)</th>
                <th className="text-end">Total</th>
                <th>Estado</th>
                <th>Fecha Emisión</th>
              </tr>
            </thead>
            <tbody>
              {filtV.slice(0, 50).map(v => (
                <tr key={v.id}>
                  <td className="font-monospace small fw-bold text-primary">{v.numero_boleta || v.numeroBoleta}</td>
                  <td className="fw-semibold small text-dark">{v.cliente}</td>
                  <td className="text-muted small">{v.vendedor_nombre || v.vendedorNombre || '—'}</td>
                  <td className="text-end small">{formatCurrency(v.subtotal)}</td>
                  <td className="text-end small text-muted">{formatCurrency(v.igv)}</td>
                  <td className="text-end fw-bold small text-dark">{formatCurrency(v.total)}</td>
                  <td>
                    <span
                      className={`badge py-1 px-2.5 rounded-pill ${
                        v.estado === 'anulada' ? 'badge-soft-danger' : 'badge-soft-success'
                      }`}
                    >
                      {v.estado || 'completada'}
                    </span>
                  </td>
                  <td className="text-muted small">{formatDateTime(v.fecha_venta || v.fechaVenta)}</td>
                </tr>
              ))}
              {filtV.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-muted text-center py-4 small">
                    No se encontraron transacciones en este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
