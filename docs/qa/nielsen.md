# Evaluación heurística de Finvora — Nielsen

Evaluar la versión del commit indicado en GitHub Actions. Las comprobaciones US son evidencia parcial automatizada, no una certificación de las heurísticas completas. Los hallazgos axe corresponden a accesibilidad WCAG A/AA automatizable, no a toda la norma. Registrar evaluador, fecha, dispositivo, tarea, evidencia, severidad y recomendación.

| Heurística | Evidencia automática parcial | Revisión humana pendiente |
|---|---|---|
| H1 Visibilidad del estado del sistema | US-01 | Cargas, confirmaciones y estados en cada módulo |
| H2 Correspondencia con el mundo real | — | Comprensión de términos financieros por usuarios objetivo |
| H3 Control y libertad del usuario | US-02 | Cancelación, retorno y recuperación de acciones |
| H4 Consistencia y estándares | US-04 | Convenciones, etiquetas y componentes entre módulos |
| H5 Prevención de errores | US-03 | Validación de importes, fechas y confirmaciones |
| H6 Reconocimiento antes que recuerdo | US-04 | Encontrabilidad de funciones y opciones |
| H7 Flexibilidad y eficiencia de uso | US-05 | Tiempo y esfuerzo en tareas repetidas |
| H8 Diseño estético y minimalista | US-06 | Jerarquía visual y carga cognitiva |
| H9 Reconocer, diagnosticar y recuperarse de errores | US-03 | Claridad y utilidad de mensajes ante fallos |
| H10 Ayuda y documentación | — | Disponibilidad y suficiencia de orientación |

## Protocolo manual

Realizar tareas con una cuenta de prueba: iniciar sesión, buscar un producto, filtrar reportes, generar una proyección, interpretar métricas y navegar desde móvil. No usar datos de producción. Clasificar cada hallazgo de 0 (no problema) a 4 (problema crítico), considerando frecuencia, impacto y persistencia. No asignar notas sin observación.

| ID | Heurística | Tarea | Hallazgo | Evidencia | Severidad 0–4 | Recomendación |
|---|---|---|---|---|---|---|
| Pendiente | | | | | | |

Las auditorías automáticas se ejecutan con datos sintéticos. Las reglas que axe clasifica como incompletas requieren revisión humana. Un resultado sin infracciones automáticas no implica conformidad WCAG completa ni satisfacción de usuarios.
