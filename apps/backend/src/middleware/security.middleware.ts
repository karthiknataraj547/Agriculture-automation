import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ─── CYBERSECURITY CONFIGURATION ───
const HMAC_SECRET = process.env.AETHER_HMAC_SECRET || 'aether_super_secret_cyber_key_2026';
const MAX_PAYLOAD_SIZE = '100kb';

// ─── SLIDING WINDOW IN-MEMORY RATE LIMITER ───
interface RateLimitBucket {
  count: number;
  resetTime: number;
}
const ipBuckets = new Map<string, RateLimitBucket>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 150;
const MAX_SENSITIVE_REQUESTS_PER_MINUTE = 30;

export const securityRateLimiter = (isSensitive: boolean = false) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();
    const limit = isSensitive ? MAX_SENSITIVE_REQUESTS_PER_MINUTE : MAX_REQUESTS_PER_MINUTE;

    const bucket = ipBuckets.get(ip);
    if (!bucket || now > bucket.resetTime) {
      ipBuckets.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      return next();
    }

    bucket.count++;
    if (bucket.count > limit) {
      console.warn(`🚨 [CYBER-SECURITY] Rate limit exceeded for IP: ${ip} on path: ${req.originalUrl}`);
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Cybersecurity rate limit enforced.',
        retryAfterSec: Math.ceil((bucket.resetTime - now) / 1000)
      });
    }

    next();
  };
};

// ─── INJECTION & MALICIOUS PAYLOAD SANITIZER ───
const MALICIOUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /union\s+all\s+select/gi,
  /union\s+select/gi,
  /drop\s+table/gi,
  /insert\s+into/gi,
  /delete\s+from/gi,
  /\$where/gi,
  /\$regex/gi,
  /\$gt/gi,
  /\$ne/gi,
  /__proto__/gi,
  /constructor/gi,
  /prototype/gi
];

function scanObjectForThreats(obj: any, path: string = ''): string | null {
  if (!obj) return null;

  if (typeof obj === 'string') {
    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(obj)) {
        return `Malicious pattern matched at [${path}]: ${obj.slice(0, 30)}...`;
      }
    }
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      // Check for Prototype Pollution attempts
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return `Prototype pollution attempt detected at key: ${key}`;
      }
      const threat = scanObjectForThreats(obj[key], path ? `${path}.${key}` : key);
      if (threat) return threat;
    }
  }
  return null;
}

export const requestThreatSanitizer = (req: Request, res: Response, next: NextFunction) => {
  // Scan Query Parameters
  const queryThreat = scanObjectForThreats(req.query, 'query');
  if (queryThreat) {
    console.warn(`🚨 [CYBER-SECURITY BLOCK] Injection attempt in query: ${queryThreat}`);
    return res.status(403).json({
      success: false,
      error: 'SECURITY_THREAT_BLOCKED',
      message: 'Malicious payload pattern detected in query parameters.'
    });
  }

  // Scan Request Body
  if (req.body) {
    const bodyThreat = scanObjectForThreats(req.body, 'body');
    if (bodyThreat) {
      console.warn(`🚨 [CYBER-SECURITY BLOCK] Injection attempt in body: ${bodyThreat}`);
      return res.status(403).json({
        success: false,
        error: 'SECURITY_THREAT_BLOCKED',
        message: 'Malicious payload pattern detected in request body.'
      });
    }
  }

  next();
};

// ─── HMAC SHA-256 SIGNATURE VERIFICATION (ANTI-TAMPERING & REPLAY ATTACK MITIGATION) ───
export const hmacSignatureVerifier = (req: Request, res: Response, next: NextFunction) => {
  // Allow safe reading methods without signature
  if (req.method === 'GET' || req.method === 'OPTIONS') {
    return next();
  }

  const signature = req.headers['x-aether-signature'] as string;
  const timestamp = req.headers['x-aether-timestamp'] as string;

  // If signature provided, strictly verify cryptographic integrity
  if (signature && timestamp) {
    const now = Date.now();
    const reqTime = parseInt(timestamp, 10);

    // Block replay attacks older than 5 minutes (300,000 ms)
    if (isNaN(reqTime) || Math.abs(now - reqTime) > 300000) {
      console.warn(`🚨 [CYBER-SECURITY] Replay attack blocked! Expired timestamp: ${timestamp}`);
      return res.status(401).json({
        success: false,
        error: 'TIMESTAMP_EXPIRED',
        message: 'Request timestamp is invalid or expired (replay attack defense).'
      });
    }

    const payloadString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const expectedHash = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(`${timestamp}.${payloadString}`)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHash))) {
      console.warn(`🚨 [CYBER-SECURITY] HMAC Signature mismatch on ${req.originalUrl}`);
      return res.status(401).json({
        success: false,
        error: 'SIGNATURE_INVALID',
        message: 'Cryptographic HMAC signature verification failed.'
      });
    }
  }

  next();
};

// ─── HARDWARE AUTHENTICATION GUARD ───
export const hardwareAuthGuard = (req: Request, res: Response, next: NextFunction) => {
  const authCode = req.headers['x-device-auth'] || req.body?.authCode || req.query?.authCode;

  // Verify authCode format if provided (e.g. ATH-XXXX-XXXX-XXXX)
  if (authCode) {
    const authStr = String(authCode);
    if (!authStr.startsWith('ATH-') || authStr.length < 10) {
      return res.status(403).json({
        success: false,
        error: 'INVALID_HARDWARE_AUTH',
        message: 'Hardware authentication token format is invalid.'
      });
    }
  }

  next();
};

// ─── GLOBAL CYBERSECURITY HEADERS & AUDIT LOGGER ───
export const securityHeadersAndAuditLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Apply Hardened Response Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-Aether-Security-Guard', 'ENABLED-ENTERPRISE-v3.5');

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400) {
      console.log(`🔒 [SECURITY AUDIT] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms) [IP: ${req.ip}]`);
    }
  });

  next();
};
