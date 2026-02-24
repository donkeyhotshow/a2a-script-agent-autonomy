import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger.js';

/**
 * WebSocket server for session updates.
 * Handles upgrade requests for /ws/sessions/*
 */

let wss: WebSocketServer | null = null;

export function initWebSocket(server: Server): void {
  if (wss) {
    // WebSocket сервер уже инициализирован
    return;
  }

  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    if (!shouldHandleUpgrade(request)) {
      return;
    }

    wss!.handleUpgrade(request, socket, head, (ws) => {
      wss!.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
    const url = request.url ?? '';
    logger.info('WebSocket client connected', { url });

    ws.on('message', (data) => {
      // Минимальное поведение: поддержка ping/pong и простого эхо.
      try {
        const text = data.toString();
        if (text === 'ping') {
          ws.send('pong');
        }
      } catch {
        // Игнорируем ошибки парсинга
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket client disconnected', { url });
    });

    ws.on('error', (error) => {
      logger.warn('WebSocket client error', { url, error });
    });
  });
}

function shouldHandleUpgrade(request: IncomingMessage): boolean {
  const url = request.url ?? '';
  return url.startsWith('/ws/sessions');
}
