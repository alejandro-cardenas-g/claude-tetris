'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const pauseMenu = document.getElementById('pause-menu');
const pauseResumeBtn = document.getElementById('pause-resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const pauseControlsBtn = document.getElementById('pause-controls-btn');
const startLevelSelect = document.getElementById('start-level');
const controlsModal = document.getElementById('controls-modal');
const controlsCloseBtn = document.getElementById('controls-close-btn');
const statsContainer = document.getElementById('stats-container');
const nameInputContainer = document.getElementById('name-input-container');
const playerNameInput = document.getElementById('player-name');
const saveScoreBtn = document.getElementById('save-score-btn');
const recordsPanel = document.getElementById('records-panel');
const recordsList = document.getElementById('records-list');
const viewRecordsBtn = document.getElementById('view-records-btn');
const closeRecordsBtn = document.getElementById('close-records-btn');
const resetRecordsBtn = document.getElementById('reset-records-btn');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, startLevel, bestCombo, maxLinesCleared;

function getThemeColor(varName) {
  return getComputedStyle(document.body).getPropertyValue(varName).trim();
}

function applyTheme(theme) {
  document.body.classList.remove('theme-dark', 'theme-light');
  document.body.classList.add(`theme-${theme}`);
  themeToggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('theme', theme);
  if (typeof board !== 'undefined' && board) {
    draw();
    drawNext();
  }
}

function toggleTheme() {
  const isDark = document.body.classList.contains('theme-dark');
  applyTheme(isDark ? 'light' : 'dark');
}

applyTheme(localStorage.getItem('theme') === 'light' ? 'light' : 'dark');
themeToggleBtn.addEventListener('click', toggleTheme);
startLevel = '1';

function getRecords() {
  try {
    const data = localStorage.getItem('tetrisRecords');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  try {
    localStorage.setItem('tetrisRecords', JSON.stringify(records));
  } catch (e) {
    console.error('Error saving records:', e);
  }
}

function isTopScore(score) {
  const records = getRecords();
  return records.length < 5 || score > records[records.length - 1].score;
}

function addRecord(name, score, lines, bestCombo, level) {
  const records = getRecords();
  records.push({ name: name || 'Anónimo', score, lines, bestCombo, level, date: new Date().toISOString() });
  records.sort((a, b) => b.score - a.score);
  saveRecords(records.slice(0, 5));
}

function renderRecords(highlightScore = null) {
  const records = getRecords();
  recordsList.innerHTML = '';

  if (records.length === 0) {
    recordsList.innerHTML = '<p style="text-align: center; color: var(--label-color); margin: 20px 0;">Sin récords aún. ¡Sé el primero!</p>';
    return;
  }

  records.forEach((record, idx) => {
    const isHighlight = highlightScore !== null && record.score === highlightScore;
    const item = document.createElement('div');
    item.className = `record-item ${isHighlight ? 'current' : ''}`;
    item.innerHTML = `
      <span class="record-rank">#${idx + 1}</span>
      <div class="record-info">
        <span class="record-name">${record.name}</span>
        <div class="record-details">
          <span>Líneas: ${record.lines}</span>
          <span>Combo: ${record.bestCombo}</span>
          <span>Nivel: ${record.level}</span>
        </div>
      </div>
      <span class="record-score">${record.score.toLocaleString()}</span>
    `;
    recordsList.appendChild(item);
  });
}

function showRecords(highlightScore = null) {
  renderRecords(highlightScore);
  recordsPanel.classList.remove('hidden');
}

function hideRecords() {
  recordsPanel.classList.add('hidden');
}

function resetRecords() {
  if (confirm('¿Deseas resetear todos los récords? Esta acción no se puede deshacer.')) {
    saveRecords([]);
    renderRecords();
  }
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    if (cleared > maxLinesCleared) maxLinesCleared = cleared;
    bestCombo++;
    updateHUD();
  } else {
    bestCombo = 0;
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = getThemeColor('--highlight-color');
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = getThemeColor('--grid-color');
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');

  if (isTopScore(score)) {
    playerNameInput.value = '';
    nameInputContainer.classList.remove('hidden');
    playerNameInput.focus();
  }
}

function showPauseMenu() {
  paused = true;
  cancelAnimationFrame(animId);
  pauseMenu.classList.remove('hidden');
}

function hidePauseMenu() {
  paused = false;
  pauseMenu.classList.add('hidden');
  lastTime = performance.now();
  loop(lastTime);
}

function showControlsModal() {
  controlsModal.classList.remove('hidden');
}

function hideControlsModal() {
  controlsModal.classList.add('hidden');
}

function togglePause() {
  if (gameOver) return;
  if (paused) {
    hidePauseMenu();
  } else {
    showPauseMenu();
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = parseInt(startLevel) || 1;
  paused = false;
  gameOver = false;
  bestCombo = 0;
  maxLinesCleared = 0;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  controlsModal.classList.add('hidden');
  statsContainer.classList.add('hidden');
  nameInputContainer.classList.add('hidden');
  recordsPanel.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP' || e.code === 'Escape') {
    togglePause();
    return;
  }
  if (controlsModal.classList.contains('hidden') === false) return;
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
pauseResumeBtn.addEventListener('click', hidePauseMenu);
pauseRestartBtn.addEventListener('click', () => {
  pauseMenu.classList.add('hidden');
  init();
});
pauseControlsBtn.addEventListener('click', showControlsModal);
controlsCloseBtn.addEventListener('click', hideControlsModal);
startLevelSelect.addEventListener('change', e => {
  startLevel = e.target.value;
});

saveScoreBtn.addEventListener('click', () => {
  const name = playerNameInput.value.trim() || 'Anónimo';
  addRecord(name, score, lines, bestCombo, level);
  nameInputContainer.classList.add('hidden');
  showRecords(score);
});

playerNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveScoreBtn.click();
  }
});

viewRecordsBtn.addEventListener('click', () => {
  showRecords();
});

closeRecordsBtn.addEventListener('click', hideRecords);
resetRecordsBtn.addEventListener('click', resetRecords);

init();
