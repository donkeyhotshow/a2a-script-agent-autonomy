/**
 * Chat Panel - Chat interface with AI assistant
 */

const ChatPanel = {
    api: '/api/v1',
    pollInterval: 5000,

    render(panelData) {
        const data = panelData?.data || {};
        const chatData = data.data || {};
        const messages = chatData.messages || [];

        return `
      <div class="chat-panel-content">
        <div class="chat-messages" id="chatMessages">
          ${messages.length === 0
            ? '<div class="empty">Start a conversation</div>'
            : messages.map(m => this.renderMessage(m)).join('')}
        </div>
        
        <div class="chat-input-area">
          <textarea 
            id="chatInput" 
            placeholder="Type your message..."
            rows="2"
          ></textarea>
          <div class="chat-actions">
            <button class="btn-chat-continue" id="btnContinue">Делаем</button>
            <button class="btn-chat-send" id="sendMessage">Send</button>
          </div>
        </div>
      </div>
    `;
    },

    renderMessage(message) {
        const isUser = message.role === 'user';
        const isPending = message.status === 'pending';
        const spinner = isPending ? '<span class="spinner"></span>' : '';

        return `
      <div class="chat-message ${isUser ? 'user' : 'server'} ${isPending ? 'pending' : ''}">
        <div class="message-role">
          ${isUser ? 'You' : 'Server'} ${spinner}
        </div>
        <div class="message-content">
          ${this.formatContent(message.contentText || message.content)}
        </div>
      </div>
    `;
    },

    formatContent(content) {
        if (!content) return '';
        if (typeof content === 'object') {
            return `<pre>${this.escape(JSON.stringify(content, null, 2))}</pre>`;
        }
        return this.escape(content).replace(/\n/g, '<br>');
    },

    setupEvents(panelId, projectId, sessionId) {
        // Send message
        const sendBtn = document.getElementById('sendMessage');
        const input = document.getElementById('chatInput');
        const continueBtn = document.getElementById('btnContinue');

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage(projectId, sessionId));
        }

        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage(projectId, sessionId);
                }
            });
        }

        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.sendContinue(projectId, sessionId));
        }
    },

    async sendMessage(projectId, sessionId) {
        const input = document.getElementById('chatInput');
        const text = input?.value.trim();
        if (!text) return;

        // Clear input
        if (input) input.value = '';

        // Add message to UI immediately
        this.addMessage({
            role: 'user',
            contentText: text,
            status: 'pending',
        });

        try {
            const res = await fetch(`${this.api}/requests`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    context: {
                        version: '1.0',
                        project_path: projectId,
                        session_id: sessionId,
                        new_task: [text],
                    },
                }),
            });

            const data = await res.json();

            if (data.success) {
                const {promiseId} = data.data;
                this.startPolling(promiseId);
            }
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    },

    async sendContinue(projectId, sessionId) {
        const text = '[Делаем]';

        this.addMessage({
            role: 'user',
            contentText: text,
            status: 'pending',
        });

        try {
            const res = await fetch(`${this.api}/requests`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    sessionId,
                    message: text,
                    context: {version: '1.0', session_id: sessionId, continue: true},
                }),
            });

            const data = await res.json();

            if (data.success) {
                const {promiseId} = data.data;
                this.startPolling(promiseId);
            }
        } catch (err) {
            console.error('Failed to send continue:', err);
        }
    },

    startPolling(promiseId) {
        const poll = async () => {
            try {
                const res = await fetch(`${this.api}/requests/${promiseId}/status`);
                const data = await res.json();

                if (!data.success) return;

                const {status} = data.data;

                if (status === 'completed' || status === 'failed') {
                    const resultRes = await fetch(`${this.api}/requests/${promiseId}/result`);
                    const resultData = await resultRes.json();

                    if (resultData.success) {
                        this.addMessage({
                            role: 'server',
                            content: resultData.data?.result,
                            contentText: typeof resultData.data?.result === 'string'
                                ? resultData.data.result
                                : JSON.stringify(resultData.data?.result, null, 2),
                            status: status === 'completed' ? 'completed' : 'failed',
                        });
                    }
                } else {
                    setTimeout(poll, this.pollInterval);
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        };

        poll();
    },

    addMessage(message) {
        // Dispatch event to update UI
        window.dispatchEvent(new CustomEvent('chat-message', {detail: message}));

        // Scroll to bottom
        const messagesEl = document.getElementById('chatMessages');
        if (messagesEl) {
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }
    },

    escape(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
};

window.ChatPanel = ChatPanel;
