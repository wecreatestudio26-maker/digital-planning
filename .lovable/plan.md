# Plan de las 5 correcciones

Basado en tus respuestas: respaldo JSON en Supabase, importar fusiona por ID/nombre, PDF como reporte con tablas, auto-guardado en toda la app.

## 1. Botón Guardar global

- Nuevo hook `useAppSnapshot` que serializa todos los stores de Zustand (`activities`, `gantt`, `riesgos`, `presupuesto`, `plantillas`, `reuniones`, `auto-estados`, `reglas`, `recordatorios`, `extra-store`, `productivity-store`) a un JSON.
- Ya existe la tabla `user_app_state` (id, user_id, data jsonb, updated_at). Se usará esa; si falta alguna columna, migración menor.
- Server functions `saveSnapshot(data)` y `loadSnapshot()` con `requireSupabaseAuth`.
- Componente `SaveButton` en el header con estados: idle / saving (spinner) / saved ✓ (2s) / error (X + toast). Punto naranja parpadeante cuando hay `dirty=true`.
- Store `useDirty` que se marca al llamar cualquier setter (subscribiendo con `store.subscribe`).
- Auto-save cada 3 min si `dirty`, en toda la app autenticada.
- `beforeunload` con confirmación si hay cambios.
- Al cargar la app tras login: `loadSnapshot()` → hidrata cada store (con fallback a localStorage).

## 2. Gráficos

Wrapper `<Chart>` común y helpers:
- `ResponsiveContainer` con `minHeight: 320`, `width: 100%`.
- Filtrar `data.filter(d => d.value > 0)`; si vacío → placeholder "Sin datos para mostrar".
- Leyenda con `layout="vertical"` si >6 ítems, `layout="horizontal"` debajo si no.
- `Tooltip` custom con nombre real + valor + %.
- Dona: `labelLine={false}`, `outerRadius` acotado.
- Barras: `domain={[0, 'auto']}`, sólo positivos.
- Líneas: `connectNulls={false}`, `dot={{r:3}}`.

Aplicar a `dashboard.tsx`, `riesgos.tsx`, `presupuesto.tsx`, `equipo.tsx`, `carga.tsx`, `gantt.tsx`, `evaluacion.tsx` (si sobreviven).

## 3. Calendario — clic en día

- Refactor `calendario.tsx`: al hacer clic en celda (no drag), abre `<Sheet>` lateral derecho.
- Panel muestra fecha, lista de actividades del día (nombre, estado, asignado + botón editar). Sin actividades → "Sin actividades" + botón añadir.
- Editar: formulario inline con nombre, estado, fechas, asignado, prioridad, descripción usando el store `useActivities.update`.
- Añadir: reusa `ActivityForm` con `startDate/endDate` prellenados.
- Todo va al mismo store global (`activities-store`) → sincroniza automáticamente con dashboard/gantt/actividades.

## 4. Exportar / Importar

Botones en el header (`Download`, `Upload`) junto a Guardar.

**Exportar** — modal con:
- Formatos: JSON, CSV, PDF, Excel.
- Checkboxes: Actividades, Gantt, Reuniones, Equipo, Plantillas, Riesgos, Presupuesto.
- JSON: snapshot filtrado. CSV: por módulo, zip mental (un CSV por módulo si múltiples). Excel: workbook con hoja por módulo (usando la librería SheetJS ya presente). PDF: reporte con tablas usando `jspdf` + `jspdf-autotable` (ya en deps por export.ts existente).

**Importar** — modal con drag & drop (usar `<input type="file">` simple):
- Detecta extensión (.json/.csv/.xlsx). Parsea a arrays de objetos.
- Mapeo automático de campos multilenguaje (diccionario name/nombre/título → name, etc).
- Preview de 5 primeras filas + selector manual para campos no reconocidos.
- Validación (fechas ISO, estados válidos). Filas con error se muestran pero no bloquean.
- Fusión por ID/nombre: si existe por `id`, `update`; si existe por `name`+fechas, `update`; si no, `add`.
- Resumen final.

## 5. Matriz de riesgos

Refactor `riesgos.tsx`:
- Matriz 5x5 compacta (h-16 por celda), impacto arriba (1-5), probabilidad izquierda (1-5).
- Colores por nivel; celdas vacías con borde punteado.
- Leyenda debajo (Bajo/Medio/Alto/Crítico).
- Título con contador.
- Filtros: nivel, responsable, estado (Select).
- Clic en celda → `<Sheet>` lateral con lista de riesgos en esa coordenada + editar inline + eliminar + "+ Añadir riesgo" con prob/impacto prellenados.
- Gráfico resumen: 320px, `LabelList` con valor encima, filtrar niveles con 0, tooltip con nombres de riesgos.

## Detalles técnicos

- Nuevo archivo `src/lib/snapshot.ts` — serialize/deserialize.
- Nuevo `src/lib/snapshot.functions.ts` — server fns.
- Nuevo `src/hooks/useDirty.ts` + `src/hooks/useAutoSave.ts`.
- Nuevo `src/components/HeaderActions.tsx` (Save + Export + Import) montado en `__root.tsx`.
- Nuevo `src/components/charts/SafeChart.tsx` + helpers.
- Nuevo `src/components/ExportDialog.tsx`, `src/components/ImportDialog.tsx`.
- Migración menor si la tabla `user_app_state` no existe con la forma esperada.

## Orden de entrega

1. Migración/verificación de `user_app_state`.
2. Snapshot + Save button + dirty tracking + auto-save.
3. HeaderActions (Save primero, Export/Import esqueleto).
4. Refactor calendario (panel día).
5. Refactor riesgos (matriz + panel).
6. Wrapper de gráficos + aplicarlo.
7. Export/Import completo (modales + parsers).

¿Procedo?
