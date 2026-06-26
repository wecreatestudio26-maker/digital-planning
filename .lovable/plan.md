## Validación de licencia Gumroad para registro de OWNER

Flujo: el comprador adquiere el producto en Gumroad → Gumroad le envía un correo con la **license key** → al registrarse en la app introduce esa clave; la app la valida contra la API de Gumroad, la consume (incrementa el contador de usos para evitar reutilización), crea la cuenta, asigna el usuario como OWNER de una nueva organización y guarda la licencia vinculada a su user_id. Las siguientes veces inicia sesión normal sin volver a pedir la clave.

### 1. Base de datos (migración)

Nueva tabla `public.gumroad_licenses`:

- `id uuid pk`
- `license_key text unique not null` (clave Gumroad)
- `user_id uuid references auth.users(id) on delete set null` (nulo hasta canjearse)
- `email text` (email reportado por Gumroad)
- `product_id text`, `product_permalink text`, `sale_id text`, `purchase_id text`
- `uses int default 0`
- `redeemed_at timestamptz`
- `raw jsonb` (respuesta completa de Gumroad para auditoría)
- `created_at`, `updated_at`

RLS:
- Sin acceso para `anon`. `authenticated` SELECT solo su propia fila (`user_id = auth.uid()`). Sin INSERT/UPDATE/DELETE desde el cliente (se maneja vía server fn con service role).
- GRANT SELECT a `authenticated`, GRANT ALL a `service_role`.

Modificar `handle_new_user_org` (o el trigger de creación de organización): si el `raw_user_meta_data` del nuevo usuario **no** contiene `gumroad_license` marcado como válido, **no** crear organización ni membership OWNER automáticamente. Alternativa más limpia: dejar el trigger como está pero el registro solo será posible si el server fn de redención valida la licencia *antes* de llamar a `supabase.auth.signUp` (la licencia se valida server-side, luego se llama `supabaseAdmin.auth.admin.createUser` con `email_confirm: true` para no requerir verificación, y se marca la licencia como `redeemed`).

→ Elegimos la segunda alternativa: dejamos triggers existentes intactos. El server fn es la única vía de creación de cuentas OWNER en este momento.

### 2. Server function `redeemGumroadLicense` (pública, sin auth)

`src/lib/gumroad.functions.ts`:

- Input: `{ email, password, fullName, licenseKey, orgName? }` validado con Zod (email, password ≥ 8, licenseKey no vacía).
- Pasos en `.handler()`:
  1. `POST https://api.gumroad.com/v2/licenses/verify` con `product_id` (env `GUMROAD_PRODUCT_ID`) y `license_key`, **con `increment_uses_count=true`**. Si `success !== true` o `purchase.refunded`/`purchase.disputed`/`purchase.chargebacked` → error "Licencia inválida o reembolsada".
  2. Verificar que `email` introducido coincide (case-insensitive) con `purchase.email`. Si no, error "El correo no coincide con la compra".
  3. Cargar `supabaseAdmin` dinámicamente. Comprobar si ya existe fila en `gumroad_licenses` con esa `license_key` y `user_id` no nulo → error "Esta licencia ya fue canjeada".
  4. Crear usuario con `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name, org_name } })`. El trigger existente crea la organización + membership OWNER automáticamente.
  5. Upsert en `gumroad_licenses` con `user_id`, `redeemed_at = now()`, `raw = purchase`, `uses = purchase.uses`.
- Retorna `{ ok: true }`. El cliente luego hace `supabase.auth.signInWithPassword`.

Secreto necesario: `GUMROAD_PRODUCT_ID` (no secreto, pero se guarda como env para no hardcodear). La API de licencias de Gumroad **no requiere** access token (es pública por product_id). Si en el futuro se quiere usar la API privada se añadiría `GUMROAD_ACCESS_TOKEN`. Pediré `GUMROAD_PRODUCT_ID` con `add_secret`.

### 3. Frontend

**Modificar `src/routes/auth/register.tsx`**:

- Añadir paso/campo `licenseKey` (input requerido) y `fullName`.
- Texto explicativo: "Introduce la clave de licencia que recibiste por correo de Gumroad tras tu compra."
- Enlace "Cómpralo en Gumroad" → URL del producto (variable `VITE_GUMROAD_PRODUCT_URL`, opcional, si está vacío se oculta).
- En submit: llamar a `redeemGumroadLicense` (no a `signUp` directo). Si OK, hacer `signIn(email, password)` y redirigir a `/dashboard`. Si error, mostrar mensaje del server.
- Eliminar redirect a `/auth/check-email` ya que `email_confirm: true` salta verificación.

**Login** (`auth/login.tsx`) sin cambios — el usuario ya tiene cuenta y entra normalmente.

### 4. Gating de la app

Por ahora, el único camino para crear cuenta OWNER es vía licencia. Los miembros invitados (sistema de invitaciones existente) **no** necesitan licencia: ya se crean por `signUp` desde la página `/invite/$token`. Eso queda intacto.

Nota: este diseño asume que solo OWNERS pagan; los invitados acceden libres bajo la organización del OWNER. Si el usuario quiere licencias por asiento, lo reabordamos después.

### 5. Resumen de archivos

**Crear:**
- `supabase/migrations/<ts>_gumroad_licenses.sql` (tabla + RLS + grants)
- `src/lib/gumroad.functions.ts` (`redeemGumroadLicense`)

**Editar:**
- `src/routes/auth/register.tsx` (campo licencia, llamada al server fn)
- `src/hooks/useAuth.tsx` — opcional: añadir `signUpWithLicense` que envuelva la llamada.

**Secretos:**
- `GUMROAD_PRODUCT_ID` (te pediré que lo pegues — lo encuentras en la URL del producto en Gumroad → Settings → "Product ID"). Opcional: `VITE_GUMROAD_PRODUCT_URL` para mostrar el enlace de compra.

### Preguntas antes de implementar

1. ¿El `product_id` de Gumroad ya lo tienes a mano? ¿Lo guardo como secreto cuando me lo pases?
2. ¿Quieres que el correo de registro **deba** coincidir con el de la compra de Gumroad? (Recomendado, evita reventa de claves.)
3. ¿Una licencia = una cuenta para siempre? (Si el usuario pierde acceso a la cuenta, ¿se le permite re-canjear la misma licencia para crear otra? — por defecto **no**.)
