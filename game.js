// ─── Cores neon (sync com CSS) ────────────────────────────────
const NEON = {
  small:  { fill: '#ff00aa', glow: '#ff00aa' },
  medium: { fill: '#00ffff', glow: '#00ffff' },
  large:  { fill: '#00ff88', glow: '#00ff88' },
  base:   { fill: '#ffaa00', glow: '#ffaa00' },
  cube:   { fill: '#ff4444', glow: '#ff4444' },
  ipiece: { fill: '#cc00ff', glow: '#cc00ff' },
  ghost:  { fill: '#ffffff', glow: null },
};

// ─── Canvas responsivo ────────────────────────────────────────
const COLS = 10;
const ROWS = 22;

const boardCanvas   = document.getElementById('board');
const ctx           = boardCanvas.getContext('2d');
const previewCanvas = document.getElementById('preview');
const pCtx          = previewCanvas.getContext('2d');

let BLOCK = 28;

function resizeCanvas() {
  const controls   = document.getElementById('touch-controls');
  const sideHud    = document.getElementById('side-hud');
  const sideHudR   = document.getElementById('side-hud-right');

  const totalH     = window.innerHeight;
  const usedH      = controls.offsetHeight + 50;
  const availH     = Math.max(totalH - usedH, 200);

  const sideW      = (sideHud ? sideHud.offsetWidth : 66) + (sideHudR ? sideHudR.offsetWidth : 66) + 14;
  const availW     = Math.min(window.innerWidth, 480) - 8 - sideW;

  const blockByH   = Math.floor(availH / ROWS);
  const blockByW   = Math.floor(availW / COLS);
  BLOCK = Math.max(16, Math.min(blockByH, blockByW));

  boardCanvas.width  = COLS * BLOCK;
  boardCanvas.height = ROWS * BLOCK;
}

// ─── Peças T ──────────────────────────────────────────────────
function makeT(haste) {
  const cells = [[0,0],[1,0],[2,0]];
  for (let y = 1; y <= haste; y++) cells.push([1, y]);
  return cells;
}

function rotateCells(cells) {
  const px = 1, py = 0;
  return cells.map(([x, y]) => [px - (y - py), py + (x - px)]);
}

function normalize(cells) {
  const minX = Math.min(...cells.map(c => c[0]));
  const minY = Math.min(...cells.map(c => c[1]));
  return cells.map(([x, y]) => [x - minX, y - minY]);
}

function allRotations(cells) {
  const rots = [cells];
  for (let i = 0; i < 3; i++) rots.push(normalize(rotateCells(rots[rots.length-1])));
  return rots;
}

function randomPiece() {
  const tipos = [
    { tipo: 'small',  haste: 1 },
    { tipo: 'small',  haste: 1 },
    { tipo: 'medium', haste: 2 },
    { tipo: 'base',   haste: 0 },
    { tipo: 'cube',   haste: -1 },
    { tipo: 'ipiece', haste: -2 },
  ];
  const t = tipos[Math.floor(Math.random() * tipos.length)];
  let baseCells;
  if (t.tipo === 'cube')        baseCells = [[0,0]];
  else if (t.tipo === 'ipiece') baseCells = [[0,0],[0,1],[0,2],[0,3]];
  else if (t.tipo === 'base')   baseCells = [[0,0],[1,0],[2,0]];
  else                          baseCells = makeT(t.haste);
  const rots = allRotations(baseCells);
  return { cells: rots[0], rotations: rots, rotIndex: 0, tipo: t.tipo,
           x: Math.floor(COLS/2)-1, y: 0 };
}

// ─── Estado ───────────────────────────────────────────────────
let board, current, next, score, combo, level, lines, gameOver, paused, dropTimer;

const bgMusic       = document.getElementById('bg-music');
const gameoverMusic = document.getElementById('gameover-music');

// ─── Níveis: linhas acumuladas necessárias para avançar ───────
const LEVEL_THRESHOLDS = [0, 25, 45, 60, 70];

function getLevel(totalLines) {
  if (totalLines >= LEVEL_THRESHOLDS[4]) return 5;
  if (totalLines >= LEVEL_THRESHOLDS[3]) return 4;
  if (totalLines >= LEVEL_THRESHOLDS[2]) return 3;
  if (totalLines >= LEVEL_THRESHOLDS[1]) return 2;
  return 1;
}

