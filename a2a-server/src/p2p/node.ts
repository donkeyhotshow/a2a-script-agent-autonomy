import { logger } from '../../utils/logger.js';
// @ts-ignore
import { createLibp2p } from 'libp2p';
// @ts-ignore
import { tcp } from '@libp2p/tcp';
// @ts-ignore
import { mplex } from '@libp2p/mplex';
// @ts-ignore
import { noise } from '@chainsafe/libp2p-noise';
// @ts-ignore
import { gossipsub } from '@chainsafe/libp2p-gossipsub';

export class P2PNode {
  private node: any;

  async start() {
    try {
      this.node = await createLibp2p({
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/0']
        },
        transports: [tcp()],
        streamMuxers: [mplex()],
        connectionEncryption: [noise()],
        pubsub: gossipsub()
      });

      await this.node.start();
      logger.info('[P2P] Node started', { peerId: this.node.peerId.toString() });

      this.node.pubsub.subscribe('a2a-sessions');
      this.node.pubsub.addEventListener('message', (evt: any) => {
        const data = new TextDecoder().decode(evt.detail.data);
        logger.info('[P2P] Received pubsub message', { topic: evt.detail.topic, data });
      });
    } catch (err) {
      logger.error('[P2P] Failed to start node', err);
    }
  }

  async subscribeToRoom(sessionId: string) {
    if (!this.node) return;
    const topic = `a2a-room-${sessionId}`;
    this.node.pubsub.subscribe(topic);
    logger.info('[P2P] Subscribed to Relay Room', { topic });
  }

  async publishToRoom(sessionId: string, payload: any) {
    if (!this.node) return;
    const topic = `a2a-room-${sessionId}`;
    const msg = JSON.stringify(payload);
    await this.node.pubsub.publish(topic, new TextEncoder().encode(msg));
    logger.info('[P2P] Published to Relay Room', { topic });
  }

  async broadcastSession(sessionId: string, snapshot: any) {
    if (!this.node) return;
    const msg = JSON.stringify({ sessionId, snapshot });
    await this.node.pubsub.publish('a2a-sessions', new TextEncoder().encode(msg));
    logger.info('[P2P] Broadcasted session', { sessionId });
  }

  async stop() {
    if (this.node) await this.node.stop();
  }
}

export const p2pNode = new P2PNode();
