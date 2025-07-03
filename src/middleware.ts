
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // --- Create the response object ---
  const response = NextResponse.next();

  // --- Set all security headers on the response ---
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
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
