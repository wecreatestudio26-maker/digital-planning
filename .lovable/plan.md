# Plan de mejoras (5 cambios)

## 1. Volver a la portada desde el Dashboard
- **Header** (`src/routes/__root.tsx`): convertir el logo/título "Digital Planning" en un `<Link to="/">` clicable.
- **Sidebar** (`src/components/AppSidebar.tsx`): añadir al final un ítem **Portada** (icono `Home`) que enlaza a `/`.

## 2. Idioma global y persistente
- Instalar `i18next` + `react-i18next` + `i18next-browser-languagedetector`.
- Crear `src/i18n/index.ts` con 4 namespaces (ES/EN/FR/IT) y persistencia en `localStorage` (clave `app-lang`).
- Mover el selector de idioma actual (portada) a un componente `LanguageSwitcher` reutilizable, montado en:
  - Header de la portada (donde ya está).
  - Header del layout autenticado.
- Traducir: sidebar (todos los ítems del menú), header, dashboard, calendario (encabezados, botones Hoy/Anterior/Siguiente, vistas Mes/Semana), formulario de actividad (labels, placeholders, botones), portada (sustituye el `useState` actual por `useTranslation`).
- Otras páginas (Gantt, Equipo, etc.) reciben solo el título traducido en esta iteración; el contenido interno queda para una pasada futura — lo dejaré documentado en `.lovable/plan.md`.

## 3. Responsable visible en cada actividad del calendario
- En `src/routes/_authenticated/calendario.tsx`, debajo del nombre de la actividad renderizar un mini-row: `Avatar` (iniciales del responsable, color derivado del hash del nombre) + nombre en `text-xs text-muted-foreground`.
- Si no hay responsable asignado, no se muestra nada.

## 4. Botón **Hoy** funcional
- En el calendario, el botón Hoy debe:
  1. Reposicionar el calendario en el mes/semana actual.
  2. Hacer scroll suave hasta la celda del día actual.
  3. Resaltar las actividades de hoy con un anillo/ring temporal (~2s).
- Implementación: `setCurrentDate(new Date())` + `scrollIntoView` sobre `[data-date="YYYY-MM-DD"]`.

## 5. Categorías y responsables creables desde el formulario
- **Backend** (migración Lovable Cloud):
  - Tabla `categories(id, user_id, name, color, created_at)` — RLS por `user_id`, GRANTs estándar.
  - Tabla `team_members(id, user_id, full_name, email, role, avatar_color, created_at)` — RLS por `user_id`.
  - Trigger seed opcional: al primer login, sembrar categorías por defecto (Trabajo, Estudio, Reuniones, Proyecto).
- **Server functions** (`src/lib/catalog.functions.ts`):
  - `listCategories`, `createCategory`
  - `listTeamMembers`, `createTeamMember`
  - Todas con `requireSupabaseAuth`.
- **Formulario** (`src/components/ActivityForm.tsx`):
  - Reemplazar el `<Input>` de categoría por un `<Combobox>` (Command + Popover) con las categorías de la BD; opción "➕ Crear categoría…" abre un mini-modal (nombre + color).
  - Reemplazar el `<Input>` de responsable por el mismo patrón con `team_members`; opción "➕ Añadir a Equipo…" crea miembro (nombre + email opcional).
  - Tras crear, refrescar la lista con `queryClient.invalidateQueries` y autoseleccionarlo.
- **Página Equipo**: pasará a leer/escribir desde `team_members` en una iteración futura (fuera de este plan para no expandirlo); por ahora el formulario crea miembros que aparecerán cuando esa página se migre.

## Notas técnicas
- Las actividades siguen en localStorage (zustand). Solo categorías y responsables se persisten en BD; las actividades almacenan el nombre como string (compat hacia atrás).
- i18n inicializado del lado cliente; SSR seguirá renderizando en ES por defecto y se hidratará al idioma persistido (evita flicker con `suppressHydrationWarning` en `<html>`).
- El bug de build previo ya quedó resuelto al alinear versiones de `@tanstack/react-router` y `@tanstack/react-start`.

## Archivos principales a tocar
- `src/routes/__root.tsx`, `src/components/AppSidebar.tsx`
- `src/routes/index.tsx` (portada)
- `src/i18n/index.ts` (nuevo) + `src/i18n/locales/{es,en,fr,it}.json`
- `src/components/LanguageSwitcher.tsx` (nuevo)
- `src/routes/_authenticated/calendario.tsx`
- `src/components/ActivityForm.tsx`
- `src/lib/catalog.functions.ts` (nuevo)
- Migración SQL: `categories` + `team_members`