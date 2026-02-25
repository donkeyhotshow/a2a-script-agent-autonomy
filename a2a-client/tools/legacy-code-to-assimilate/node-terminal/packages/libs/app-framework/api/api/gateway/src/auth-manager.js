/**
 * Auth Manager
 * Extracted from main-gateway application
 */

class AuthManager {
  constructor() {
    this.strategies = new Map();
    this.users = [
      { username: 'testuser', password: 'password123', roles: ['user'], id: 'user-1' },
      { username: 'admin', password: 'adminpass', roles: ['admin'], id: 'user-2' },
    ];
  }

  /**
   * Add auth strategy
   */
  addStrategy(name, strategy) {
    this.strategies.set(name, strategy);
  }

  /**
   * Authenticate request
   */
  async authenticate(req, strategyName) {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      return { authenticated: false, error: 'Strategy not found' };
    }
    // Implementation for authentication
    return { authenticated: true };
  }

  /**
   * Decodes a Base64 encoded Basic Authorization header.
   * @param {string} base64String - The Base64 encoded string.
   * @returns {string} The decoded string.
   */
  decodeBasic(base64String) {
    return Buffer.from(base64String, 'base64').toString('utf8');
  }

  /**
   * Verifies Basic authentication credentials.
   * @param {string} authHeader - The Authorization header with Basic scheme.
   * @returns {Promise<object | null>} Decoded user payload if valid, otherwise null.
   */
  async verifyBasicAuth(authHeader) {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return null;
    }

    const encodedCredentials = authHeader.slice(6);
    try {
      const decodedCredentials = this.decodeBasic(encodedCredentials);
      const [username, password] = decodedCredentials.split(':');

      const user = this.users.find(u => u.username === username && u.password === password);

      if (user) {
        return { id: user.id, username: user.username, roles: user.roles };
      } else {
        return null;
      }
    } catch (error) {
      // console.error('Error decoding Basic auth credentials', error);
      return null;
    }
  }
}

const authManagerInstance = new AuthManager();

export default {
  AuthManager,
  registerUser: async (username, password, roles, isAdminRegister) => { /* ... */ },
  loginUser: async (username, password) => { /* ... */ },
  createApiKey: (name, roles, isAdmin) => { /* ... */ },
  verifyBearer: async (authHeader) => { /* ... */ }, // Placeholder for actual implementation
  decodeBasic: authManagerInstance.decodeBasic.bind(authManagerInstance),
  verifyBasicAuth: authManagerInstance.verifyBasicAuth.bind(authManagerInstance),
  listUsers: (isAdmin) => { /* ... */ },
  updateUserRoles: (id, roles, isAdmin) => { /* ... */ },
};
