
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDevelopment = process.env.NODE_ENV === "development";

  // Define allowed origins
  const self = "'self'";
  const devOrigin = "https://*.cloudworkstations.dev";
  const prodApiOrigin = "https://afaire.is-cool.dev";
  const placeholderOrigin = "https://placehold.co";

  const cspDirectives = {
    "default-src": [self],
    "script-src": [
      self,
      `'nonce-${nonce}'`,
      // Next.js needs 'unsafe-eval' in development for fast refresh.
      isDevelopment ? "'unsafe-eval'" : "",
    ].filter(Boolean),
    "style-src": [
      self,
      // UI libraries like ShadCN often use inline styles.
      "'unsafe-inline'",
    ].filter(Boolean),
    "img-src": [self, "data:", placeholderOrigin],
    "connect-src": [
      self,
      prodApiOrigin,
      // In development, allow connections to the dev server and websockets for HMR.
      isDevelopment ? `${devOrigin}:*` : "",
      isDevelopment ? "wss:" : "",
    ].filter(Boolean),
    "font-src": [self],
    "object-src": ["'none'"],
    "base-uri": [self],
    "form-action": [self],
    // Allow framing only from the dev environment previewer. Disallow in production.
    "frame-ancestors": [isDevelopment ? devOrigin : "'none'"].filter(Boolean),
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
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
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
