export function translateAuthError(message: string | undefined | null): string {
  if (!message) return "Ocurrió un error. Inténtalo de nuevo.";
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos";
  if (m.includes("email not confirmed")) return "Confirma tu email antes de iniciar sesión";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Ya existe una cuenta con este email";
  if (m.includes("too many requests") || m.includes("rate limit"))
    return "Demasiados intentos. Espera unos minutos";
  if (m.includes("email link is invalid") || m.includes("expired") || m.includes("invalid token"))
    return "El enlace expiró. Solicita uno nuevo";
  if (m.includes("password should be") || m.includes("password is too short"))
    return "La contraseña debe tener al menos 6 caracteres";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "Email inválido";
  return message;
}
