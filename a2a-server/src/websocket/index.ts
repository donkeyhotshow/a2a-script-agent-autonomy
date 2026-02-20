import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from '../utils/logger.js';

let wss: WebSocketServer | null = null;
const sessionConnections = new Map<string, Set<WebSocket>>();

export function initWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '', `http://${request.headers.host}`);
    if (!url.pathname.startsWith('/ws/sessions/')) {
      socket.destroy();
      return;
    }
    const sessionId = url.pathname.replace('/ws/sessions/', '').split('/')[0];
    const token = url.searchParams.get('token');
    if (!sessionId || !token) {
      socket.destroy();
      return;
    }
    wss!.handleUpgrade(request, socket, head, (ws) => {
      wss!.emit('connection', ws, request, sessionId);
    });
  });

  wss.on('connection', (ws: WebSocket, _req: unknown, sessionId: string) => {
    if (!sessionConnections.has(sessionId)) {
      sessionConnections.set(sessionId, new Set());
    }
    sessionConnections.get(sessionId)!.add(ws);
    logger.info('WebSocket connected', { sessionId });

    ws.on('close', () => {
      sessionConnections.get(sessionId)?.delete(ws);
      if (sessionConnections.get(sessionId)?.size === 0) {
        sessionConnections.delete(sessionId);
      }
    });

    ws.on('pong', () => {
      (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
    });
  });

  const interval = setInterval(() => {
    wss?.clients.forEach((ws: WebSocket) => {
      const w = ws as WebSocket & { isAlive?: boolean };
      if (w.isAlive === false) return ws.terminate();
      w.isAlive = false;
      ws.ping();
    });
  }, 30000);
  wss.on('close', () => clearInterval(interval));

  return wss;
}

export function getWebSocketServer(): WebSocketServer {
  if (!wss) throw new Error('WebSocket server not initialized');
  return wss;
}

export function broadcast(message: unknown): void {
  const data = JSON.stringify(message);
  wss?.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  });
}

export function sendToSession(sessionId: string, message: unknown): void {
  const data = JSON.stringify(message);
  const conns = sessionConnections.get(sessionId);
  if (conns) {
    conns.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });
  }
}

export async function closeWebSocket(): Promise<void> {
  if (wss) {
    wss.close();
    wss = null;
    sessionConnections.clear();
    logger.info('WebSocket server closed');
  }
}

export function getConnectedClientsCount(): number {
  return wss?.clients.size ?? 0;
}

export type ConnectionHandler = (
  ws: WebSocket,
  sessionId: string,
  clientId: string
) => void;

export type MessageHandler = (
  ws: WebSocket,
  sessionId: string,
  message: unknown
) => void;

let connectionHandler: ConnectionHandler | null = null;
let messageHandler: MessageHandler | null = null;

export function onConnection(handler: ConnectionHandler): void {
  connectionHandler = handler;
}

export function onMessage(handler: MessageHandler): void {
  messageHandler = handler;
}
