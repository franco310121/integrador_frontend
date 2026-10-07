# Evaluación del frontend — 7 de octubre de 2026

Revisión del código local contra los 14 requisitos visibles de la imagen. Algunas frases de la imagen están recortadas; no se presuponen criterios adicionales. No se ha auditado el backend ni validado su disponibilidad. Una pantalla no demuestra por sí sola el cumplimiento de extremo a extremo.

## Estado encontrado antes del cambio

| Punto | Estado | Evidencia y brecha |
|---|---|---|
| 1. Registrar información de la empresa | No identificado | `Profile.tsx` administra el perfil del usuario; no se encontró un registro de la MYPE como empresa. |
| 2. Registrar ingresos financieros | Parcial | `Ventas.tsx` y `ventaService.ts` registran ventas; no un libro de cobros y otros ingresos de caja. Venta emitida no equivale necesariamente a cobro. |
| 3. Registrar egresos financieros | Parcial | `Compras.tsx` y `compraService.ts` registran compras; faltan pagos efectivos y otros gastos operativos. |
| 4. Importar información financiera | No identificado | `Reports.tsx` exporta CSV; no se encontró importación financiera. |
| 5. Validar y normalizar datos financieros | Parcial | Los servicios normalizan nombres de campos y números; no hay un proceso completo de calidad de datos financieros importados. |
| 6. Consultar histórico del flujo de caja | Parcial | Historial de ventas y filtros de compras/ventas en reportes; falta histórico de caja conciliado con saldo inicial y cobros/pagos efectivos. |
| 7. Visualizar indicadores financieros | Parcial | `Dashboard.tsx` y `Reports.tsx` muestran ingresos, compras y diferencias; faltan indicadores de liquidez. |
| 8. Preparar datos para el modelo | No identificado | No se encontró una serie temporal financiera ni un servicio de preparación para un modelo. |
| 9. Proyección semanal | No identificado | No había vista ni cálculo de proyección. |
| 10. Proyección mensual | No identificado | Los reportes históricos no son proyecciones. |
| 11. Identificar riesgo de liquidez | No identificado | Las alertas del dashboard son de inventario. |
| 12. Alertas preventivas de liquidez | No identificado | No había detección de déficit futuro de caja. |
| 13. Dashboard financiero | Parcial | Existe dashboard operacional y reportes financieros; falta integrar caja actual y futura. |
| 14. Ingresos, egresos y saldos esperados | Parcial | Se muestran ventas y compras históricas, sin saldos futuros de caja. |

## Página incorporada: Flujo de caja (`/flujo-caja`)

Disponible en el menú principal para usuarios autenticados. Conserva el diseño y la autenticación existentes. No modifica los servicios ni las transacciones registradas.

1. **Escenario:** saldo inicial, reserva mínima y cobros/pagos previstos con fecha, concepto e importe. Validación de importes y del horizonte; permite eliminar y volver a ingresar un movimiento. Confirmación explícita antes de mostrar resultados, incluso si se desea simular sin movimientos.
2. **Punto 9:** proyección en bloques de siete días desde hoy, con saldo inicial, ingresos, egresos, saldo final y riesgo por período.
3. **Punto 10:** agrupación por mes calendario de los mismos 90 días. Se indican períodos parciales; cambiar de vista no cambia el saldo final del horizonte.
4. **Punto 11:** riesgo alto ante saldo negativo, medio por debajo de la reserva definida por el usuario, bajo al alcanzar la reserva. Se utiliza el mínimo entre saldo inicial y cierres diarios, para no ocultar déficits que se recuperan antes del cierre mensual. Son reglas del prototipo, no un modelo validado ni una probabilidad de incumplimiento.
5. **Punto 12:** alertas al iniciar o cambiar un nivel de riesgo, con fecha, saldo, déficit o brecha frente a la reserva y una indicación de revisar los movimientos. La agrupación semanal/mensual no altera las alertas.

Fórmula: saldo final = saldo inicial + cobros previstos − pagos previstos. Cálculos en centavos. El orden intradía no se evalúa. Las fechas usan el calendario local del navegador.

