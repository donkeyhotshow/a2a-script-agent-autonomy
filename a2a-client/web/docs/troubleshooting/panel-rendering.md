# Panel Rendering Issues

> **⚠️ Deprecated:** This document references `PanelManager` which was planned but never implemented. 
> Panel management is now handled via `window-registry.js` and render functions in `task-flow/render.js`.
> See [window-registry.md](../api-reference/window-registry.md) for current implementation.

Common problems with panel display, positioning, and lifecycle management.

## Layout Corruption

### Panel Not Showing

**Symptoms:**
- Panel created but not visible
- Panel exists in DOM but not displayed
- `panel.show()` called but no effect

**Common Causes:**
- CSS not loaded
- Z-index conflicts
- Container positioning issues
- Modal backdrop blocking

**Diagnostic Steps:**
```javascript
function diagnosePanelVisibility(panelId) {
  const panel = PanelManager.get(panelId);
  if (!panel) {
    console.error('Panel not found:', panelId);
    return;
  }

  console.log('Panel state:', {
    id: panel.id,
    state: panel.state,
    visible: panel.container.style.display !== 'none',
    inDOM: document.body.contains(panel.container),
    position: panel.container.style.cssText,
    zIndex: panel.container.style.zIndex
  });

  // Check CSS
  const computed = window.getComputedStyle(panel.container);
  console.log('Computed style:', {
    display: computed.display,
    visibility: computed.visibility,
    opacity: computed.opacity,
    zIndex: computed.zIndex
  });
}
```

**Fixes:**

1. **CSS Loading Issues**
```javascript
// Check if panel CSS is loaded
function verifyCSSLoaded() {
  const testEl = document.createElement('div');
  testEl.className = 'pm-panel';
  document.body.appendChild(testEl);

  const computed = window.getComputedStyle(testEl);
  if (computed.display === 'none' || computed.opacity === '0') {
    console.error('Panel CSS not loaded properly');
  }

  testEl.remove();
}
```

2. **Z-Index Conflicts**
```javascript
// Fix z-index issues
function fixZIndexConflicts() {
  const panels = PanelManager.getVisible();
  let baseZ = 1000;

  panels.forEach(panel => {
    panel.container.style.zIndex = baseZ++;
  });

  PanelManager.bringToFront(panels[panels.length - 1].id);
}
```

3. **Container Issues**
```javascript
// Ensure panel is properly mounted
function remountPanel(panelId) {
  const panel = PanelManager.get(panelId);
  if (!panel) return;

  // Remove from current location
  if (panel.container.parentNode) {
    panel.container.remove();
  }

  // Re-mount
  PanelManager._mount.appendChild(panel.container);
  panel.show();
}
```

### Panel Positioning Problems

**Symptoms:**
- Panels appear in wrong location
- Floating panels not draggable
- Panels overlap incorrectly
- Off-screen positioning

**Diagnostic:**
```javascript
function checkPanelPositioning(panelId) {
  const panel = PanelManager.get(panelId);
  if (!panel) return;

  const rect = panel.container.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  console.log('Positioning info:', {
    panelRect: rect,
    viewport: viewport,
    isOffScreen: rect.right < 0 || rect.bottom < 0 ||
                 rect.left > viewport.width || rect.top > viewport.height,
    isFloating: panel.config.slot === 'floating',
    dragEnabled: panel.config.slot === 'floating'
  });

  // Check drag handlers
  if (panel.config.slot === 'floating') {
    const hasDragHandler = panel.header &&
      panel.header.style.cursor === 'move';
    console.log('Drag enabled:', hasDragHandler);
  }
}
```

**Fixes:**

1. **Reset Positioning**
```javascript
function resetPanelPosition(panelId) {
  const panel = PanelManager.get(panelId);
  if (!panel || panel.config.slot !== 'floating') return;

  // Reset to default position
  panel.position = { x: 50, y: 50 };
  panel.container.style.left = '50px';
  panel.container.style.top = '50px';

  // Ensure visible
  panel.container.style.display = '';
  PanelManager.bringToFront(panelId);
}
```

