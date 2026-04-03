import { getGlobalStats, getGlobalStatsDetailed, resetGlobalStats } from '../daemon/index.js';

const DAEMON_PREFIX = '/api/a2a/daemon';

/**
 * Create daemon monitoring routes
 * @param {object} config - Configuration options
 * @param {string} config.cwd - Current working directory
 * @returns {Function} Express middleware
 */
export function createDaemonRoutes({ cwd }) {
    return (req, res, next) => {
        if (!req.url?.startsWith(DAEMON_PREFIX)) return next();

        const url = new URL(req.url, 'http://localhost');
        const path = url.pathname.slice(DAEMON_PREFIX.length);

        // GET /api/a2a/daemon/stats - Get global polling statistics
        if (req.method === 'GET' && path === '/stats') {
            const stats = getGlobalStats();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(stats));
            return;
        }

        // GET /api/a2a/daemon/stats/detailed - Get detailed statistics
        if (req.method === 'GET' && path === '/stats/detailed') {
            const stats = getGlobalStatsDetailed();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(stats));
            return;
        }

        // POST /api/a2a/daemon/stats/reset - Reset statistics
        if (req.method === 'POST' && path === '/stats/reset') {
            resetGlobalStats();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Statistics reset' }));
            return;
        }

        // 404 for unknown daemon endpoints
        res.writeHead(404).end(JSON.stringify({ error: 'Not found' }));
    };
}
