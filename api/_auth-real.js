/**
 * Real Authentication - JWT + Sessions
 * Replaces mock x-user-id header
 */

import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
const ACCESS_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

// Mock user DB (replace with real DB)
const users = new Map();
const sessions = new Map();

/**
 * Hash password (bcrypt equivalent for Node.js)
 */
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
};

/**
 * Verify password
 */
const verifyPassword = (password, hash) => {
  return hashPassword(password) === hash;
};

/**
 * Generate JWT token
 */
const generateToken = (userId, expiresIn = ACCESS_TOKEN_EXPIRY) => {
  const payload = {
    userId,
    iat: Date.now(),
    exp: Date.now() + expiresIn,
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64');

  return `${header}.${body}.${signature}`;
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64');

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64').toString());
    if (payload.exp < Date.now()) return null;

    return { userId: payload.userId };
  } catch {
    return null;
  }
};

/**
 * Signup
 */
const signup = async (email, password, name) => {
  if (users.has(email)) {
    throw new Error('Email already registered');
  }

  if (!password || password.length < 8) {
    throw new Error('Password must be 8+ characters');
  }

  const userId = crypto.randomUUID();
  const user = {
    id: userId,
    email,
    password_hash: hashPassword(password),
    name,
    tier: 'free',
    created_at: new Date().toISOString(),
  };

  users.set(email, user);
  users.set(userId, user);

  const accessToken = generateToken(userId);
  const refreshToken = crypto.randomBytes(32).toString('hex');

  sessions.set(refreshToken, {
    userId,
    expires_at: Date.now() + REFRESH_TOKEN_EXPIRY,
  });

  return {
    user: { id: userId, email, name, tier: 'free' },
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: ACCESS_TOKEN_EXPIRY / 1000,
  };
};

/**
 * Login
 */
const login = async (email, password) => {
  const user = users.get(email);

  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new Error('Invalid email or password');
  }

  const accessToken = generateToken(user.id);
  const refreshToken = crypto.randomBytes(32).toString('hex');

  sessions.set(refreshToken, {
    userId: user.id,
    expires_at: Date.now() + REFRESH_TOKEN_EXPIRY,
  });

  return {
    user: { id: user.id, email: user.email, name: user.name, tier: user.tier },
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: ACCESS_TOKEN_EXPIRY / 1000,
  };
};

/**
 * Refresh token
 */
const refreshTokens = async (refreshToken) => {
  const session = sessions.get(refreshToken);

  if (!session || session.expires_at < Date.now()) {
    throw new Error('Invalid or expired refresh token');
  }

  const user = users.get(session.userId);
  if (!user) throw new Error('User not found');

  const newAccessToken = generateToken(user.id);
  const newRefreshToken = crypto.randomBytes(32).toString('hex');

  sessions.delete(refreshToken);
  sessions.set(newRefreshToken, {
    userId: user.id,
    expires_at: Date.now() + REFRESH_TOKEN_EXPIRY,
  });

  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    expires_in: ACCESS_TOKEN_EXPIRY / 1000,
  };
};

/**
 * Get current user from token
 */
const getCurrentUser = async (token) => {
  const decoded = verifyToken(token);
  if (!decoded) throw new Error('Invalid token');

  const user = users.get(decoded.userId);
  if (!user) throw new Error('User not found');

  return { id: user.id, email: user.email, name: user.name, tier: user.tier };
};

/**
 * Auth HTTP handler
 */
export const handleAuth = async (req, res, path, m, body) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return true;
  };

  try {
    // POST /api/auth/signup
    if (path === '/api/auth/signup' && m === 'POST') {
      const { email, password, name } = body || {};

      if (!email || !password || !name) {
        return json(400, { error: 'email, password, name required' });
      }

      const result = await signup(email, password, name);
      return json(201, result);
    }

    // POST /api/auth/login
    if (path === '/api/auth/login' && m === 'POST') {
      const { email, password } = body || {};

      if (!email || !password) {
        return json(400, { error: 'email, password required' });
      }

      const result = await login(email, password);
      return json(200, result);
    }

    // POST /api/auth/refresh
    if (path === '/api/auth/refresh' && m === 'POST') {
      const { refresh_token } = body || {};

      if (!refresh_token) {
        return json(400, { error: 'refresh_token required' });
      }

      const result = await refreshTokens(refresh_token);
      return json(200, result);
    }

    // POST /api/auth/logout
    if (path === '/api/auth/logout' && m === 'POST') {
      const { refresh_token } = body || {};

      if (refresh_token) {
        sessions.delete(refresh_token);
      }

      return json(200, { ok: true });
    }

    // GET /api/auth/me
    if (path === '/api/auth/me' && m === 'GET') {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '');

      if (!token) {
        return json(401, { error: 'unauthorized' });
      }

      const user = await getCurrentUser(token);
      return json(200, user);
    }

    // PUT /api/auth/password
    if (path === '/api/auth/password' && m === 'PUT') {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '');
      const { old_password, new_password } = body || {};

      if (!token) return json(401, { error: 'unauthorized' });
      if (!old_password || !new_password) {
        return json(400, { error: 'old_password, new_password required' });
      }

      const decoded = verifyToken(token);
      if (!decoded) return json(401, { error: 'invalid token' });

      const user = users.get(decoded.userId);
      if (!user || !verifyPassword(old_password, user.password_hash)) {
        return json(400, { error: 'incorrect password' });
      }

      user.password_hash = hashPassword(new_password);
      return json(200, { ok: true });
    }

    return false;
  } catch (err) {
    return json(500, { error: String(err).replace('Error: ', '') });
  }
};
