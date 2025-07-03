
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDevelopment = process.env.NODE_ENV === "development";

  // Base directives that are strict for production
  let scriptSrc = `'nonce-${nonce}' 'self'`;
  let styleSrc = `'nonce-${nonce}' 'self'`;
  let connectSrc = `https://afaire.is-cool.dev/*`;
  let imgSrc = `'self' data: https://placehold.co`;
  
  // In development, we need to relax the policy for HMR (Hot Module Replacement) and dev tools
  if (isDevelopment) {
    scriptSrc = `'self' 'unsafe-inline' 'unsafe-eval'`; // Allow inline scripts and eval for dev server
    styleSrc = `'self' 'unsafe-inline'`; // Allow inline styles for dev
    connectSrc = `'self' wss: ws: https://*.cloudworkstations.dev/*`; // Allow websocket for HMR
    imgSrc = `* data:`; // Loosen image policy for dev
  }

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src ${styleSrc};
    connect-src ${connectSrc};
    img-src ${imgSrc};
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self' https://*.cloudworkstations.dev:*;
  `
    .replace(/\s{2,}/g, " ")
    .trim();
  
  // Headers for the server to render pages with the correct nonce
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);


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
