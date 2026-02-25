/**
 * Actions Panel - Shows action execution progress and logs
 */

const ActionsPanel = {
  render(panelData) {
    const data = panelData?.data || {};
    const actionData = data.data || {};
    
    const currentAction = actionData.currentAction;
    const steps = actionData.steps || [];
    const logs = actionData.logs || [];
    const status = actionData.status || 'idle';
    
    return `
      <div class="actions-panel-content">
        <div class="action-status">
          <span class="status-label">Status:</span>
          <span class="status-value status-${status}">${status}</span>
        </div>
        
        ${currentAction ? `
          <div class="current-action">
            <div class="action-name">${this.escape(currentAction.id || 'Action')}</div>
            <div class="action-title">${this.escape(currentAction.title || '')}</div>
          </div>
        ` : `
          <div class="no-action">No active action</div>
        `}
        
        <div class="action-steps">
          <div class="steps-title">Steps:</div>
          <div class="steps-list">
            ${steps.length === 0 
              ? '<div class="empty">No steps</div>' 
              : steps.map((step, i) => this.renderStep(step, i)).join('')}
          </div>
        </div>
        
        <div class="action-logs">
          <div class="logs-title">Logs:</div>
          <div class="logs-list" id="actionLogs">
            ${logs.length === 0 
              ? '<div class="empty">No logs yet</div>' 
              : logs.map(log => this.renderLog(log)).join('')}
          </div>
        </div>
        
        <div class="action-buttons">
          <button class="btn-approve" id="actionApprove" style="display: none;">✓ Approve</button>
          <button class="btn-action-run" id="actionRun" style="display: none;">▶ Run</button>
          <button class="btn-action-cancel" id="actionCancel" style="display: none;">✕ Cancel</button>
        </div>
      </div>
    `;
  },

  renderStep(step, index) {
    const status = step.status || 'pending';
    const statusIcons = {
      pending: '○',
      running: '◉',
      completed: '✓',
      failed: '✗',
      skipped: '→',
    };
    
    return `
      <div class="action-step ${status}">
        <span class="step-icon">${statusIcons[status] || '○'}</span>
        <span class="step-name">${this.escape(step.title || `Step ${index + 1}`)}</span>
        <span class="step-status">${status}</span>
      </div>
    `;
  },

  renderLog(log) {
    const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
    const level = log.level || 'info';
    
    return `
      <div class="log-entry ${level}">
        <span class="log-time">${time}</span>
        <span class="log-message">${this.escape(log.message || '')}</span>
      </div>
    `;
  },

  setupEvents(panelId) {
    const approveBtn = document.getElementById('actionApprove');
    const runBtn = document.getElementById('actionRun');
    const cancelBtn = document.getElementById('actionCancel');

    if (approveBtn) {
      approveBtn.addEventListener('click', () => {
        this.approveAction();
      });
    }

    if (runBtn) {
      runBtn.addEventListener('click', () => {
        this.runAction();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.cancelAction();
      });
    }
  },

  /**
   * Show approve button (when action is proposed)
   */
  showApproveButton() {
    const approveBtn = document.getElementById('actionApprove');
    const runBtn = document.getElementById('actionRun');
    const cancelBtn = document.getElementById('actionCancel');
    
    if (approveBtn) approveBtn.style.display = 'block';
    if (runBtn) runBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
  },

  /**
   * Show run button (when action is approved but not running)
   */
  showRunButton() {
    const approveBtn = document.getElementById('actionApprove');
    const runBtn = document.getElementById('actionRun');
    const cancelBtn = document.getElementById('actionCancel');
    
    if (approveBtn) approveBtn.style.display = 'none';
    if (runBtn) runBtn.style.display = 'block';
    if (cancelBtn) cancelBtn.style.display = 'none';
  },

  /**
   * Show cancel button (when action is running)
   */
  showCancelButton() {
    const approveBtn = document.getElementById('actionApprove');
    const runBtn = document.getElementById('actionRun');
    const cancelBtn = document.getElementById('actionCancel');
    
    if (approveBtn) approveBtn.style.display = 'none';
    if (runBtn) runBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'block';
  },

  /**
   * Hide all action buttons
   */
  hideButtons() {
    const approveBtn = document.getElementById('actionApprove');
    const runBtn = document.getElementById('actionRun');
    const cancelBtn = document.getElementById('actionCancel');
    
    if (approveBtn) approveBtn.style.display = 'none';
    if (runBtn) runBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
  },

  /**
   * Add log entry
   */
  addLog(message, level = 'info') {
    window.dispatchEvent(new CustomEvent('action-log', { 
      detail: { message, level, timestamp: new Date().toISOString() } 
    }));
    
    // Scroll logs to bottom
    const logsEl = document.getElementById('actionLogs');
    if (logsEl) {
      logsEl.scrollTop = logsEl.scrollHeight;
    }
  },

  /**
   * Update action progress
   */
  updateProgress(action, steps, status) {
    window.dispatchEvent(new CustomEvent('action-progress', { 
      detail: { action, steps, status } 
    }));
  },

  async approveAction() {
    // Dispatch event for Sessions to handle
    window.dispatchEvent(new CustomEvent('action-approve'));
  },

  async runAction() {
    // Dispatch event for Sessions to handle
    window.dispatchEvent(new CustomEvent('action-run'));
  },

  async cancelAction() {
    // Dispatch event for Sessions to handle
    window.dispatchEvent(new CustomEvent('action-cancel'));
  },

  escape(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

window.ActionsPanel = ActionsPanel;