2. **Fix Drag Functionality**
```javascript
function restoreDragFunctionality(panelId) {
  const panel = PanelManager.get(panelId);
  if (!panel || panel.config.slot !== 'floating') return;

  // Re-bind drag events
  const header = panel.header;
  if (!header) return;

  header.style.cursor = 'move';

  let isDragging = false;
  let startX, startY, startLeft, startTop;

  header.onmousedown = (e) => {
    if (e.target.closest('.pm-btn')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = panel.container.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    panel.container.classList.add('pm-dragging');
    e.preventDefault();
  };

  document.onmousemove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const newLeft = Math.max(0, startLeft + dx);
    const newTop = Math.max(0, startTop + dy);
    panel.container.style.left = `${newLeft}px`;
    panel.container.style.top = `${newTop}px`;
  };

  document.onmouseup = () => {
    if (isDragging) {
      isDragging = false;
      panel.container.classList.remove('pm-dragging');
    }
  };
}
```

## State Synchronization Problems

### Panel State Desync

**Symptoms:**
- Panel shows as visible but state is 'closed'
- Minimize button doesn't work
- Panel state doesn't match UI

**Diagnostic:**
```javascript
function auditPanelStates() {
  const panels = Array.from(PanelManager._panels.values());
  const issues = [];

  panels.forEach(panel => {
    const actualVisible = panel.container.style.display !== 'none';
    const stateVisible = panel.state === PANEL_STATES.VISIBLE;
    const indicatorVisible = panel.indicator.style.display === 'flex';

    if (actualVisible !== stateVisible) {
      issues.push({
        panel: panel.id,
        issue: 'visibility mismatch',
        state: panel.state,
        actualVisible,
        indicatorVisible
      });
    }

    if (panel.state === PANEL_STATES.MINIMIZED && !indicatorVisible) {
      issues.push({
        panel: panel.id,
        issue: 'minimized without indicator'
      });
    }
  });

  return issues;
}

// Check for issues
const issues = auditPanelStates();
if (issues.length > 0) {
  console.error('Panel state issues:', issues);
}
```

**Fixes:**

1. **Resync Panel State**
```javascript
function resyncPanelState(panelId) {
  const panel = PanelManager.get(panelId);
  if (!panel) return;

  // Force state based on current DOM
  const isVisible = panel.container.style.display !== 'none';
  const isIndicatorVisible = panel.indicator.style.display === 'flex';

  if (isVisible && panel.state !== PANEL_STATES.VISIBLE) {
    panel.state = PANEL_STATES.VISIBLE;
  } else if (isIndicatorVisible && panel.state !== PANEL_STATES.MINIMIZED) {
    panel.state = PANEL_STATES.MINIMIZED;
  } else if (!isVisible && !isIndicatorVisible && panel.state !== PANEL_STATES.CLOSED) {
    panel.state = PANEL_STATES.CLOSED;
  }

  console.log(`Panel ${panelId} resynced to state: ${panel.state}`);
}
```

2. **Rebuild Panel UI**
```javascript
function rebuildPanelUI(panelId) {
  const panel = PanelManager.get(panelId);
  if (!panel) return;

  // Save current state
  const wasVisible = panel.state === PANEL_STATES.VISIBLE;
  const wasMinimized = panel.state === PANEL_STATES.MINIMIZED;

  // Destroy and recreate
  const config = { ...panel.config, id: panel.id };
  PanelManager.remove(panelId);

  const newPanel = PanelManager.create(panel.type, config);
  if (wasVisible) {
    newPanel.show();
  } else if (wasMinimized) {
    newPanel.minimize();
  }

  console.log(`Panel ${panelId} rebuilt`);
}
```

## Memory Leaks in Panel Management

### Leak Detection

**Symptoms:**
- Increasing memory usage over time
- Browser slowdown with many panels
- Detached DOM elements accumulating

**Diagnostic Tools:**
```javascript
function detectPanelLeaks() {
  const panelCount = PanelManager._panels.size;
  console.log(`Active panels: ${panelCount}`);

  // Check for detached DOM
  let detachedCount = 0;
  PanelManager._panels.forEach((panel, id) => {
    if (!panel.container.isConnected) {
      console.warn(`Panel ${id} has detached container`);
      detachedCount++;
    }
    if (panel.indicator && !panel.indicator.isConnected) {
      console.warn(`Panel ${id} has detached indicator`);
      detachedCount++;
    }
  });

  // Check event listeners (approximate)
  const totalListeners = panelCount * 5; // Rough estimate
  console.log(`Estimated event listeners: ${totalListeners}`);

  return { panelCount, detachedCount };
}
```

