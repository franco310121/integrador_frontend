# Sprint VI: evidencia de la versión original

Las capturas, el CSV y `resultados.json` documentan la ejecución del 26/11/2026 sobre la versión original del Sprint VI. Se usaron Edge automatizado, una sesión simulada y respuestas de API sintéticas; no se conectó la base de producción. En esa versión se aprobaron 17 de 17 comprobaciones de interfaz.

La rama de este repositorio incorpora el Sprint VI sobre una base posterior, con cambios adicionales en el simulador financiero. Estas capturas **no representan la interfaz actual** y el resultado 17/17 **no se atribuye a esta integración**. Para la integración actual se verificaron `npm run build`, `npm run lint` y `node --test` (31/31 pruebas). La comprobación automatizada en Edge de la integración quedó sin concluir porque se rechazó el permiso para ejecutarla.

## Cambios del Sprint VI integrados

- El Dashboard prioriza el resumen y deja ventas, inventario y análisis de planificación bajo controles desplegables; los avisos de caja y stock siguen visibles.
- El menú agrupa las rutas en Finanzas, Operaciones y Administración según el rol.
- Reportes muestra cifras principales y permite desplegar filtros y tablas. El simulador conserva sus funciones recientes y permite desplegar la evolución semanal o mensual.
- Se retiraron los 26 textos explicativos señalados por el usuario y se redujo el peso visual de cabecera, tarjetas y tablas.

El documento de cierre está en [`docs/sprint-vi`](../docs/sprint-vi/).
