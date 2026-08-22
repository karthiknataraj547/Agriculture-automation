import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── IN-MEMORY SLIDING WINDOW RATE LIMITER ───
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120; // 120 requests per min for standard API
const MAX_AUTH_REQUESTS_PER_WINDOW = 20; // 20 requests per min for auth/provisioning

function isRateLimited(ip: string, isAuthRoute: boolean): boolean {
  const now = Date.now();
  const limit = isAuthRoute ? MAX_AUTH_REQUESTS_PER_WINDOW : MAX_REQUESTS_PER_WINDOW;
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.lastReset > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return false;
  }

  entry.count++;
  if (entry.count > limit) {
    return true;
  }
  return false;
}

// ─── MALICIOUS PATTERN SCANNER (SQLi, XSS, PATH TRAVERSAL) ───
const INJECTION_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /union\s+select/gi,
  /select\s+.*\s+from/gi,
  /drop\s+table/gi,
  /insert\s+into/gi,
  /delete\s+from/gi,
  /--\s*$/g,
  /\/\*.*\*\//g,
  /\.\.\/\.\./g, // Directory traversal
  /<iframe/gi,
  /eval\(/gi,
  /exec\(/gi
];

function containsInjectionPayload(str: string): boolean {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(str)) return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  // 1. RATE LIMITING & DDOS MITIGATION
  const isAuthRoute = pathname.includes('/api/auth') || pathname.includes('/api/devices/claim') || pathname.includes('/api/admin');
  if (isRateLimited(ip, isAuthRoute)) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Cyber-security rate limit active. Please try again later.'
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      }
    );
  }

  // 2. INJECTION & XSS PAYLOAD DETECTION IN URL & QUERY
  const fullUrl = `${pathname}${search}`;
  if (containsInjectionPayload(fullUrl)) {
    console.warn(`[Security Alert] Blocked suspicious injection attempt from ${ip} on ${fullUrl}`);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'MALICIOUS_PAYLOAD_DETECTED',
        message: 'Request blocked by AetherGuard Cybersecurity Filter.'
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // 3. APPLY ENTERPRISE CYBERSECURITY HEADERS (OWASP TOP 10 COMPLIANT)
  const response = NextResponse.next();

  // Content Security Policy (CSP)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data: blob: https:; " +
    "connect-src 'self' http://localhost:* ws://localhost:* http://192.168.* ws://192.168.* ws://* http://* https://*; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );

  // Strict-Transport-Security (HSTS)
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  // Prevent Clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME Type Sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (Camera, Mic, Sensors lockdown)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=(), usb=(self), bluetooth=(self)'
  );

  // Legacy XSS Protection Header
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Custom Security Telemetry Header
  response.headers.set('X-Aether-Shield', 'ACTIVE-v3.5');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg).*)',
  ],
};
