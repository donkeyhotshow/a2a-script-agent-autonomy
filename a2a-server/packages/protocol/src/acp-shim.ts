export interface ACPMessagePart {
  type: 'text' | 'tool_call' | 'tool_result';
  content: string;
  metadata?: Record<string, any>;
}

export interface ACPMessage {
  id: string;
  senderId: string;
  recipientId: string;
  parts: ACPMessagePart[];
  timestamp: number;
}

export class ACPShim {
  async send(senderId: string, recipientId: string, content: string): Promise<ACPMessage> {
    const msg: ACPMessage = {
      id: `acp_${Date.now()}`,
      senderId,
      recipientId,
      parts: [{ type: 'text', content }],
      timestamp: Date.now()
    };
    
    // Logic to route message via A2A or P2P Relay
    return msg;
  }
}

export const acpShim = new ACPShim();