**Resultado:** los puntos 9–12 quedan estructurados y funcionales como simulación manual de frontend. No deben presentarse como un sistema predictivo productivo terminado. La página avisa que no guarda datos al salir o recargar y que no está conectada al banco o a un modelo. No se usan datos de ejemplo ni se asimilan automáticamente ventas/compras a efectivo.

## Pendientes para cumplimiento completo

### Avance posterior: punto 1 — Empresa

Se agregó `/empresa`, accesible en Administración → Empresa con la protección de administrador existente. Permite registrar y editar razón social, nombre comercial, RUC, actividad, dirección y contacto; muestra una ficha del registro guardado, valida campos y permite descartar cambios. El RUC se valida únicamente por su formato de 11 dígitos, sin consulta a SUNAT.

Los datos se guardan en el almacenamiento local del navegador con una clave por cuenta. Se muestran errores si no se pueden leer o guardar; no se declara éxito ante un fallo. Este almacenamiento no sustituye permisos del servidor ni comparte una empresa entre usuarios. El punto 1 queda implementado como formulario con persistencia local; resta conectar el backend y asociar usuarios a la empresa. La compilación pasa y la comprobación de tipos no reporta errores en los archivos de Empresa; permanecen los errores de otros módulos descritos abajo. No se ha verificado visualmente esta página en navegador.

### Integraciones pendientes

### Avance posterior: puntos 2, 3 y 6 — Movimientos financieros

Se incorporó `/movimientos-financieros` al menú principal para usuarios autenticados. Comparte el registro de cobros y pagos efectivos con el histórico del flujo de caja. Incluye saldo inicial con fecha, categoría, concepto, importe, medio de pago, contacto y referencia. Las fechas de movimientos están limitadas entre la fecha inicial guardada y hoy; los futuros se registran en la página de proyección.

El histórico permite filtros de fechas, tipo, estado y búsqueda, con paginación. Cada fila conserva el saldo acumulado completo, aunque se oculte un movimiento con los filtros. El resumen muestra saldo de entrada, ingresos, egresos y saldo de cierre del rango de fechas, considerando todos los registros activos. Los importes se calculan en centavos. Se puede anular con confirmación y restaurar; los anulados quedan visibles y no afectan el saldo.

La persistencia es local y está separada por cuenta. Se rechaza una escritura si otra pestaña ha cambiado el registro o si no puede leerse el almacenamiento existente. Estos controles no sustituyen la persistencia, permisos ni auditoría del servidor. Todavía no se vinculan automáticamente las ventas, compras o empresas con este libro de caja; la conciliación queda pendiente. Los puntos 2, 3 y 6 tienen ahora funcionalidad manual local en el frontend.

Verificación: empaquetado de producción correcto; pruebas automáticas de saldos históricos, anulaciones/restauraciones, rangos inclusivos, decimales, límites de importes y fechas. Pruebas adicionales cubren persistencia por cuenta, conflicto entre pestañas, datos corruptos y fallo de almacenamiento. TypeScript continúa reportando errores en los módulos anteriores, sin errores en los nuevos archivos. La revisión visual en navegador está pendiente.

- Persistir saldo, movimientos y configuración por empresa, con permisos verificados en el servidor.
- Registrar y conciliar cobros/pagos efectivos, vencimientos, otros gastos, devoluciones y saldos bancarios.
- Acordar si las proyecciones deben provenir de un modelo predictivo (el punto 8 sugiere esta dependencia); preparar los datos, conectar el servicio y documentar método, fecha de actualización y evaluación de precisión.
- Guardar alertas y su atención; implementar evaluación periódica y entrega fuera de la página si el alcance requiere notificaciones persistentes o en segundo plano.
- Validar reglas de riesgo y criterios de aceptación con el responsable del proyecto.

## Verificación reproducible

### Avance posterior: puntos 7, 13 y 14 — Dashboard financiero

