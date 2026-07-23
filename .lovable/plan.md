## Alcance

Aplicar 4 correcciones al proyecto existente. Todas usan los stores ya presentes (`activities-store`, `extra-store`) para que Calendario ↔ Actividades ↔ Gantt ↔ Dashboard queden sincronizados en tiempo real.

---

## 1. Gráficos (Corrección 2)

Crear helpers en `src/lib/chart-utils.ts`:
- `filterPositive(data)` — quita valores ≤ 0.
- `<EmptyChart />` — bloque "Sin datos para mostrar".
- Wrapper `<ChartFrame>` con `min-h-[320px] w-full`, leyenda debajo/al lado, tooltip custom con nombre + valor + %.

Actualizar los gráficos existentes en:
- `dashboard.tsx` (barras por categoría, dona por estado)
- `riesgos.tsx` (barras resumen)
- `presupuesto.tsx` (barras y línea de flujo)
- `carga.tsx`, `evaluacion.tsx`, `habitos.tsx` (si aplica)

Reglas aplicadas por tipo:
- Dona: leyenda vertical si > 6 elementos, sin segmentos = 0.
- Barras: `domain=[0, auto]`, solo > 0.
- Línea: `connectNulls={false}`, puntos visibles.

Etiquetas/tooltips muestran siempre el nombre real del dato (categoría, estado, riesgo, tarea, etc.).

---

## 2. Calendario — clic en día (Corrección 3)

En `calendario.tsx`:
- Nuevo `<Sheet>` lateral derecho abierto al clic en celda de día.
- Encabezado con fecha localizada + contador.
- Estado vacío: "Sin actividades" + botón "+ Añadir actividad".
- Lista de actividades del día: nombre, badge de estado, asignado + botón editar y eliminar.
- Edición inline con formulario reutilizando `ActivityForm` (fecha inicio prellenada al día).
- Añadir usa mismo formulario con fecha prellenada.
- Todo pasa por `useActivities` (Zustand) — no duplica datos, así Actividades/Gantt/Dashboard se refrescan automáticamente.

También ya está el botón "Hoy" (Corrección anterior), verificar que sigue funcionando.

---

## 3. Exportar / Importar (Corrección 4)

Nuevo componente `src/components/ExportImportBar.tsx` renderizado en el header del layout `_authenticated/route.tsx` (o en dashboard según sea global).

**Exportar** — modal:
- Formato: JSON | CSV | PDF | Excel (radio).
- Contenido (checkboxes): Actividades, Gantt/Proyectos, Reuniones, Equipo, Plantillas.
- Reusa `exportToPDF/exportToExcel`; añade `exportToJSON` y `exportToCSV` en `src/lib/export.ts`.

**Importar** — modal:
- Drag & drop + input `.json .csv .xlsx`.
- Parser con `xlsx` / `PapaParse` (ya está `xlsx`).
- Auto-mapeo por sinónimos multi-idioma (`name|nombre|título`, `due date|fecha límite|fecha fin`, `status|estado`, `assignee|responsable|asignado`, `priority|prioridad|priorité`, `category|categoría|categorie`).
- Campos no reconocidos → dropdown manual por columna.
- Preview 5 primeras filas.
- Validación de fechas/estados/obligatorios; filas inválidas se muestran y se saltan (no cancelan).
- Confirmación de sobrescritura si el store ya tiene datos.
- Al confirmar, mergea al store global → visible en todos los módulos.
- Resumen: "X actividades importadas, Y proyectos importados".

Desktop muestra icono + texto, móvil solo icono (Tailwind `hidden sm:inline`).

---

## 4. Matriz de riesgos (Corrección 5)

Reescribir `riesgos.tsx`:
- Título con contador `Riesgos ({total})`.
- Filtros arriba (nivel, responsable, estado) — combos.
- Matriz 5×5 más compacta: celdas `aspect-square max-h-16` para caber sin scroll.
- Eje horizontal arriba con "Impacto 1–5", eje vertical izquierdo "Probabilidad 1–5".
- Celdas vacías: fondo opaco + borde `border-dashed`.
- Leyenda debajo: chips Bajo/Medio/Alto/Crítico.
- Clic en celda → `<Sheet>` lateral:
  - Lista de riesgos en esa coordenada con nombre, nivel, responsable, editar (form inline), eliminar.
  - Estado vacío: "Sin riesgos aquí" + "+ Añadir riesgo" prellenando prob/impact.
- Gráfico resumen: altura 320px, `<LabelList>` con número encima, solo niveles > 0, tooltip con lista de riesgos.
- Añadir campo `assignee` a `Risk` en `extra-store.ts` (opcional para no romper datos existentes).

---

## Detalles técnicos

- No modificar el schema de Supabase (todos los datos afectados son locales / Zustand).
- Traducciones nuevas se agregan a los 4 archivos i18n (`es/en/fr/it`) bajo namespaces existentes.
- Sin cambios en autenticación, permisos ni facturación.
- Verificar con `tsgo` al terminar.

## Archivos que se crearán o editarán

**Nuevos:** `src/lib/chart-utils.tsx`, `src/components/ExportImportBar.tsx`, `src/components/DayActivitiesSheet.tsx`, `src/components/RiskCellSheet.tsx`.

**Editados:** `src/routes/_authenticated/{dashboard,calendario,riesgos,presupuesto,carga,evaluacion,habitos,route}.tsx`, `src/lib/{export.ts,extra-store.ts}`, `src/i18n/locales/{es,en,fr,it}.json`.