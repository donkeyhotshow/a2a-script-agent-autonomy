# Web UI Design System (A2A Script Agent)

The A2A Web Interface uses a modern, premium "Glassmorphism" aesthetic with a deep dark theme and Indigo accents.

## 🎨 Color Palette

| Token | Value | Sample | Description |
|-------|-------|--------|-------------|
| `--color-bg-primary` | `#0d0d14` | 🌑 | Deep black/blue background |
| `--color-accent` | `#6366f1` | 🟣 | Indigo primary brand color |
| `--brand-gradient` | `linear-gradient(135deg, #6366f1, #8b5cf6)` | 🌈 | Primary UI gradient |
| `--color-success` | `#22c55e` | 🟢 | Positive actions and status |
| `--color-error` | `#ef4444` | 🔴 | Errors and warnings |

## 🧪 Visual Effects

### Glassmorphism
- **Background**: `rgba(18, 18, 28, 0.85)`
- **Border**: `rgba(255, 255, 255, 0.1)`
- **Blur**: `16px` (backdrop-filter)
- **Shadow**: `0 8px 32px rgba(0, 0, 0, 0.6)`

### Shadows & Glow
- **Glow**: Subtle `0 0 20px rgba(99, 102, 241, 0.15)` Indigo glow applied to active components and buttons.
- **Shadows**: Strong black shadows for depth and stratification in the floating panel environment.

## 📐 Layout & Spacing

- **Base font-size**: `14px`
- **Typography**: `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `system-ui` (Sans-serif)
- **Mono font**: `JetBrains Mono`, `Fira Code` (for terminal and code blocks)
- **Border-radius**: `12px` (standard), `16px` (large/modal)

## ⚡ Transitions & Keyframes

- **Timing**: `0.25s` (base), `0.15s` (fast)
- **Ease**: `cubic-bezier(0.4, 0, 0.2, 1)` for smooth slide-up animations.
- **Pulse**: Monotonic `pulse 2s infinite` applied to pending task indicators.
- **Fade**: Simple `fade-in 0.2s ease` for modal overlays and UI transitions.
