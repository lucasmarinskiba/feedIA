/**
 * Input sanitization middleware
 *
 * Defends against:
 *   - XSS (script injection patterns)
 *   - SQL injection (UNION/DROP/SELECT attacks)
 *   - Command injection (; rm -rf, | cat /etc/passwd)
 *   - Path traversal (../../../etc/passwd)
 *   - HTTP header injection (\r\n)
 *   - Oversized payloads (DoS via memory exhaustion)
 *   - Null byte injection (%00)
 *   - Unicode direction override chars (RTLO attacks)
 *
 * Does NOT sanitize/mutate the body — it REJECTS suspicious requests
 * so the original data is never processed. Defense-in-depth.
 */

import { Request, Response, NextFunction } from 'express';
import { securityLogger } from './security-logger.js';

// Maximum string value length in any JSON field
const MAX_STRING_LENGTH = 50_000;
// Maximum total JSON body size (also enforced at transport level via express.json limit)
const MAX_BODY_DEPTH = 10;
// Maximum array/object elements at any level
const MAX_COLLECTION_SIZE = 500;

// Attack pattern matchers — compile once
const PATTERNS: Array<{ name: string; regex: RegExp }> = [
  // XSS
  { name: 'xss_script', regex: /<script[\s\S]*?>[\s\S]*?<\/script>/i },
  { name: 'xss_event', regex: /\bon\w+\s*=\s*["']?[^"'>]+["']?/i },
  { name: 'xss_data_uri', regex: /data:\s*text\/html/i },
  { name: 'xss_vbscript', regex: /vbscript\s*:/i },
  { name: 'xss_iframe', regex: /<iframe[\s\S]*?>/i },

  // SQL Injection
  { name: 'sqli_union', regex: /\bunion\s+(all\s+)?select\b/i },
  { name: 'sqli_drop', regex: /\bdrop\s+(table|database|schema)\b/i },
  { name: 'sqli_insert', regex: /\binsert\s+into\b.*\bvalues\b/i },
  { name: 'sqli_delete', regex: /\bdelete\s+from\b/i },
  { name: 'sqli_exec', regex: /\bexec\s*\(/i },
  { name: 'sqli_xp', regex: /\bxp_cmdshell\b/i },
  { name: 'sqli_comment', regex: /('|")\s*(--|#|\/\*)/i },

  // Command injection
  { name: 'cmdi_shell', regex: /[;&|`$]\s*(rm|cat|ls|whoami|curl|wget|nc|bash|sh|python|perl|php)\b/i },
  { name: 'cmdi_redirect', regex: /\b(rm|chmod|chown|mkfifo)\s+-/i },

  // Path traversal
  { name: 'path_traversal', regex: /\.\.[/\\]/ },

  // HTTP header injection
  { name: 'header_inject', regex: /[\r\n]/ },

  // Null byte
  { name: 'null_byte', regex: /\x00/ },

  // Unicode direction override (RTLO/BIDI attacks)
  { name: 'bidi_override', regex: /[‏‫‮⁧⁩]/ },
];

const scanString = (value: string, path: string): string | null => {
  if (value.length > MAX_STRING_LENGTH) {
    return `field_too_long:${path} (${value.length} chars, max ${MAX_STRING_LENGTH})`;
  }

  for (const { name, regex } of PATTERNS) {
    if (regex.test(value)) {
      return `${name}:${path}`;
    }
  }

  return null;
};

const scanValue = (value: unknown, path: string, depth: number): string | null => {
  if (depth > MAX_BODY_DEPTH) {
    return `depth_exceeded:${path}`;
  }

  if (typeof value === 'string') {
    return scanString(value, path);
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_COLLECTION_SIZE) {
      return `array_too_large:${path} (${value.length} items, max ${MAX_COLLECTION_SIZE})`;
    }
    for (let i = 0; i < value.length; i++) {
      const result = scanValue(value[i], `${path}[${i}]`, depth + 1);
      if (result) return result;
    }
    return null;
  }

  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length > MAX_COLLECTION_SIZE) {
      return `object_too_large:${path} (${keys.length} keys, max ${MAX_COLLECTION_SIZE})`;
    }
    for (const key of keys) {
      // Also scan key names (prototype pollution via __proto__, constructor)
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return `prototype_pollution:${path}.${key}`;
      }
      const result = scanValue((value as Record<string, unknown>)[key], `${path}.${key}`, depth + 1);
      if (result) return result;
    }
    return null;
  }

  // numbers, booleans, null — safe
  return null;
};

const scanQueryParams = (query: Record<string, unknown>, path: string): string | null => {
  for (const [key, val] of Object.entries(query)) {
    if (typeof val === 'string') {
      const result = scanString(val, `${path}.${key}`);
      if (result) return result;
    }
    if (Array.isArray(val)) {
      for (const v of val) {
        if (typeof v === 'string') {
          const result = scanString(v, `${path}.${key}[]`);
          if (result) return result;
        }
      }
    }
  }
  return null;
};

// Paths exempt from body scanning (file uploads, raw binary)
const EXEMPT_PATHS = ['/api/image-upload', '/api/video'];

const isExempt = (path: string): boolean => EXEMPT_PATHS.some((prefix) => path.startsWith(prefix));

export const inputSanitizer = (req: Request, res: Response, next: NextFunction): void => {
  if (isExempt(req.path)) {
    next();
    return;
  }

  // Scan query parameters
  const queryHit = scanQueryParams(req.query as Record<string, unknown>, 'query');
  if (queryHit) {
    securityLogger.suspiciousInput(req, queryHit);
    res.status(400).json({ error: 'Bad Request', message: 'Invalid input detected.' });
    return;
  }

  // Scan request body (parsed JSON)
  if (req.body !== undefined && req.body !== null) {
    const bodyHit = scanValue(req.body, 'body', 0);
    if (bodyHit) {
      securityLogger.suspiciousInput(req, bodyHit);
      res.status(400).json({ error: 'Bad Request', message: 'Invalid input detected.' });
      return;
    }
  }

  next();
};
