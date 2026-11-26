import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const products = [
  {id:1,nombre:'Arroz QA',sku:'QA-001',categoriaId:1,categoriaNombre:'Alimentos',precioVenta:8,precioCompra:5,stock:10,stockMinimo:2,estado:'activo'},
  {id:2,nombre:'Leche QA',sku:'QA-002',categoriaId:1,categoriaNombre:'Alimentos',precioVenta:6,precioCompra:4,stock:0,stockMinimo:2,estado:'activo'}
];
const sales = [
  {id:1,numeroBoleta:'QA-VENTA-01',cliente:'Cliente Enero',fechaVenta:'2026-01-15T12:00:00',total:118,subtotal:100,igv:18,descuento:0,estado:'completada',detalles:[]},
  {id:2,numeroBoleta:'QA-VENTA-02',cliente:'Cliente Febrero',fechaVenta:'2026-02-15T12:00:00',total:236,subtotal:200,igv:36,descuento:0,estado:'completada',detalles:[]}
];
async function mockApi(page, {role='admin', reject=false, projectionFailure=false, evaluated=false}={}) {
  // No network request may reach production; the built app uses the local /api base.
  await page.route('**/*', async route => {
    const req=route.request(), url=new URL(req.url());
    if (url.origin !== 'http://127.0.0.1:4173') return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const p=url.pathname.slice(4);
    const send=(json,status=200)=>route.fulfill({status,json});
    if(p==='/auth/login') {
      const body=req.postDataJSON();
      if(reject || body.password!=='qa-password') return send({message:'Credenciales incorrectas'},401);
      return send({token:'qa-synthetic-token',userId:1,correo:body.correo,displayName:'Usuario QA',rol:role});
    }
    if(p==='/productos/low-stock') return send([products[1]]);
    if(p==='/productos') return send(products);
    if(p==='/categorias') return send([{id:1,nombre:'Alimentos'}]);
    if(p==='/ventas') return send(sales);
    if(p==='/compras') return send([]);
    if(p==='/caja/historico') return send({totalIngresos:1000,totalEgresos:300,saldoNetoHistorico:700,cantidadTransacciones:0,transacciones:[]});
    if(p==='/flujo-caja-ia/dashboard') return send({empresa:null,saldoActualCaja:700,totalIngresosMes:1000,totalEgresosMes:300,proyeccionesSemanales:[],proyeccionesMensuales:[],alertasLiquidezActivas:[],nivelRiesgoGlobal:'bajo'});
    if(p==='/flujo-caja-ia/recomendaciones') return send({nivelRiesgoActual:'bajo',saldoActualCaja:700,ratioCoberturaLiquidez:3,resumenEjecutivo:'QA',accionesSugeridas:[],alertasActivas:[]});
    if(p==='/flujo-caja-ia/modelo/desempeno'||p==='/flujo-caja-ia/modelo/validar') return send({versionAlgoritmo:'MEDIA-MOVIL-30D-v1',estadoSaludModelo:evaluated?'EVALUADO':'SIN_DATOS',totalProyeccionesEvaluadas:evaluated?1:0,observacionesMape:evaluated?2:0,mae:evaluated?50:null,rmse:evaluated?60:null,errorPorcentualMedio:evaluated?5:null,mensajeValidacion:evaluated?'Periodo evaluado':'No existen periodos cerrados'});
    if(p==='/flujo-caja-ia/rendimiento') return send({estadoSistema:'ESTABLE',latenciaTotalMs:10,throughputOperacionesPorSegundo:100,iteracionesEvaluadas:20,memoriaUsadaMb:10,memoriaTotalMb:20,memoriaMaximaMb:100,hilosActivos:2,procesadoresDisponibles:2,latenciaPorModuloMs:{}});
    if(p==='/flujo-caja-ia/proyecciones') {
      if(projectionFailure) return send({message:'Servicio no disponible'},503);
      const tipo=url.searchParams.get('tipo');
      return send({id:1,tipoProyeccion:tipo,periodoInicio:'2026-11-27',periodoFin:'2026-12-04',ingresoProyectado:700,egresoProyectado:300,saldoFinalEstimado:1100,nivelConfianza:null});
    }
    if(req.method()==='GET') return send([],200);
    return send({message:'Operacion no prevista en escenario QA'},501);
  });
}
async function login(page, options={}) {
  await mockApi(page,options);
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill('qa@example.test');
  await page.locator('#login-password').fill('qa-password');
  await page.getByRole('button',{name:'Ingresar al sistema'}).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:4173\/$/);
}