function initGame() {
  resizeCanvas();
  board    = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  score    = 0; combo = 0; level = 1; lines = 0;
  gameOver = false; paused = false;
  next     = randomPiece();
  spawnPiece();
  updateHUD();
  hideOverlay();
  clearInterval(dropTimer);
  dropTimer = setInterval(tick, getDropInterval());
  gameoverMusic.pause();
  gameoverMusic.currentTime = 0;
  bgMusic.currentTime = 0;
  bgMusic.play().catch(() => {});
}

function getDropInterval() {
  const intervals = [1500, 1000, 600, 300, 120];
  return intervals[Math.min(level - 1, 4)];
}

function spawnPiece() {
  current   = next;
  current.x = Math.floor(COLS/2)-1;
  current.y = 0;
  next      = randomPiece();
  if (collides(current.cells, current.x, current.y)) triggerGameOver();
}

// ─── Colisão ─────────────────────────────────────────────────
function collides(cells, ox, oy) {
  for (const [cx, cy] of cells) {
    const nx = ox+cx, ny = oy+cy;
    if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
    if (ny >= 0 && board[ny][nx]) return true;
  }
  return false;
}

// ─── Tick ────────────────────────────────────────────────────
function tick() {
  if (gameOver || paused) return;
  if (!collides(current.cells, current.x, current.y+1)) current.y++;
  else lockPiece();
  draw();
}

function lockPiece() {
  for (const [cx, cy] of current.cells) {
    const nx = current.x+cx, ny = current.y+cy;
    if (ny >= 0) board[ny][nx] = current.tipo;
  }
  clearLines();
  spawnPiece();
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS-1; y >= 0; y--) {
    if (board[y].every(c => c !== null)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++; y++;
    }
  }
  if (cleared > 0) {
    combo++;
    const base = [0,100,300,500,800][Math.min(cleared,4)];
    const pts  = base * level * combo;
    score += pts; lines += cleared;
    level  = getLevel(lines);
    clearInterval(dropTimer);
    dropTimer = setInterval(tick, getDropInterval());
    showOverlay(`compilada`, '#00ff88', 1200);
  } else { combo = 0; }
  updateHUD();
}

// ─── Movimentos ──────────────────────────────────────────────
function moveLeft()  { if (!gameOver&&!paused&&!collides(current.cells,current.x-1,current.y)) { current.x--; draw(); } }
function moveRight() { if (!gameOver&&!paused&&!collides(current.cells,current.x+1,current.y)) { current.x++; draw(); } }
function moveDown()  { if (!gameOver&&!paused) { if (!collides(current.cells,current.x,current.y+1)) current.y++; else lockPiece(); draw(); } }

function rotate() {
  if (gameOver||paused) return;
  const nextRot = current.rotations[(current.rotIndex+1)%4];
  for (const k of [0,-1,1,-2,2]) {
    if (!collides(nextRot, current.x+k, current.y)) {
      current.cells    = nextRot;
      current.rotIndex = (current.rotIndex+1)%4;
      current.x       += k;
      break;
    }
  }
  draw();
}

function hardDrop() {
  if (gameOver||paused) return;
  while (!collides(current.cells, current.x, current.y+1)) current.y++;
  lockPiece(); draw();
}

// ─── HUD ─────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('score').textContent = score;
  document.getElementById('combo').textContent = `x${combo}`;
  document.getElementById('level').textContent = level;
}

// ─── Overlay ─────────────────────────────────────────────────
let overlayTimeout;
function showOverlay(msg, color, duration) {
  const el    = document.getElementById('overlay');
  const msgEl = document.getElementById('overlay-msg');
  msgEl.textContent   = msg;
  msgEl.style.color      = color;
  msgEl.style.textShadow = `0 0 20px ${color}, 0 0 40px ${color}`;
  el.classList.remove('hidden');
  clearTimeout(overlayTimeout);
  if (duration) overlayTimeout = setTimeout(hideOverlay, duration);
}
function hideOverlay() { document.getElementById('overlay').classList.add('hidden'); }

function triggerGameOver() {
  gameOver = true;
  clearInterval(dropTimer);
  bgMusic.pause();
  gameoverMusic.currentTime = 0;
  gameoverMusic.play().catch(() => {});
  showOverlay('JÁ FOSTE', '#ff2244', null);
}

// ─── Render ───────────────────────────────────────────────────
function drawBlock(context, x, y, tipo, alpha=1) {
  const col = NEON[tipo];
  if (!col) return;
  context.save();
  context.globalAlpha  = alpha;
  if (col.glow) { context.shadowColor = col.glow; context.shadowBlur = 10; }
  context.fillStyle = col.fill;
  context.fillRect(x*BLOCK+1, y*BLOCK+1, BLOCK-2, BLOCK-2);
  // brilho interno
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x*BLOCK+2, y*BLOCK+2, BLOCK-4, 4);
  context.restore();
}

