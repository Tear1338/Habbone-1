import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

function applySecurityHeaders(res: NextResponse, req?: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production'
  const directives: string[] = []
  directives.push("default-src 'self'")
  directives.push("base-uri 'self'")
  directives.push("object-src 'none'")
  directives.push("frame-ancestors 'none'")
  directives.push("img-src 'self' data: https:")
  directives.push("font-src 'self' https: data:")
  directives.push("style-src 'self' 'unsafe-inline'")
  // Allow inline scripts but avoid eval in production; dev needs eval/ws for HMR
  const scriptSrc = isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  directives.push(scriptSrc)
  const connectSrc = isProd ? "connect-src 'self' https:" : "connect-src 'self' https: ws:"
  directives.push(connectSrc)
  directives.push('upgrade-insecure-requests')

  res.headers.set('Content-Security-Policy', directives.join('; '))
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  res.headers.set('Referrer-Policy', 'no-referrer-when-downgrade')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-XSS-Protection', '0')
  return res
}

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = new URL('/login', req.url);
    url.searchParams.set('from', req.nextUrl.pathname);
    const res = NextResponse.redirect(url);
    return applySecurityHeaders(res, req);
  }
  const res = NextResponse.next();
  return applySecurityHeaders(res, req);
}

export const config = {
  matcher: ['/profile', '/profile/:path*', '/admin', '/admin/:path*'],
};
