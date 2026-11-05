export interface EmpresaBackendRequest {
  nombreMype: string;
  ruc: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  sectorComercial?: string;
}

export interface EmpresaBackendResponse {
  id: number;
  nombreMype: string;
  ruc: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  sectorComercial?: string;
  fechaCreacion?: string;
}

export interface TransaccionCajaRequest {
  tipo: 'ingreso' | 'egreso';
  categoriaGasto?: string;
  monto: number;
  fechaTransaccion?: string;
  observaciones?: string;
  ventaId?: number;
  compraId?: number;
}

export interface TransaccionCajaResponse {
  id: number;
  tipo: 'ingreso' | 'egreso' | string;
  categoriaGasto: string;
  monto: number;
  fechaTransaccion: string;
  estado: string;
  observaciones?: string;
  ventaId?: number | null;
  compraId?: number | null;
  fechaCreacion?: string;
}

export interface FlujoCajaHistoricoResponse {
  totalIngresos: number;
  totalEgresos: number;
  saldoNetoHistorico: number;
  cantidadTransacciones: number;
  transacciones: TransaccionCajaResponse[];
}

export interface RegistroImportacionFinanciera {
  tipo: 'ingreso' | 'egreso' | string;
  categoriaGasto?: string;
  monto: number;
  fechaTransaccion?: string;
  observaciones?: string;
}

export interface ImportarFinancieroRequest {
  registros: RegistroImportacionFinanciera[];
}

export interface ImportarFinancieroResponse {
  procesadosExitosos: number;
  registrosConError: number;
  detallesError: string[];
  mensaje: string;
}

export interface ProyeccionFlujoResponse {
  id: number;
  modeloId?: number | null;
  periodoInicio: string;
  periodoFin: string;
  tipoProyeccion: 'semanal' | 'mensual' | string;
  ingresoProyectado: number;
  egresoProyectado: number;
  saldoFinalEstimado: number;
  nivelConfianza: number;
  fechaGeneracion: string;
}

export interface AlertaLiquidezResponse {
  id: number;
  proyeccionId?: number | null;
  nivelRiesgo: 'bajo' | 'medio' | 'critico' | string;
  mensajeAlerta: string;
  recomendacionPreventiva: string;
  fechaAlerta: string;
  leido: boolean;
}

export interface DashboardFinancieroResponse {
  empresa: EmpresaBackendResponse | null;
  saldoActualCaja: number;
  totalIngresosMes: number;
  totalEgresosMes: number;
  proyeccionesSemanales: ProyeccionFlujoResponse[];
  proyeccionesMensuales: ProyeccionFlujoResponse[];
  alertasLiquidezActivas: AlertaLiquidezResponse[];
  nivelRiesgoGlobal: 'bajo' | 'medio' | 'critico' | string;
}

export interface AccionSugeridaDto {
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA' | string;
  area: 'COBRANZAS' | 'GASTOS' | 'INVENTARIO' | 'TESORERIA' | string;
  titulo: string;
  descripcion: string;
  impactoEsperado: string;
}

export interface RecomendacionPreventivaResponse {
  nivelRiesgoActual: 'bajo' | 'medio' | 'critico' | string;
  saldoActualCaja: number;
  ratioCoberturaLiquidez: number;
  resumenEjecutivo: string;
  accionesSugeridas: AccionSugeridaDto[];
  alertasActivas: AlertaLiquidezResponse[];
}

export interface DesempenoModeloResponse {
  idModelo: number;
  versionAlgoritmo: string;
  fechaEntrenamiento: string;
  precisionHistorica: number;
  precisionActualCalculada: number;
  errorPorcentualMedio: number;
  nivelConfianzaPromedio: number;
  totalProyeccionesEvaluadas: number;
  ingresosRealesAcumulados: number;
  egresosRealesAcumulados: number;
  ultimaProyeccionIngreso: number;
  ultimaProyeccionEgreso: number;
  estadoSaludModelo: 'OPTIMO' | 'ACEPTABLE' | 'REQUIERE_REENTRENAMIENTO' | string;
  mensajeValidacion: string;
  fechaValidacion: string;
}

export interface RendimientoSistemaResponse {
  estadoSistema: 'OPTIMO' | 'ESTABLE' | 'CARGA_ELEVADA' | string;
  latenciaTotalMs: number;
  throughputOperacionesPorSegundo: number;
  iteracionesEvaluadas: number;
  memoriaUsadaMb: number;
  memoriaTotalMb: number;
  memoriaMaximaMb: number;
  hilosActivos: number;
  procesadoresDisponibles: number;
  latenciaPorModuloMs: Record<string, number>;
  fechaEvaluacion: string;
}

export interface SimulacionFinancieraRequest {
  nombreEscenario: string;
  porcentajeAjusteIngresos: number;
  porcentajeAjusteEgresos: number;
}

export interface SimulacionFinancieraResponse {
  id: number;
  nombreEscenario: string;
  porcentajeAjusteIngresos: number;
  porcentajeAjusteEgresos: number;
  ingresosBase: number;
  egresosBase: number;
  saldoBase: number;
  ingresosSimulados: number;
  egresosSimulados: number;
  saldoSimulado: number;
  variacionSaldo: number;
  impactoLiquidez: 'RIESGO_DEFICIT' | 'REDUCCION_LIQUIDEZ' | 'POSITIVO' | string;
  recomendacion: string;
  resultadoSimulacion: string;
  fechaSimulacion: string;
}

