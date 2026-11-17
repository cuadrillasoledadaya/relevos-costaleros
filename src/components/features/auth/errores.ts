export type ErrorAuth = {
  message?: string | null;
  code?: string | null;
  status?: number | null;
};

/** Convierte errores técnicos de Supabase en mensajes accionables en español. */
export function mensajeErrorAcceso(error: unknown): string {
  const detalle = error as ErrorAuth | null;
  const mensaje = detalle?.message?.toLowerCase() ?? "";

  if (detalle?.code === "user_not_found" || /user not found/.test(mensaje)) {
    return "Ese correo no está registrado.";
  }
  if (/invalid login credentials/.test(mensaje)) {
    return "Ese correo no está registrado o la contraseña es incorrecta.";
  }
  if (/email not confirmed/.test(mensaje)) {
    return "Confirma tu correo antes de iniciar sesión.";
  }
  if (/user already registered|already been registered/.test(mensaje)) {
    return "Ese correo ya está registrado.";
  }
  if (/password/.test(mensaje)) {
    return "La contraseña no cumple los requisitos de acceso.";
  }
  if (/rate limit|too many requests/.test(mensaje)) {
    return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
  }
  if (/network|fetch/.test(mensaje)) {
    return "No hemos podido conectar con Supabase. Comprueba tu conexión.";
  }

  return "No hemos podido iniciar sesión. Revisa los datos e inténtalo de nuevo.";
}
