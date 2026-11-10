import { NextResponse, type NextRequest } from "next/server";
// Barreira rápida (só presença do cookie). A validação real ocorre em requireUser().
const PUBLIC = ["/login", "/recuperar-senha"];
export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (!req.cookies.get("sid") && !PUBLIC.some(x => p.startsWith(x))) return NextResponse.redirect(new URL("/login", req.url));
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-app-pathname", p);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
export const config = { matcher: ["/((?!_next|brand|favicon.ico).*)"] };
