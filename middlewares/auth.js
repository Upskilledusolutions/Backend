const crypto = require('crypto');
const AuthModel = require('../models/Authmodel');

const SESSION_COOKIE = 'ups_auth_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

const getSessionSecret = () => {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) throw new Error('AUTH_SESSION_SECRET is not configured');
  return secret;
};

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const sign = (value) => crypto.createHmac('sha256', getSessionSecret()).update(value).digest('base64url');

const createSessionToken = (user) => {
  const payload = encode({
    userId: user.userId,
    type: user.type,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
  return `${payload}.${sign(payload)}`;
};

const parseCookies = (header = '') => header.split(';').reduce((cookies, part) => {
  const index = part.indexOf('=');
  if (index === -1) return cookies;
  const key = part.slice(0, index).trim();
  const value = part.slice(index + 1).trim();
  if (key) cookies[key] = decodeURIComponent(value);
  return cookies;
}, {});

const readSession = (req) => {
  const token = parseCookies(req.headers.cookie || '')[SESSION_COOKIE];
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.userId || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
};

const setSessionCookie = (res, user) => {
  const token = createSessionToken(user);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${SESSION_TTL_SECONDS}; Path=/; HttpOnly; SameSite=None${secure}`);
};

const clearSessionCookie = (res) => {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=None; Secure`);
};

const requireAuth = async (req, res, next) => {
  try {
    const session = readSession(req);
    if (!session) return res.status(401).json({ success: false, message: 'Authentication required' });
    const user = await AuthModel.findOne(
      { userId: session.userId },
      { userId: 1, name: 1, type: 1, active: 1, reasoningAccess: 1 }
    );
    if (!user || !user.active) return res.status(401).json({ success: false, message: 'Authentication required' });
    req.authUser = user;
    return next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.authUser || req.authUser.type !== 'all') {
    return res.status(403).json({ success: false, message: 'Administrator access required' });
  }
  return next();
};

module.exports = {
  SESSION_COOKIE,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  requireAdmin,
};