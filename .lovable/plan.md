# Guardar en la nube por usuario

## Qué obtendrás

- Un botón **Guardar** visible en la barra superior (junto al selector de idioma).
- Al pulsarlo, **toda tu información** de la app (actividades, hábitos, tiempo, presupuesto, riesgos, evaluaciones, reglas, recordatorios, plantillas, equipo, reuniones, etc.) se guarda en tu cuenta en la nube.
- Cuando vuelves a entrar desde **cualquier dispositivo**, la app **carga automáticamente** tu última versión guardada y puedes continuar donde lo dejaste.
- Indicador visual: "Guardado hace X minutos" / "Cambios sin guardar" / spinner mientras sincroniza.
- Opcional: **auto-guardado** cada vez que cambias algo (debounce 5 s), además del botón manual.

## Cómo funciona (resumen técnico)

Toda la app ya usa Zustand con `persist` (localStorage). En vez de migrar cada store a su propia tabla SQL (semanas de trabajo y riesgo de romper la UI), uso un enfoque **snapshot JSON por usuario**:

1. **Nueva tabla** `user_app_state` en la base de datos:
   - `user_id` (PK, FK → auth.users)
   - `payload` (jsonb) — contiene el snapshot serializado de todos los stores
   - `version` (int) — para detectar conflictos
   - `updated_at` (timestamptz)
   - RLS estricto: cada usuario solo lee/escribe su propia fila.
   - GRANTs a `authenticated`.

2. **Server functions** (`src/lib/sync.functions.ts`) con `requireSupabaseAuth`:
   - `saveUserState({ payload, version })` → upsert.
   - `loadUserState()` → devuelve `{ payload, version, updatedAt }` o `null`.

3. **Cliente** (`src/lib/sync.ts`):
   - `collectSnapshot()` lee los 3 stores Zustand (`activities`, `productivity`, `extra`) y los empaqueta.
   - `applySnapshot(payload)` rehidrata los stores con `setAll`.
   - Hook `useCloudSync()` expone `{ save, load, status, lastSavedAt, isDirty }`.

4. **Botón Guardar** en `AppSidebar` / topbar:
   - Estados: idle / saving / saved / error / dirty.
   - Icono `Cloud` / `CloudOff` / `CloudCheck` con texto.
   - Toast en éxito y error.

5. **Carga inicial**: en `_authenticated/route.tsx` (o un wrapper provider) después de confirmar sesión, llamar `load()` una vez y aplicar el snapshot si la versión remota es más nueva que la local.

6. **Detección de cambios**: suscribirse a los stores con `store.subscribe` y marcar `isDirty = true` para activar el botón visualmente.

## Limitaciones honestas

- Es un **snapshot completo**, no edición colaborativa en tiempo real. Si abres la app en dos dispositivos y editas en ambos, gana el último que guarde (te mostraré aviso si la versión remota cambió).
- El payload puede crecer; sin problema hasta ~1 MB (miles de actividades).
- Migrar a tablas relacionales por entidad se puede hacer después si lo necesitas (por ejemplo, para filtros server-side o compartir datos entre usuarios).

## Pasos de implementación

1. Migración SQL: tabla `user_app_state` + RLS + GRANTs.
2. `src/lib/sync.functions.ts` con `saveUserState` / `loadUserState`.
3. `src/lib/sync.ts` con `collectSnapshot` / `applySnapshot` / `useCloudSync`.
4. Botón `SaveButton.tsx` integrado en `AppSidebar`.
5. Carga inicial al entrar a `/_authenticated/*`.
6. Traducciones del botón (es/en/fr/it).

¿Procedo con este plan, o prefieres que active **auto-guardado silencioso** (sin botón visible) en vez del botón manual?
