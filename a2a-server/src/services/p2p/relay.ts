import { logger } from '../../utils/logger.js';

export class PeerRelay {
  private rooms: Map<string, Set<string>> = new Map();

  joinRoom(roomId: string, peerId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(peerId);
    logger.info('[PeerRelay] Peer joined room', { roomId, peerId });
  }

  relayMessage(roomId: string, senderId: string, data: any): void {
    const peers = this.rooms.get(roomId);
    if (!peers) return;

    logger.info('[PeerRelay] Relaying message', { roomId, senderId, peerCount: peers.size });
    // In a real libp2p implementation, this would broadcast to all peers in the room
    for (const peerId of peers) {
      if (peerId !== senderId) {
        // Logic to send to specific peer node
      }
    }
  }

  getPeers(roomId: string): string[] {
    return Array.from(this.rooms.get(roomId) || []);
  }
}

export const peerRelay = new PeerRelay();
