const express = require('express');

/**
 * Простой mock-сервер для тестирования proxy
 */
function createMockServer() {
  const app = express();
  
  app.use(express.json());
  
  // Mock endpoint для тестирования
  app.get('/mock-service/*', (req, res) => {
    const authKey = req.headers['x-auth-key'];
    const userData = req.headers['x-user-data'];
    
    if (authKey === 'admin_key_2024_secure_xyz789') {
      return res.status(200).json({ 
        service: 'mock', 
        data: 'Admin data', 
        user: userData ? JSON.parse(userData) : null 
      });
    } else if (authKey === 'user_key_2024_secure_abc123') {
      return res.status(200).json({ 
        service: 'mock', 
        data: 'User data', 
        user: userData ? JSON.parse(userData) : null 
      });
    } else if (!authKey) {
      return res.status(200).json({ 
        service: 'mock', 
        data: 'Public data', 
        user: null 
      });
    } else {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  });
  
  app.get('/error-service/*', (req, res) => {
    return res.status(500).json({ error: 'Service unavailable' });
  });
  
  return app;
}

export { createMockServer };
