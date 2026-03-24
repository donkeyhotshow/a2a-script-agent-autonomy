# Web UI Component Catalog

This document catalogizes all core UI components of the A2A Script Agent web interface, describing their visual appearance, HTML structure, and behavioral states.

## 1. Panels (pui-panel)

The primary container for task execution and workspace management.

- **Visuals**: Floating glassmorphic containers with Indigo headers.
- **States**: `floating` (default), `expanded` (active), `minimized` (cube), `closed`.
- **Transitions**: Smooth expansion from center and shrinking to taskbar cubes.

```html
<div class="pui-panel">
  <div class="pui-panel-header">
    <span class="pui-panel-title">Task Title</span>
    <button class="pui-panel-close">&times;</button>
  </div>
  <div class="pui-panel-content">
    <!-- Component content -->
  </div>
</div>
```

## 2. Minimized Panels (Cubes)

Compact indicators for minimized or background tasks.

- **Visuals**: 16x16px glowing squares in the taskbar.
- **Color Coding**: Blue (task), Green (logs), Purple (chat), Gray (settings).
- **Interactions**: Left-click to restore, right-click for color cycle.

## 3. Modals

Standardized overlay windows for global configuration and alerts.

- **Visuals**: Centered Indigo-bordered cards over a blurred backdrop (`rgba(10, 10, 15, 0.8)`).
- **Types**: Settings, Projects Manager, Error Alerts.

```html
<div class="modal show">
  <div class="modal-content">
    <div class="modal-header">
      <h2>Title</h2>
      <button class="modal-close">&times;</button>
    </div>
    <div class="modal-body"><!-- Form or Content --></div>
    <div class="modal-footer"><!-- Buttons --></div>
  </div>
</div>
```

## 4. Taskbar

The main navigation and status area at the bottom/top of the interface.

- **Visuals**: Translucent blur strip containing the orchestrator status, active cubes, and session switcher.
- **Role**: Rebuilds the session list and maintains global connection status.

## 5. Status Badges

Visual indicators for task and connection states.

| Badge | Color | Animation | Meaning |
|-------|-------|-----------|---------|
| **pending** | Yellow | Pulse | Waiting for result/input |
| **active** | Green | - | Execution in progress |
| **completed** | Blue | - | Successfully finished |
| **error** | Red | Shake | Interaction failed |
