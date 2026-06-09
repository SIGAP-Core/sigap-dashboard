import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = req.nextUrl;

  // belum login: redirect / ke /home, biarkan /auth/login dan /home
  if (
    !token &&
    !pathname.startsWith("/auth/login") &&
    !pathname.startsWith("/home")
  ) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/home", req.url));
    }
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // sudah login tapi buka login page, redirect ke dashboard
  if (token && pathname.startsWith("/auth/login")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next).*)"],
};
