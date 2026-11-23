import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

const studentPaths = ["/", "/kiberons", "/homework", "/lessons", "/tests", "/certificates", "/profile", "/rating"];

function isStudentPath(pathname: string) {
  return studentPaths.some((path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const needsAuth = pathname.startsWith("/admin") || isStudentPath(pathname);
  if (needsAuth && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|sw.js|manifest.webmanifest|api).*)"],
};
