# Sistema de Organizaciones y Roles

## Resumen
Añadir un modelo de **organizaciones** con membresías y roles jerárquicos (OWNER, ADMIN, EDITOR, VIEWER). El primer usuario que se registra crea automáticamente una organización y queda como OWNER. Se reemplaza la página actual `Equipo` (basada en `localStorage`) por una gestión real respaldada por Lovable Cloud.

## 1. Base de datos (migración)

Nuevas tablas y tipos:

- **enum `org_role`**: `'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER'`
- **`organizations`**: `id`, `name`, `owner_id` (uuid → auth.users), `created_at`. Único `owner_id` activo por organización (UNIQUE parcial sobre `owner_id`).
- **`organization_members`**: `id`, `org_id`, `user_id`, `role org_role`, `is_owner bool`, `invited_by`, `created_at`. UNIQUE `(org_id, user_id)`. UNIQUE parcial `(org_id) WHERE is_owner = true` ⇒ un único OWNER por organización.
- **`organization_invites`**: `id`, `org_id`, `email`, `role`, `token`, `invited_by`, `expires_at`, `accepted_at`.

Funciones SECURITY DEFINER (evitan recursión en RLS):
- `get_user_org(uuid) → uuid`
- `has_org_role(_user uuid, _org uuid, _roles org_role[]) → bool`
- `is_org_owner(_user uuid, _org uuid) → bool`

Trigger sobre `auth.users` (extiende `handle_new_user`):
1. Crear `organizations` con `owner_id = NEW.id`, `name = coalesce(meta.org_name, email_local_part)`.
2. Insertar membresía `role='OWNER'`, `is_owner=true`.

GRANTs a `authenticated` y `service_role` en todas las tablas nuevas.

## 2. RLS (resumen en lenguaje claro)

- **organizations**: miembros ven su organización; sólo OWNER puede actualizar nombre; sólo OWNER puede eliminar.
- **organization_members**:
  - SELECT: cualquier miembro de la org.
  - INSERT/UPDATE/DELETE: OWNER o ADMIN, **excepto** que nadie (ni OWNER) puede borrar la fila marcada `is_owner=true`; sólo se elimina vía “transferencia de propiedad”.
  - Sólo OWNER puede asignar/cambiar el rol `OWNER` (transferencia).
- **organization_invites**: gestión por OWNER/ADMIN; SELECT por email coincidente para aceptar.

## 3. Transferencia de propiedad

Función `transfer_ownership(_org uuid, _new_owner uuid)` (SECURITY DEFINER):
- Verifica que el llamante es el OWNER actual.
- En una transacción: `UPDATE` la membresía actual a `role='ADMIN', is_owner=false` y la del nuevo usuario a `role='OWNER', is_owner=true`; actualiza `organizations.owner_id`.
- Mantiene el invariante de un único OWNER (restricción UNIQUE parcial).

## 4. Server functions (`src/lib/org.functions.ts`)

Todas con `requireSupabaseAuth`:
- `getMyOrganization()` – devuelve org + rol del usuario actual.
- `listMembers()` – lista miembros con perfil (full_name/email).
- `inviteMember({ email, role })` – sólo OWNER/ADMIN; crea invite + email opcional.
- `updateMemberRole({ memberId, role })` – OWNER puede todo; ADMIN sólo entre EDITOR/VIEWER; nunca tocar OWNER.
- `removeMember({ memberId })` – bloquea borrar OWNER.
- `transferOwnership({ newOwnerUserId })` – sólo OWNER actual, vía RPC.
- `renameOrganization({ name })` – sólo OWNER.

## 5. Frontend

- **Hook `useOrgRole()`**: lee la membresía actual (cache vía React Query) y expone `role`, `isOwner`, `can(action)`.
- **Helper `can.ts`**: matriz de permisos (invite, changeRole, removeMember, transferOwner, manageBilling, manageProjects).
- **Sidebar / rutas**: ítems sensibles (Equipo, Presupuesto, etc.) ocultos para VIEWER; opciones de billing sólo OWNER.
- **`/_authenticated/equipo`** (reescritura):
  - Tabla de miembros desde DB (`listMembers`).
  - Badge de rol con color; el OWNER muestra ícono ⭐ y no es editable salvo por OWNER (transferencia).
  - Botón “Invitar miembro” → diálogo (email + rol). Roles seleccionables dependen del rol del usuario.
  - Acciones por fila: cambiar rol (Select), eliminar (icono trash). Deshabilitadas según permisos.
  - Sección extra visible sólo al OWNER: **Transferir propiedad** (Select de miembros + confirmación de doble paso).
  - Eliminada la dependencia de `productivity-store` para miembros; se mantiene sólo para el resto (hábitos, etc.).
- **i18n**: añadir claves `team.*` y `roles.*` en los 4 locales existentes.

## 6. Onboarding del primer usuario

El trigger en `auth.users` ya cubre el “primer usuario = OWNER de su nueva org”. Para usuarios invitados después, el flujo de aceptar invitación (`/auth/accept-invite?token=...`) los añade como miembros con el rol indicado en lugar de crear una organización nueva. (Página de aceptación es una mejora futura; en esta entrega, las invitaciones se registran y aparecen como pendientes; la aceptación automática queda como TODO documentado.)

## 7. Detalles técnicos

- `app_role` existente (`admin/user`) **no se toca**: sigue siendo el rol global de la app (acceso al panel admin de Lovable). El nuevo `org_role` es ortogonal y aplica dentro de la organización.
- Todas las consultas de miembros/categorías/equipos seguirán filtradas por `user_id` como hoy; en una iteración futura se migrarán a `org_id` para compartir datos entre miembros. Esto se documenta como deuda.
- Tipos Supabase se regeneran automáticamente tras la migración.

## 8. Archivos a tocar/crear

- `supabase/migrations/<ts>_organizations.sql` (nueva).
- `src/lib/org.functions.ts` (nuevo).
- `src/lib/permissions.ts` (nuevo – matriz `can`).
- `src/hooks/useOrgRole.ts` (nuevo).
- `src/routes/_authenticated/equipo.tsx` (reescrito).
- `src/components/AppSidebar.tsx` (gating por rol).
- `src/i18n/locales/*.json` (claves nuevas).
