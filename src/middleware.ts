import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "./server/supabase/middleware";

/** Refresca la sesión y protege todas las rutas de la aplicación salvo /login. */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const esLogin = request.nextUrl.pathname === "/login";

  try {
    const { response, user } = await updateSession(request);

    if (esLogin) {
      if (user) return redirectA(request, "/cuadrillas");
      return response;
    }

    if (!user) {
      const destino = new URL("/login", request.url);
      destino.searchParams.set(
        "returnTo",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      return NextResponse.redirect(destino);
    }

    return response;
  } catch {
    // Sin proyecto Supabase no se puede verificar la sesión. /login sigue
    // accesible para mostrar el estado de configuración; el resto queda
    // protegido y nunca se sirve como si hubiera una sesión válida.
    if (esLogin) return NextResponse.next();
    return redirectA(request, "/login?error=configuracion");
  }
}

function redirectA(request: NextRequest, destino: string): NextResponse {
  return NextResponse.redirect(new URL(destino, request.url));
}

export default middleware;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|offline.html).*)",
  ],
};
