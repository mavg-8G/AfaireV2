
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const self = "'self'";

  // --- Define sources based on environment ---
  const scriptSrc = isDevelopment
    ? [self, "'unsafe-inline'", "'unsafe-eval'"]
    : [self, "'unsafe-inline'"]; // Allow self-hosted and inline scripts in production

  const styleSrc = [self, "'unsafe-inline'"]; // 'unsafe-inline' is often needed for UI libraries

  const connectSrc = isDevelopment
    ? [self, "https://*.cloudworkstations.dev", "wss:"]
    : ["https://afaire.is-cool.dev"];

  const frameAncestors = isDevelopment
    ? [self, "https://*.cloudworkstations.dev", "https://studio.firebase.google.com"]
    : ["'none'"];

  // --- Build the CSP header ---
  const cspDirectives = [
    `default-src ${self}`,
    `script-src ${scriptSrc.join(" ")}`,
    `style-src ${styleSrc.join(" ")}`,
    `img-src ${self} data: https://placehold.co`,
    `connect-src ${connectSrc.join(" ")}`,
    `font-src ${self}`,
    `object-src 'none'`,
    `base-uri ${self}`,
    `form-action ${self}`,
    `frame-ancestors ${frameAncestors.join(" ")}`,
    `upgrade-insecure-requests`,
  ];
  const cspHeader = cspDirectives.join("; ");

  // --- Create the response object ---
  const response = NextResponse.next();

  // --- Set all security headers on the response ---
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("X-Content-Type-Options", "nosniff");
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
    "/((?!api/|_next/static/|_next/image/|manifest\\.json|sw\\.js|icons/|favicon\\.ico).*)",
  ],
};
