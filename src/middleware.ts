
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Create a random nonce for each request
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // 2. Define your Content Security Policy
  const cspHeader = `
    default-src 'self' https://afaire.is-cool.dev;
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://placehold.co;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self' https://*.cloudworkstations.dev;
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  // 3. Create a new response object and set headers
  const response = NextResponse.next();
  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', cspHeader);

  // Other security headers
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // The 'X-Frame-Options' header is removed in favor of the more modern 'frame-ancestors' CSP directive.
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()");

  return response;
}

// Apply middleware to all paths except for API routes, Next.js static assets, and specific files.
export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api/ (API routes)
    // - _next/static/ (static files)
    // - _next/image/ (image optimization files)
    // - manifest.json (PWA manifest file)
    // - sw.js (service worker file)
    // - icons/ (directory for PWA icons)
    // - favicon.ico (favicon file)
    '/((?!api/|_next/static/|_next/image/|manifest\\.json|sw\\.js|icons/|favicon\\.ico).*)',
  ],
}
