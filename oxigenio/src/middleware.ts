import { NextResponse, type NextRequest } from "next/server";
// Barreira rápida (só presença do cookie). A validação real ocorre em requireUser().
export function middleware(req: NextRequest) {
  if (!req.cookies.get("sid") && !req.nextUrl.pathname.startsWith("/login"))
    return NextResponse.redirect(new URL("/login", req.url));
}
export const config = { matcher: ["/((?!_next|brand|favicon.ico).*)"] };
