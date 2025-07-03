
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDevelopment = process.env.NODE_ENV === "development";

  const self = "'self'";
  
  // Define allowed connection sources based on environment
  const connectSrc = isDevelopment
    ? [self, "https://*.cloudworkstations.dev", "wss:"]
    : [self, "https://afaire.is-cool.dev"];
  
  // Define allowed frame ancestors based on environment
  const frameAncestors = isDevelopment
    ? [self, "https://*.cloudworkstations.dev", "https://studio.firebase.google.com"]
    : ["'none'"];

  // In development, Next.js needs 'unsafe-eval' and 'unsafe-inline' for Fast Refresh.
  // In production, 'strict-dynamic' allows trusted (nonced) scripts to load other scripts,
  // which is essential for how Next.js loads its JavaScript chunks.
  const scriptSrc = isDevelopment
    ? [self, "'unsafe-inline'", "'unsafe-eval'"]
    : [self, `'nonce-${nonce}'`, "'strict-dynamic'"];

  // 'unsafe-inline' is needed for styles by many UI libraries, including ShadCN.
  const styleSrc = [self, "'unsafe-inline'"];

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
  
  const cspHeader = cspDirectives.join("; ").trim();

  // Set nonce on request headers for Next.js to use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // Create the response object
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set all security headers on the response
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