El Dashboard existente incorpora un bloque financiero antes de ventas e inventario. El punto 7 muestra saldo registrado hasta hoy, ingresos, egresos y flujo neto, con período de mes actual, últimos 30 días o todo el histórico. Los cálculos usan el registro financiero local y excluyen anulados; se advierte que los saldos dependen de la cobertura de los registros y no son saldos bancarios conciliados.

El punto 13 reúne caja registrada, planificación, riesgo y alertas con accesos a las páginas financieras. El bloque local permanece visible mientras se cargan los servicios de ventas/inventario y cuando esos servicios fallan. Los indicadores comerciales se identifican como facturación histórica e IGV en comprobantes. Actualiza los datos locales al regresar, recibir un cambio de otra pestaña o pulsar Actualizar caja.

El punto 14 muestra gráfico de ingresos/egresos previstos y tabla semanal/mensual con saldo previsto al cierre de cada período. La comparación de registrado/esperado usa el mismo período y corte (menor entre hoy y el fin del período). Las filas futuras no reciben importes realizados inventados, y si la fecha inicial de caja no cubre el período se indica ausencia de cobertura. Se muestra la diferencia de saldo inicial entre registro y escenario, si existe; esta diferencia también puede explicar diferencias al cierre.

Para compartir las proyecciones se agregó a Flujo de caja el botón «Guardar escenario para el Dashboard». Guarda por cuenta el escenario confirmado en el navegador y lo recupera al volver. La fecha inicial puede editarse; todos los movimientos deben seguir dentro de los 90 días. Los cambios pendientes no actualizan el Dashboard hasta guardar. Se controlan conflictos entre pestañas y errores de lectura/escritura.

Los escenarios vencidos y las alertas con fecha pasada se identifican expresamente. Los riesgos y saldos mínimos corresponden al horizonte guardado completo; no se presentan como un modelo predictivo ni como evaluación bancaria actual. Los puntos 7, 13 y 14 quedan cubiertos en el prototipo local, con integración al backend y modelo todavía pendientes.

Verificación: compilación correcta y 23 pruebas aprobadas, incluidas comparación con corte común, períodos futuros sin realizados, cobertura histórica, saldos iniciales distintos, agrupación semanal/mensual, vencimiento y persistencia/conflictos de escenarios. TypeScript conserva errores en los módulos existentes; no reportó errores en los archivos nuevos/modificados para esta ampliación. Revisión visual en navegador pendiente.

### Avance posterior: punto 8 — Preparación de datos

Se incorporó el bloque «Datos para la proyección» en `/flujo-caja`, alimentado por el registro financiero local de la cuenta. Permite seleccionar el período histórico, actualizar el registro y generar una serie diaria ordenada con ingresos, egresos, flujo neto, saldo de cierre, cantidad de movimientos y cobertura. El cálculo conserva el saldo inicial e incorpora las transacciones anteriores al período elegido; excluye anulados y detecta posibles duplicados activos sin eliminarlos automáticamente.

Un día sin registros no se interpreta automáticamente como cero: sus importes quedan sin verificar y los saldos posteriores quedan pendientes. El usuario debe confirmar que todos los días desde el inicio de caja hasta la fecha final están cerrados y completos; entonces los días vacíos pasan a cero. Esto es una declaración de cobertura del usuario, no una conciliación bancaria automática. Por defecto se usa ayer como último día cerrado.

El bloque verifica período válido, cobertura confirmada, ausencia de posibles duplicados, existencia de movimientos activos y mínimo de días configurable (30 propuestos como criterio provisional, sin afirmar que sean suficientes para un modelo concreto). Admite hasta 3,660 días desde el inicio de caja. Cuando se cumplen los criterios permite descargar la serie CSV y un JSON con metadatos de período, moneda PEN, origen local, frecuencia diaria, fecha de preparación, saldo inicial y criterio provisional. Antes de descargar vuelve a comprobar que el histórico no cambió.

El estado es «Serie preparada para exportar · Modelo pendiente». El punto 8 tiene preparación y exportación de datos en frontend; sigue pendiente elegir el modelo, adaptar su contrato, evaluar la calidad del histórico e integrar backend/envío al modelo. La simulación manual existente sigue siendo independiente.

