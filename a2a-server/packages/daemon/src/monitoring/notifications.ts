import { logger } from '@a2a/server-utils/logger';

export type NotificationType = 'halt' | 'evolve' | 'fail' | 'success';

export class NotificationService {
  notify(type: NotificationType, message: string, context?: any): void {
    logger.info(`[Notification] ${type.toUpperCase()}: ${message}`, context);
    
    // In a real browser/electron env:
    // if (typeof window !== 'undefined' && 'Notification' in window) {
    //   new Notification(`A2A: ${type.toUpperCase()}`, { body: message });
    // }
    
    // For Node/CLI:
    if (process.env.DEBUG_NOTIFICATIONS) {
      console.log(`\n🔔 NOTIFICATION: ${type.toUpperCase()} - ${message}\n`);
    }
  }
}

export const notificationService = new NotificationService();
