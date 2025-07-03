
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // The 'crypto' object is globally available in the Edge runtime.
  // We must not use `import crypto from 'crypto'`.
  const nonce = crypto.randomUUID();

  const cspHeader = isDevelopment
    ? `
        default-src 'self' https://*.cloudworkstations.dev;
        script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.cloudworkstations.dev;
        style-src 'self' 'unsafe-inline' https://*.cloudworkstations.dev;
        img-src 'self' data: https://placehold.co https://*.cloudworkstations.dev;
        connect-src 'self' https://*.cloudworkstations.dev wss://*.cloudworkstations.dev;
        font-src 'self';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'self' https://*.cloudworkstations.dev https://studio.firebase.google.com;
        upgrade-insecure-requests;
      `
    : `
        default-src 'self';
        script-src 'self' 'unsafe-inline';
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: https://placehold.co;
        connect-src 'self' https://afaire.is-cool.dev;
        font-src 'self';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        upgrade-insecure-requests;
      `;
  
  // Create a new Headers object to avoid modifying the original request headers.
  const requestHeaders = new Headers(request.headers);
  
  // Set the CSP header on the request headers, so it can be passed to the response.
  requestHeaders.set('Content-Security-Policy', cspHeader.replace(/\s{2,}/g, ' ').trim());

  // Create the response object.
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set the CSP header on the response as well, which is what the browser will see.
  response.headers.set('Content-Security-Policy', cspHeader.replace(/\s{2,}/g, ' ').trim());
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN")
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()"
  );
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, manifest.json, sw.js, icons/ (PWA/static assets)
     */
    '/((?!api/|_next/static/|_next/image/|manifest\\.json|sw\\.js|icons/|favicon\\.ico).*)',
  ],
};