**Cleanup Procedures:**

1. **Remove Detached Panels**
```javascript
function cleanupDetachedPanels() {
  const toRemove = [];

  PanelManager._panels.forEach((panel, id) => {
    if (!panel.container.isConnected) {
      toRemove.push(id);
    }
  });

  toRemove.forEach(id => {
    console.log(`Removing detached panel: ${id}`);
    PanelManager.remove(id);
  });

  return toRemove.length;
}
```

2. **Force Garbage Collection**
```javascript
function forcePanelCleanup() {
  // Close all non-critical panels
  PanelManager.closeAll();

  // Wait for cleanup
  setTimeout(() => {
    if (window.gc) {
      window.gc(); // Only works with --js-flags="--expose-gc"
    }
    console.log('Panel cleanup completed');
  }, 1000);
}
```

## Z-Index and Positioning Issues

### Z-Index Conflicts

**Symptoms:**
- Panels appearing behind other elements
- Modal panels not on top
- Incorrect stacking order

**Diagnostic:**
```javascript
function analyzeZIndexIssues() {
  const elements = Array.from(document.querySelectorAll('*'));
  const zIndexMap = new Map();

  elements.forEach(el => {
    const zIndex = window.getComputedStyle(el).zIndex;
    if (zIndex !== 'auto' && zIndex !== '0') {
      zIndexMap.set(parseInt(zIndex), (zIndexMap.get(parseInt(zIndex)) || 0) + 1);
    }
  });

  console.log('Z-index distribution:', Object.fromEntries(zIndexMap));

  // Check panel z-indices
  PanelManager._panels.forEach((panel, id) => {
    const zIndex = panel.container.style.zIndex;
    console.log(`Panel ${id} z-index: ${zIndex}`);
  });
}
```

**Fixes:**

1. **Reset Z-Index Hierarchy**
```javascript
function resetZIndexHierarchy() {
  let baseZ = 1000;

  // Reset all panels
  PanelManager._panels.forEach((panel, id) => {
    panel.container.style.zIndex = baseZ++;
    if (panel.indicator) {
      panel.indicator.style.zIndex = baseZ++;
    }
  });

  // Handle modal panels
  const modalPanels = Array.from(PanelManager._panels.values())
    .filter(p => p.config.slot === 'modal' && p.state === PANEL_STATES.VISIBLE);

  modalPanels.forEach(panel => {
    panel.container.style.zIndex = 9999;
    if (panel.backdrop) {
      panel.backdrop.style.zIndex = 9998;
    }
  });

  console.log('Z-index hierarchy reset');
}
```

2. **Fix Modal Positioning**
```javascript
function fixModalPositioning() {
  const modalPanels = PanelManager.getByType('modal')
    .filter(p => p.state === PANEL_STATES.VISIBLE);

  modalPanels.forEach(panel => {
    // Center modal
    panel.container.style.position = 'fixed';
    panel.container.style.left = '50%';
    panel.container.style.top = '50%';
    panel.container.style.transform = 'translate(-50%, -50%)';

    // Ensure backdrop
    if (panel.backdrop && !panel.backdrop.parentNode) {
      document.body.appendChild(panel.backdrop);
    }
  });
}
```

## Modal-Specific Issues

### Modal Backdrop Problems

**Symptoms:**
- Modal appears without backdrop
- Clicks pass through backdrop
- Multiple modals conflicting

**Fixes:**
```javascript
function fixModalBackdrop(panelId) {
  const panel = PanelManager.get(panelId);
  if (!panel || panel.config.slot !== 'modal') return;

  // Ensure backdrop exists
  if (!panel.backdrop) {
    panel.backdrop = document.createElement('div');
    panel.backdrop.className = 'pm-modal-backdrop';
    panel.backdrop.addEventListener('click', () => panel.close());
  }

  // Ensure backdrop is mounted and positioned
  if (!panel.backdrop.parentNode) {
    document.body.appendChild(panel.backdrop);
  }

  panel.backdrop.style.zIndex = (parseInt(panel.container.style.zIndex) - 1).toString();
}
```

