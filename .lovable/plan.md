## Sistema de invitaciones por email para Equipo

Implementaré el flujo completo de invitación con envío de correo vía Resend, página de aceptación pública, y RBAC por módulo.

### 1. Base de datos (migración)

Ya existe `organization_invites`. Lo extiendo y añado lo necesario:

- Añadir columnas a `organization_invites`: `name text`, `permissions jsonb default '{}'::jsonb`, `status text default 'pending'` (`pending|accepted|expired|revoked`).
- Función `accept_org_invite(_token uuid, _user_id uuid)` (SECURITY DEFINER): valida token vigente y `status='pending'`, inserta en `organization_members` con rol+permisos, marca `accepted_at=now()` y `status='accepted'`. Devuelve `org_id`.
- GRANTs ya existentes en la tabla; añadir `GRANT EXECUTE ON FUNCTION accept_org_invite TO authenticated`.
- Política RLS para permitir al invitado leer su propia invitación por token (lectura pública vía RPC, no SELECT directo — el RPC se encarga).

### 2. Conector Resend

Verificar/conectar Resend (`standard_connectors--connect` si no está). El correo se envía desde un server function vía gateway:
`https://connector-gateway.lovable.dev/resend/emails` usando `LOVABLE_API_KEY` + `RESEND_API_KEY`.

Plantilla HTML simple con marca, rol asignado y botón → `${origin}/invite/{token}`.

### 3. Server functions (`src/lib/org.functions.ts`)

- Reescribir `inviteMember` para:
  - Validar caller con `requireSupabaseAuth` y rol OWNER/ADMIN (`has_org_role`).
  - Insertar invitación con `name`, `email`, `role`, `permissions`, `token=gen_random_uuid()`, `expires_at=now()+7d`.
  - Llamar a Resend con el enlace.
- Nueva `getInviteByToken({ token })` — pública (sin middleware) — devuelve `{ email, role, org_name, status, expired }` usando cliente publishable + RPC `get_invite_public(_token)` (SECURITY DEFINER, solo lectura segura).
- Nueva `acceptInvite({ token })` — con `requireSupabaseAuth` — llama al RPC `accept_org_invite`.

### 4. Frontend

**Modal "Invitar miembro"** (en `equipo.tsx`): añadir campos `Nombre`, `Permisos por módulo` (checkboxes por módulo: `calendario`, `equipo`, `presupuesto`, `categorias`, `productividad` × `view|edit`).

**Página pública `/invite/$token.tsx`** (top-level, no `_authenticated`):
- Carga invitación con `getInviteByToken`.
- Si no hay sesión: formulario email (prellenado, readonly) + contraseña → `supabase.auth.signUp` → `acceptInvite`.
- Si hay sesión con email distinto: error.
- Si hay sesión con email correcto: botón "Aceptar invitación" → `acceptInvite` → redirige a `/`.
- Tras aceptar: invalida queries de org y navega a `/`.

### 5. RBAC

- Extender `src/lib/permissions.ts`:
  - `can(role, action)` ya existe.
  - Añadir `canModule(role, permissions, module, level)` donde `level='view'|'edit'`.
  - Reglas: OWNER/ADMIN → todo. EDITOR → `edit` salvo si `permissions[module]` lo restringe. VIEWER → solo `view`.
- Hook `useOrgRole` ya devuelve `role`; añadir `permissions` del miembro actual.
- Sidebar (`AppSidebar.tsx`): ocultar items según `canModule`.
- Rutas `_authenticated/*` afectadas (`presupuesto`, `equipo`, `categorias`): añadir gate en componente que muestra "Sin acceso" si `!canModule(..., 'view')`.
- Botones de crear/editar/eliminar: condicionales por `canModule(..., 'edit')`.

### 6. Email enviado por Resend

```
From: Lovable App <onboarding@resend.dev>
Subject: Te han invitado a {org_name}
HTML: nombre, rol, botón con URL https://{origin}/invite/{token}, expira en 7 días
```

`origin` viene del request header en el server fn (`getRequestHeader('origin')`).

### Archivos a crear/editar

**Migración SQL:** extender `organization_invites` + RPC `accept_org_invite` y `get_invite_public`.

**Crear:**
- `src/routes/invite.$token.tsx` (pública)
- `src/components/InviteMemberDialog.tsx` (extraer del equipo.tsx)

**Editar:**
- `src/lib/org.functions.ts` (inviteMember con Resend, getInviteByToken, acceptInvite)
- `src/lib/permissions.ts` (canModule)
- `src/hooks/useOrgRole.ts` (incluir permissions)
- `src/routes/_authenticated/equipo.tsx` (UI permisos por módulo)
- `src/routes/_authenticated/presupuesto.tsx`, `categorias.tsx` (gate RBAC)
- `src/components/AppSidebar.tsx` (ocultar items)

### Dependencias / secretos

- Conector **Resend** (gateway). Pediré aprobación para conectarlo si no está enlazado.
- `LOVABLE_API_KEY` ya está.
- Sin nuevos paquetes npm.

¿Procedo?
