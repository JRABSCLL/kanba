import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Supabase stores the session in a cookie named sb-<project-ref>-auth-token
  // We check for any cookie that matches the Supabase auth pattern
  const cookies = req.cookies;
  const hasSession = [...cookies.getAll()].some(
    (cookie) => cookie.name.includes('-auth-token') && cookie.value.length > 0
  );

  // Redirect root to login or dashboard
  if (pathname === '/') {
    if (hasSession) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If already authenticated, redirect away from auth pages
  if (hasSession && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Protect dashboard routes
  if (!hasSession && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/signup', '/dashboard/:path*'],
};
