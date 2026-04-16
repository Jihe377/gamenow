# GameNow frontend design tokens

Single source of truth: **`styles.css`** `:root { … }`. This file is a short reference for new games (Battleship, UNO, Chess, …).

## Principles

- Use **CSS variables** for colors; avoid raw `#hex` in component rules.
- **Primary actions**: blue gradient (`--accent-gradient-*`) on white text (`--on-accent`).
- **Secondary actions**: ghost style (`--surface-soft` + `--ghost-fg`).
- **Destructive**: `--danger` / `--danger-bg` / `--danger-text` (not for primary CTA unless intentional).
- **Success / badges**: `--success`, `--badge-hot` for small labels.
- **Board / grid games**: prefix game-specific colors with `--board-*` or `--preview-*`; add new tokens under `:root` if a new game needs a palette (e.g. `--chess-light`, `--uno-red`).

## Token groups

| Group | Tokens | Use |
|-------|--------|-----|
| Page | `--bg-base`, `--bg-gradient-*`, `--bg-radial-tint` | `body` background |
| Text | `--text`, `--text-secondary`, `--text-tertiary`, `--muted`, `--muted-soft` | Copy hierarchy |
| Brand | `--accent`, `--accent-strong`, `--accent-eyebrow`, `--accent-gradient-*`, `--icon-gradient-*` | Buttons, icons, labels |
| Surfaces | `--card`, `--card-strong`, `--surface-*`, `--white` | Panels, inputs, chips |
| Borders | `--border`, `--border-input`, `--border-tile`, `--border-board`, `--border-dpad`, `--line-strong` | Dividers, inputs, seats |
| Semantic | `--danger`, `--danger-bg`, `--danger-text`, `--success`, `--success-border`, `--badge-hot` | Status, host badges, errors |
| Board (Battleship) | `--board-cell`, `--board-ship`, `--board-hit`, … `--preview-*` | Grids; copy pattern for other games |
| Chrome | `--shadow`, `--shadow-inset`, `--overlay-backdrop` | Elevation, modal dim |
| Focus | `--focus-ring`, `--focus-ring-width`, `--focus-ring-offset` | Keyboard `:focus-visible` |

## Keyboard focus

Global rules use `:focus-visible` with `--focus-ring`. Do not remove outlines without replacing them.

## Legacy aliases

`--bg`, `--blue`, `--blue-strong` still map to the new tokens for older references.
