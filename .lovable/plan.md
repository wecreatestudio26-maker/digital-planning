# Plan: 16 nuevos módulos para el Planeador

Es un alcance grande. Lo entrego en una sola implementación, manteniendo el diseño actual (sidebar oscuro, acento verde) y usando Zustand con persistencia en localStorage para todo el estado.

## Arquitectura

- Un nuevo store `src/lib/productivity-store.ts` que agrupa los datos de los 16 módulos (hábitos, time tracking, evaluaciones, miembros, reuniones, sprints, roadmap, plantillas, recordatorios, reglas, logs de cambios).
- Reutilizo `activities-store` y `extra-store` existentes; las nuevas vistas leen de ellos cuando aplica (Kanban, OKR, presupuesto, riesgos).
- Sidebar se reorganiza con grupos colapsables por categoría para no saturar.

## Rutas nuevas (src/routes/)

Productividad
- `habitos.tsx` — registro diario, racha, heatmap mensual, vínculo a OKR
- `tiempo.tsx` — temporizador start/pause/stop + entrada manual + resumen diario/semanal
- `evaluacion.tsx` — review semanal (auto-genera entrada cada domingo), score 1-10, tendencia
- `enfoque.tsx` — modo enfoque pantalla completa con checklist + temporizador (oculta sidebar)

Seguimiento
- `estimado-vs-real.tsx` — tabla comparativa con % variación, rojo si >20%
- `velocidad.tsx` — line chart de tareas completadas últimas 8 semanas
- `alertas.tsx` — listado de inactividad (3/7/5 días)

Colaboración
- `equipo.tsx` — miembros con roles (admin/editor/viewer), invitación por correo (mock), permisos por módulo
- `carga.tsx` — workload por persona con semáforo verde/amarillo/rojo
- `reuniones.tsx` — agenda, actas, acuerdos → botón "convertir en tarea"

Planificación
- `roadmap.tsx` — bloques por trimestre/año arrastrables con % y color por estado
- `sprints.tsx` — backlog, sprint activo, burndown chart, retrospectiva
- `plantillas.tsx` — 3 prediseñadas (lanzamiento, marketing, software) + crear/aplicar

Automatización
- `recordatorios.tsx` — config X días antes deadline, 30 min antes reunión, weekly review
- `auto-estados.tsx` — toggles para reglas automáticas + log de cambios
- `reglas.tsx` — motor "si esto → entonces esto" con condiciones/acciones predefinidas

## Sidebar

`AppSidebar.tsx` se reescribe con secciones agrupadas:
- General (Dashboard, Calendario, Actividades)
- Gestión (Gantt, Riesgos, Presupuesto, OKR)
- Productividad (Hábitos, Tiempo, Evaluación, Enfoque)
- Seguimiento (Est. vs Real, Velocidad, Alertas)
- Colaboración (Equipo, Carga, Reuniones)
- Planificación (Roadmap, Sprints, Plantillas)
- Automatización (Recordatorios, Auto-estados, Reglas)

Se quita el item "Actividades" duplicado actual.

## Detalles técnicos

- Heatmap de hábitos: grid CSS 7×N con tonos de verde por intensidad.
- Temporizador: `useEffect` + `setInterval`, persiste sesión activa.
- Modo enfoque: ruta `/enfoque?taskId=` que el layout root detecta para ocultar sidebar.
- Burndown / velocidad: recharts (ya instalado).
- Roadmap drag: HTML5 drag nativo (no añado libs).
- Cambio automático de estados: efecto en el store que evalúa al montar la app y registra entradas en `changeLog`.
- Motor de reglas: lista declarativa `{ when: {...}, then: {...} }` evaluada al cargar y al mutar.

## Persistencia

Todo en `localStorage` bajo claves `planeador-productivity`, `planeador-team`, `planeador-sprints`, etc. No se toca backend.

¿Procedo con la implementación completa?