test('CN-01 ruta protegida redirige al login',async({page})=>{
  await mockApi(page); await page.goto('/inventory');
  await expect(page).toHaveURL(/\/login$/);
});
test('CN-02 formulario vacío muestra validación',async({page})=>{
  await mockApi(page); await page.goto('/login');
  await page.getByRole('button',{name:'Ingresar al sistema'}).click();
  await expect(page.getByRole('alert')).toContainText('Por favor ingresa');
});
test('CN-03 credenciales rechazadas por API simulada',async({page})=>{
  await mockApi(page,{reject:true}); await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill('qa@example.test');
  await page.locator('#login-password').fill('incorrecta');
  await page.getByRole('button',{name:'Ingresar al sistema'}).click();
  await expect(page.getByRole('alert')).toContainText('Credenciales incorrectas');
});
test('CN-04 ingreso válido y cierre de sesión',async({page})=>{
  await login(page);
  await expect(page.getByRole('heading',{name:/Hola, Usuario QA/})).toBeVisible();
  await page.getByRole('button',{name:/Cerrar Sesión/i}).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/inventory'); await expect(page).toHaveURL(/\/login$/);
});
test('CN-05 vendedor no puede abrir reportes administrativos',async({page})=>{
  await login(page,{role:'vendedor'});
  await expect(page.locator('nav summary').filter({hasText:'Administración'})).toHaveCount(0);
  await page.goto('/reports'); await expect(page).toHaveURL(/4173\/$/);
});
test('CN-06 administrador navega a inventario y filtra por SKU',async({page})=>{
  await login(page);
  await page.locator('nav summary').filter({hasText:'Operaciones'}).click();
  await page.getByRole('link',{name:'Mis productos'}).click();
  await expect(page).toHaveURL(/\/inventory$/);
  await expect(page.getByRole('heading',{name:'Mis productos',level:1,exact:true})).toBeVisible();
  await expect(page.getByText('Arroz QA',{exact:true})).toBeVisible();
  await page.getByPlaceholder('Buscar por nombre o SKU...').fill('QA-002');
  await expect(page.getByText('Leche QA',{exact:true})).toBeVisible();
  await expect(page.getByText('Arroz QA',{exact:true})).toHaveCount(0);
});
test('CN-07 reportes filtran y descargan CSV',async({page})=>{
  await login(page); await page.goto('/reports');
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByRole('heading',{name:'Reportes del negocio',level:1,exact:true})).toBeVisible();
  await page.getByText('Filtrar período y exportar datos',{exact:true}).click();
  await page.locator('input[type=date]').nth(0).fill('2026-01-01');
  await page.locator('input[type=date]').nth(1).fill('2026-01-31');
  await page.getByRole('button',{name:'Aplicar Filtro'}).click();
  const pending=page.waitForEvent('download');
  await page.getByRole('button',{name:'Ventas CSV'}).click();
  const download=await pending;
  expect(download.suggestedFilename()).toBe('reporte_ventas.csv');
  const csv=await readFile(await download.path(),'utf8');
  expect(csv).toContain('QA-VENTA-01'); expect(csv).not.toContain('QA-VENTA-02');
});
test('CN-08 proyección semanal devuelve tarjeta visible',async({page})=>{
  await login(page); await page.goto('/flujo-caja');
  await page.getByRole('button',{name:'Ver próxima semana'}).click();
  await expect(page.getByText('PRÓXIMOS 7 DÍAS',{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:/Tendrás aprox/})).toBeVisible();
});
test('CN-09 fallo de proyección se muestra sin inventar resultado',async({page})=>{
  await login(page,{projectionFailure:true}); await page.goto('/flujo-caja');
  await page.getByRole('button',{name:'Ver próxima semana'}).click();
  await expect(page.getByText('No se pudo actualizar el cálculo automático.')).toBeVisible();
  await expect(page.getByText('PRÓXIMOS 7 DÍAS',{exact:true})).toHaveCount(0);
});
test('CN-10 desempeño sin datos muestra N/D',async({page})=>{
  await login(page); await page.goto('/flujo-caja');
  await page.getByText(/Opciones avanzadas: descargar historial diario/).click();
  await page.getByRole('button',{name:'Evaluar desempeño'}).click();
  await expect(page.getByText('Media móvil de 30 días',{exact:false}).first()).toBeVisible();
  await expect(page.getByText(/MAE:.*N\/D/)).toBeVisible();
  await expect(page.getByText(/MAPE:.*N\/D/)).toBeVisible();
});
test('CN-11 menú móvil permite navegación',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await login(page,{role:'vendedor'});
  await page.getByRole('button',{name:'Abrir menú'}).click();
  await page.getByRole('link',{name:'Dinero disponible'}).click();
  await expect(page).toHaveURL(/\/flujo-caja$/);
  await expect(page.getByRole('heading',{name:'Dinero disponible y proyecciones',level:1,exact:true})).toBeVisible();
});
