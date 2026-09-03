# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a vanilla JavaScript Tetris game—no build system, no frameworks, no dependencies. The game runs directly in the browser using HTML5 Canvas and the Canvas 2D API. All code is plain JavaScript (ES6+).

**Files:**
- `index.html` — DOM structure and canvas setup
- `style.css` — Dark theme styling
- `game.js` — Complete game logic (~300 lines)

## Running and Testing

The game has no build step. To test changes:

1. **Direct file**: Open `index.html` directly in a browser
2. **Local server** (preferred for development):
   - Python: `python3 -m http.server 8000`
   - Node: `npx serve .`
   - Then visit `http://localhost:PORT`

**Testing approach:** Manual play-testing. When you make changes to game logic, rendering, or UI, play through a full game to verify correctness: piece spawning, collision detection, rotation, line clearing, scoring, and difficulty progression.

## Game Architecture

**Game Loop**: Uses `requestAnimationFrame` with delta-time accumulation to update and render smoothly.

**Game State**: Managed in `game.js`:
- Board matrix (20×10 cells)
- Current falling piece + next piece
- Score, lines cleared, level

**Core Mechanics**:
- 7 standard Tetris pieces with rotation (transpose + reverse)
- Collision detection with wall-kick handling (5 positions: 0, ±1, ±2)
- Line clearing (bottom-up to avoid O(n²) bugs)
- Soft drop (1 point/row) and hard drop (2 points/cell)
- Ghost piece preview
- Dynamic difficulty: Level increases per 10 lines; speed formula is `max(100ms, 1000 - (level-1)×90ms)`

## Tunable Parameters

All in `game.js`:

| Constant | Default | Purpose |
|----------|---------|---------|
| `COLS`, `ROWS` | 10, 20 | Board dimensions |
| `BLOCK` | 30px | Cell/block size |
| `COLORS` | 7 hex values | Piece color palette |
| `LINE_SCORES` | [0,100,300,500,800] | Points for 1–4 line clears |

**⚠️ Critical Gotcha**: Changing `COLS`, `ROWS`, or `BLOCK` requires manually updating the canvas size in `index.html` (line 12). Canvas width must equal `COLS * BLOCK`; height must equal `ROWS * BLOCK`. If these don't match, rendering will be distorted or clipped.

## Code Style

- Use ES6+ features: `const`/`let`, arrow functions, template literals
- Keep code vanilla JS—no frameworks, no npm dependencies
- Prefer readability and simplicity over clever abstractions
- When refactoring, ensure the canvas-sizing gotcha remains documented

## When Adding Features or Fixing Bugs

1. Understand the game loop and state flow before changing rendering or logic
2. Test collision detection and rotation carefully (wall-kick logic has 5 positions)
3. Verify line-clearing logic processes rows in the correct order (bottom-up)
4. If changing board dimensions, update the canvas size in HTML immediately
5. Manual play-test the full feature (spawn, movement, rotation, line clear, game over, restart)
