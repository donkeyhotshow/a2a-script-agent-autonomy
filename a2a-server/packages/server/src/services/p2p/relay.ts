// [STUB] p2p/relay — requires real implementation
export class PeerRelay {
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  /** No-op until real P2P stack is wired. */
  joinRoom(_room: string, _peerId: string): void {}
}
export const peerRelay = new PeerRelay();
