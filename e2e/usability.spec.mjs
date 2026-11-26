import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login, mockApi } from './fixtures/isolated-api.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

test('US-01 H1: feedback durante autenticación', async ({page}) => {
  await mockApi(page);
  await page.route('**/api/auth/login', async route => {
    await new Promise(resolve => setTimeout(resolve, 900));
    await route.fulfill({json:{token:'qa-synthetic-token',userId:1,correo:'qa@example.test',displayName:'Usuario QA',rol:'admin'}});
  });
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill('qa@example.test');
  await page.locator('#login-password').fill('qa-password');
  await page.getByRole('button',{name:'Ingresar al sistema'}).click();
  await expect(page.getByRole('button',{name:'Autenticando...'})).toBeDisabled();
  await expect(page).toHaveURL(/4173\/$/);
});
test('US-02 H3: control de contraseña visible y reversible', async ({page}) => {
  await mockApi(page); await page.goto('/login');
  const input=page.locator('#login-password');
  await input.fill('qa-password');
  await page.getByRole('button',{name:'Ver contraseña'}).click();
  await expect(input).toHaveAttribute('type','text');
  await page.getByRole('button',{name:'Ocultar contraseña'}).click();
  await expect(input).toHaveAttribute('type','password');
});
test('US-03 H5/H9: prevención y recuperación de error de formulario',async({page})=>{
  await mockApi(page); await page.goto('/login');
  await page.getByRole('button',{name:'Ingresar al sistema'}).click();
  await expect(page.getByRole('alert')).toContainText('Por favor ingresa');
  await page.getByLabel('Correo electrónico').fill('qa@example.test');
  await page.locator('#login-password').fill('qa-password');
  await page.getByRole('button',{name:'Ingresar al sistema'}).click();
  await expect(page).toHaveURL(/4173\/$/);
});
test('US-04 H4/H6: navegación agrupada y reconocible',async({page})=>{
  await login(page);
  const nav=page.getByRole('navigation',{name:'Navegación principal'});
  await expect(nav.getByRole('link',{name:'Dinero disponible'})).toBeVisible();
  await nav.locator('summary').filter({hasText:'Operaciones'}).click();
  await nav.getByRole('link',{name:'Mis productos'}).click();
  await expect(page).toHaveURL(/\/inventory$/);
  await expect(page.getByRole('heading',{name:'Mis productos',level:1})).toBeVisible();
});
test('US-05 H7: búsqueda y recuperación del listado',async({page})=>{
  await login(page); await page.goto('/inventory');
  const search=page.getByPlaceholder('Buscar por nombre o SKU...');
  await search.fill('QA-002');
  await expect(page.getByText('Leche QA',{exact:true})).toBeVisible();
  await expect(page.getByText('Arroz QA',{exact:true})).toHaveCount(0);
  await search.clear();
  await expect(page.getByText('Arroz QA',{exact:true})).toBeVisible();
});
test('US-06 H8: detalle avanzado bajo demanda',async({page})=>{
  await login(page); await page.goto('/flujo-caja');
  const summary=page.getByText(/Opciones avanzadas: descargar historial diario/);
  await expect(summary).toBeVisible();
  const button=page.getByRole('button',{name:'Evaluar desempeño'});
  await expect(button).toBeHidden();
  await summary.click(); await expect(button).toBeVisible();
});
test('US-07: navegación con teclado en login',async({page})=>{
  await mockApi(page); await page.goto('/login');
  const email=page.getByLabel('Correo electrónico');
  await email.focus(); await page.keyboard.press('Tab');
  await expect(page.locator('#login-password')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'Ver contraseña'})).toBeFocused();
});
for(const [name,path,mobile] of [['login','/login',false],['dashboard','/',false],['inventario','/inventory',false],['flujo-caja','/flujo-caja',false],['reportes','/reports',false],['login-movil','/login',true]]) {
  test('AX-'+name+': auditoría WCAG A/AA',async({page},info)=>{
    if(mobile) await page.setViewportSize({width:390,height:844});
    if(path==='/login') await mockApi(page); else await login(page);
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    await mkdir('test-results/axe',{recursive:true});
    const summary={pantalla:name,violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,help:v.help,helpUrl:v.helpUrl,nodes:v.nodes.map(n=>({target:n.target,failureSummary:n.failureSummary}))})),incomplete:result.incomplete.map(v=>({id:v.id,nodes:v.nodes.length})),passed:result.passes.length};
    await writeFile('test-results/axe/'+name+'.json',JSON.stringify(summary,null,2));
    await info.attach('axe-'+name,{body:JSON.stringify(summary,null,2),contentType:'application/json'});
    expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.length})), 'Hallazgos WCAG automatizados; revisar evidencia').toEqual([]);
  });
}
