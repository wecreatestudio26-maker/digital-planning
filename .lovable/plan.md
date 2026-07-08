# Sistema de códigos de validación (estilo Home Budget)

Replicar el flujo de Home Budget en este proyecto: códigos XXXX-XXXX-XXXX de uso único, panel admin, webhook Hotmart y compatibilidad con licencias Gumroad.

## 1. Base de datos

Nueva tabla `access_codes`:
- `code` (texto, único, formato `XXXX-XXXX-XXXX`)
- `source` (`hotmart` | `gumroad` | `manual`)
- `email_buyer` (correo del comprador, opcional para manual)
- `status` (`active` | `redeemed` | `revoked`)
- `redeemed_by_user_id` (uuid, null hasta canje)
- `redeemed_at`, `created_at`, `updated_at`
- `metadata` jsonb (payload original de Hotmart / Gumroad)

RLS:
- Solo admin puede ver/gestionar todos.
- Función `redeem_access_code(code, user_id)` `SECURITY DEFINER` que marca el código como canjeado atomically.
- `GRANT` correspondientes.

Se conserva `gumroad_licenses` existente pero el registro nuevo pasa a usar `access_codes` (los códigos Gumroad se insertan al momento de canjear vía verificación API).

## 2. Registro con código

Modificar `src/routes/auth/register.tsx` + `src/lib/gumroad.functions.ts`:
- Un solo campo "Código de acceso".
- Nueva server function `redeemAccessCode`:
  1. Si el formato es `XXXX-XXXX-XXXX` → buscar en `access_codes` (Hotmart o manual). Debe estar `active`.
  2. Si no → tratarlo como licencia Gumroad: verificar contra API Gumroad (lógica existente) e insertar/actualizar fila en `access_codes` con `source='gumroad'` marcada como redeemed en el mismo paso.
  3. Crear usuario con `supabaseAdmin.auth.admin.createUser` (email_confirm true).
  4. Marcar código `redeemed`.

## 3. Webhook Hotmart

Nueva ruta pública `src/routes/api/public/hotmart-webhook.ts`:
- Verificar `hottok` (secreto de Hotmart) via header/body.
- En eventos `PURCHASE_APPROVED` / `PURCHASE_COMPLETE`:
  - Generar código único `XXXX-XXXX-XXXX`.
  - Insertar en `access_codes` (`source='hotmart'`, email del comprador).
  - Enviar correo vía Resend (conector ya instalado) desde `noreply@we-create-studio.com` con el código.
- Idempotente por `transaction_id` (guardado en metadata).

Secretos requeridos: `HOTMART_HOTTOK` (usuario lo aporta).

## 4. Panel admin

Nueva ruta `/_authenticated/admin/codigos.tsx`:
- Visible solo si `user.email === 'wecreatestudio26@gmail.com'` (además del rol admin).
- Ítem en `AppSidebar` con icono 🔑, condicionado por el email.
- Funcionalidades:
  - Listar códigos (filtro por estado, source, buscar por email/código).
  - Generar código manual (con email opcional).
  - Revocar código.
  - Reenviar código por correo.
- Server functions con `requireSupabaseAuth` + comprobación email/rol.

## 5. Detalles técnicos

- Generación de código: 12 chars base32 sin caracteres ambiguos (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), formateado como 4-4-4.
- Envío de correos: usar gateway Resend (`RESEND_API_KEY` ya configurado). Plantilla HTML simple con branding.
- URL pública estable para el webhook Hotmart: `https://project--c1a07425-ecde-4430-84f5-193060030c23.lovable.app/api/public/hotmart-webhook`.

## Lo que necesitas proporcionar

1. **`HOTMART_HOTTOK`** — token secreto de tu producto en Hotmart (Herramientas → Webhook). Te lo pediré por el formulario seguro.
2. Confirmar que el dominio `we-create-studio.com` está verificado en Resend para poder enviar desde `noreply@…`. Si aún no lo está, te indico cómo verificarlo.

¿Procedo?