Verificación: compilación correcta y 19 pruebas automáticas aprobadas, incluidas seis nuevas de preparación diaria, saldos, cobertura desconocida, períodos parciales, duplicados, mínimo de días, año bisiesto y exportación. TypeScript continúa fallando en archivos existentes, sin errores reportados en los nuevos. Revisión visual en navegador pendiente.

Comando: `node --experimental-strip-types --test tests/modelData.test.mts tests/financialImport.test.mts tests/financialLedger.test.mts tests/financialStorage.test.mts tests/cashFlow.test.mts`.

### Avance posterior: puntos 4 y 5 — Importación financiera

Se agregó `/importacion-financiera` al menú principal para usuarios autenticados y un acceso desde el histórico financiero. Acepta CSV UTF-8 con coma o punto y coma, hasta 2 MB y 5,000 movimientos, con plantilla descargable. Excel puede exportar a CSV UTF-8; no se admite directamente XLSX. Requiere configurar primero la fecha y saldo inicial de caja.

La vista previa muestra datos normalizados, línea del archivo, errores, ajustes y duplicados. Valida cabecera, columnas, fechas reales dentro del horizonte histórico, tipo, concepto, importe positivo con hasta dos decimales y límites, categoría por tipo, medio de pago y longitud de contacto/referencia. Normaliza espacios, mayúsculas, encabezados, fechas DD/MM/AAAA, cobro/pago, categorías, medios y coma decimal. Categorías vacías se asignan a Otro ingreso/Otro egreso; medios vacíos a Efectivo, con aviso visible. Las columnas desconocidas se ignoran con aviso.

La importación completa queda bloqueada si una fila tiene errores. Requiere revisión y confirmación explícita, añade únicamente filas nuevas al registro local existente y conserva el saldo inicial y todos los registros previos. Identifica coincidencias en fecha, tipo, importe, concepto, categoría, medio, contacto y referencia (comparación de texto sin diferencias de mayúsculas/acentos/espacios). Se omiten duplicados del archivo y del histórico, incluidos anulados; operaciones distintas deben llevar referencias diferentes. Conflictos con cambios de otra pestaña o fallos del almacenamiento no se presentan como importación exitosa.

Los puntos 4 y 5 quedan implementados para importación CSV local de frontend. Falta backend, permisos por empresa, auditoría persistente y preparación específica para el modelo. La compilación pasó y 13 pruebas aprobaron, incluidas seis pruebas de importación: comillas, separadores, saltos de línea, normalización, validación y duplicados. TypeScript no reportó errores en los archivos nuevos; conserva los errores ya descritos. La revisión visual en navegador está pendiente.

Prueba reproducible: `node --experimental-strip-types --test tests/financialImport.test.mts tests/financialLedger.test.mts tests/financialStorage.test.mts tests/cashFlow.test.mts`.

Resultado de esta revisión: compilación de producción correcta (advertencia de bundle mayor de 500 kB) y 3 pruebas automáticas aprobadas. La comprobación global de TypeScript falla en archivos existentes: `Ventas.tsx`, `Devoluciones.tsx`, `HistorialVentas.tsx` y `MovimientosStock.tsx`; no reporta errores en los archivos nuevos. No se realizó una verificación visual en navegador ni una prueba contra el backend.

- `npm run build`: empaquetado de producción (este script usa Vite, no valida por sí solo los tipos).
- `npx tsc --noEmit`: revisión de tipos independiente.
- `node --experimental-strip-types --test tests/cashFlow.test.mts`: coherencia semanal/mensual, déficit temporal, continuidad de saldos, límite de 90 días, cambios de año, año bisiesto, precisión monetaria y umbrales de riesgo. Requiere Node con soporte de TypeScript por eliminación de tipos.
- Comprobación manual: entrar a Flujo de caja; ingresar saldo 100 y reserva 50; agregar pago 150 para mañana y cobro 250 para pasado mañana; confirmar. Debe mostrar saldo final 200, mínimo −50, riesgo alto y alerta para mañana en ambas vistas. Eliminar el pago exige confirmar de nuevo.
