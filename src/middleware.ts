
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDevelopment = process.env.NODE_ENV === "development";

  // Define allowed origins
  const self = "'self'";
  // In development, allow connections from any *.cloudworkstations.dev subdomain
  // In production, restrict to the specific production API URL
  const connectSrcOrigins = isDevelopment
    ? ["https://*.cloudworkstations.dev/*", "wss:"]
    : ["https://afaire.is-cool.dev/*"];
  
  // Define frame ancestors based on environment
  const frameAncestors = isDevelopment
    ? "https://*.cloudworkstations.dev/*"
    : "'none'";

  const cspDirectives = {
    "default-src": [self],
    "script-src": [
      self,
      `'nonce-${nonce}'`,
      // Next.js needs 'unsafe-eval' and 'unsafe-inline' in development for fast refresh.
      isDevelopment ? "'unsafe-eval'" : "",
      isDevelopment ? "'unsafe-inline'" : "",
    ].filter(Boolean),
    "style-src": [
      self,
      // UI libraries like ShadCN often use inline styles for positioning, etc.
      "'unsafe-inline'",
    ],
    "img-src": [self, "data:", "https://placehold.co"],
    "connect-src": [self, ...connectSrcOrigins],
    "font-src": [self],
    "object-src": ["'none'"],
    "base-uri": [self],
    "form-action": [self],
    "frame-ancestors": [frameAncestors],
    "block-all-mixed-content": [],
    "upgrade-insecure-requests": [],
  };

  const cspHeader = Object.entries(cspDirectives)
    .map(([key, value]) => `${key} ${value.join(" ")}`)
    .join("; ");

  // Headers for the server to render pages with the correct nonce
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // Create the response object and attach headers for the client
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

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
    "/((?!api/|_next/static/|_next/image/|manifest\\.json|sw\\.js|icons/|favicon\\.ico).*)",
  ],
};
