import { verifyBearer, verifyBasicAuth } from '../gateway/src/auth-manager.js';

export function customAuthMiddleware(options) {
  const { logger, cookieName, headerName, validKeys, cookieMaxAge, secureCookies } = options;

  return async (req, res, next) => {
    let user = null;
    let isAuthenticated = false;

    const authHeader = req.headers[headerName || 'authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      user = await verifyBearer(authHeader);
    } else if (authHeader && authHeader.startsWith('Basic ')) {
      user = await verifyBasicAuth(authHeader);
    }

    if (user) {
      isAuthenticated = true;
      req.user = user; // Attach user info to request
      // Enrich headers
      req.headers['x-authenticated'] = 'true';
      req.headers['x-auth-user-id'] = user.id;
      req.headers['x-auth-username'] = user.username;
      req.headers['x-auth-roles'] = user.roles ? user.roles.join(',') : '';
    } else {
      req.headers['x-authenticated'] = 'false';
    }

    next();
  };
}

export function requireAuth(req, res, next) {
  if (req.headers['x-authenticated'] === 'true') {
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
}

export function logoutMiddleware(req, res, next) {
  // For stateless JWT/header based auth, logout might involve client-side token removal.
  // For server-side sessions/cookies, it would involve clearing them.
  if (req.cookies && req.cookies.sessionId) {
    res.clearCookie('sessionId'); // Example for a cookie-based session
  }
  next();
}