### Modal Stacking Issues
```javascript
function fixModalStacking() {
  const modals = PanelManager.getByType('modal')
    .filter(p => p.state === PANEL_STATES.VISIBLE);

  if (modals.length > 1) {
    console.warn('Multiple modals visible, this may cause issues');

    // Keep only the top modal
    modals.slice(0, -1).forEach(panel => panel.close());
  }
}
```

## Animation and Transition Issues

### CSS Transition Problems

**Symptoms:**
- Panel animations not working
- Transitions causing layout jumps
- Performance issues with animations

**Diagnostic:**
```javascript
function checkCSSTransitions() {
  const testPanel = document.createElement('div');
  testPanel.className = 'pm-panel pm-floating';
  document.body.appendChild(testPanel);

  const computed = window.getComputedStyle(testPanel);
  console.log('Transition properties:', {
    transition: computed.transition,
    transform: computed.transform,
    willChange: computed.willChange
  });

  testPanel.remove();
}
```

**Performance Optimizations:**
```javascript
function optimizePanelAnimations() {
  // Use transform for movement instead of changing position
  PanelManager._panels.forEach((panel, id) => {
    if (panel.config.slot === 'floating') {
      panel.container.style.willChange = 'transform';
      panel.container.style.transition = 'transform 0.2s ease-out';
    }
  });
}
```

## Panel Content Issues

### Content Not Updating

**Symptoms:**
- Panel content stale or empty
- Dynamic content not rendering
- Content updates not reflected

**Diagnostic:**
```javascript
function inspectPanelContent(panelId) {
  const panel = PanelManager.get(panelId);
  if (!panel) return;

  console.log('Panel content:', {
    hasContentEl: !!panel.content,
    contentHTML: panel.content.innerHTML.substring(0, 200) + '...',
    childCount: panel.content.children.length,
    textContent: panel.content.textContent.substring(0, 100) + '...'
  });
}
```

**Fixes:**

1. **Force Content Refresh**
```javascript
function refreshPanelContent(panelId, newContent) {
  const panel = PanelManager.get(panelId);
  if (!panel) return;

  // Clear existing content
  panel.content.innerHTML = '';

  // Set new content
  panel.setContent(newContent);

  console.log(`Content refreshed for panel ${panelId}`);
}
```

2. **Content Synchronization**
```javascript
function syncPanelContentWithState() {
  // Sync task panel with execute state
  const taskPanel = PanelManager.getByType('task')[0];
  if (taskPanel) {
    const execute = SessionStore.execute;
    if (execute) {
      // Update panel content based on execute
      const content = generateContentForExecute(execute);
      taskPanel.setContent(content);
    }
  }
}
```

## Emergency Recovery

### Complete Panel Reset
```javascript
function emergencyPanelReset() {
  console.log('Performing emergency panel reset...');

  // Destroy all panels
  PanelManager._panels.forEach((panel, id) => {
    try {
      panel.destroy();
    } catch (e) {
      console.error(`Error destroying panel ${id}:`, e);
    }
  });

  // Clear panel registry
  PanelManager._panels.clear();

  // Reset z-index counter
  PanelManager._zIndexBase = 1000;

  // Clear any remaining panel elements
  document.querySelectorAll('.pm-panel, .pm-indicator, .pm-modal-backdrop')
    .forEach(el => el.remove());

  console.log('Panel reset completed');
}
```

### Diagnostic Report
```javascript
function generatePanelDiagnosticReport() {
  const panels = Array.from(PanelManager._panels.values());

  return {
    timestamp: new Date().toISOString(),
    panelCount: panels.length,
    panels: panels.map(panel => ({
      id: panel.id,
      type: panel.type,
      state: panel.state,
      visible: panel.container.style.display !== 'none',
      inDOM: panel.container.isConnected,
      position: panel.position,
      size: panel.size,
      zIndex: panel.container.style.zIndex
    })),
    memoryUsage: performance.memory,
    issues: auditPanelStates()
  };
}

// Generate report
console.log('Panel Diagnostic Report:', generatePanelDiagnosticReport());
```