function drawGrid() {
  ctx.strokeStyle = '#111122';
  ctx.lineWidth   = 0.5;
  for (let x=0; x<=COLS; x++) {
    ctx.beginPath(); ctx.moveTo(x*BLOCK,0); ctx.lineTo(x*BLOCK,ROWS*BLOCK); ctx.stroke();
  }
  for (let y=0; y<=ROWS; y++) {
    ctx.beginPath(); ctx.moveTo(0,y*BLOCK); ctx.lineTo(COLS*BLOCK,y*BLOCK); ctx.stroke();
  }
}

function drawGhost() {
  let gy = current.y;
  while (!collides(current.cells, current.x, gy+1)) gy++;
  if (gy === current.y) return;
  for (const [cx,cy] of current.cells)
    drawBlock(ctx, current.x+cx, gy+cy, 'ghost', 0.18);
}

function draw() {
  ctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  drawGrid();
  for (let y=0; y<ROWS; y++)
    for (let x=0; x<COLS; x++)
      if (board[y][x]) drawBlock(ctx, x, y, board[y][x]);
  if (!gameOver) { drawGhost(); }
  if (!gameOver)
    for (const [cx,cy] of current.cells)
      drawBlock(ctx, current.x+cx, current.y+cy, current.tipo);

  // preview
  pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  const pc   = next.cells;
  const minX = Math.min(...pc.map(c=>c[0]));
  const minY = Math.min(...pc.map(c=>c[1]));
  const maxX = Math.max(...pc.map(c=>c[0]));
  const maxY = Math.max(...pc.map(c=>c[1]));
  const bk   = 14;
  const offX = Math.floor((4-(maxX-minX+1))/2);
  const offY = Math.floor((4-(maxY-minY+1))/2);
  const col  = NEON[next.tipo];
  for (const [cx,cy] of pc) {
    pCtx.save();
    if (col.glow) { pCtx.shadowColor=col.glow; pCtx.shadowBlur=8; }
    pCtx.fillStyle = col.fill;
    pCtx.fillRect((cx-minX+offX)*bk+2,(cy-minY+offY)*bk+2,bk-2,bk-2);
    pCtx.restore();
  }
}

// ─── Touch ───────────────────────────────────────────────────
function bindTouch(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('touchstart', e => { e.preventDefault(); fn(); }, { passive: false });
  el.addEventListener('mousedown',  e => { e.preventDefault(); fn(); });
}

bindTouch('tc-left',   moveLeft);
bindTouch('tc-right',  moveRight);
bindTouch('tc-rotate', rotate);
bindTouch('tc-drop',   hardDrop);
bindTouch('tc-pause',  togglePause);

// ─── Teclado (PC) ────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key==='p'||e.key==='P') { if (!gameOver) togglePause(); return; }
  if (paused||gameOver) return;
  switch(e.key) {
    case 'ArrowLeft':  e.preventDefault(); moveLeft();  break;
    case 'ArrowRight': e.preventDefault(); moveRight(); break;
    case 'ArrowDown':  e.preventDefault(); moveDown();  break;
    case 'ArrowUp':    e.preventDefault(); rotate();    break;
    case ' ':          e.preventDefault(); hardDrop();  break;
  }
});

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (paused) { bgMusic.pause(); showOverlay('PAUSADO', '#cc00ff', null); }
  else { bgMusic.play().catch(() => {}); hideOverlay(); }
}

// ─── Botões ──────────────────────────────────────────────────
document.getElementById('btn-restart').addEventListener('click', initGame);

const introMusic = document.getElementById('intro-music');

// ─── Ecrã inicial ────────────────────────────────────────────
document.getElementById('btn-play').addEventListener('click', () => {
  introMusic.pause();
  introMusic.currentTime = 0;
  document.getElementById('start-screen').classList.add('hidden');
  initGame();
});

// ─── Resize ──────────────────────────────────────────────────
window.addEventListener('resize', () => { resizeCanvas(); draw(); });

// ─── Botão continuar (logo → ecrã inicial) ───────────────────
document.getElementById('btn-continue').addEventListener('click', () => {
  document.getElementById('logo-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
  introMusic.play().catch(() => {});
});

// ─── Start ───────────────────────────────────────────────────
window.addEventListener('load', () => {
  resizeCanvas();
});
