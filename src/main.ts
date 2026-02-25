import * as THREE from 'three';
import { demoBeats } from './music-data';
import { generateLayout } from './layout';
import { Board } from './board';
import { Ball } from './ball';
import { EffectsManager } from './effects';
import { LyricsManager } from './lyrics';

// --- Scene setup ---
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// Background gradient - purple/blue
const bgCanvas = document.createElement('canvas');
bgCanvas.width = 2;
bgCanvas.height = 512;
const bgCtx = bgCanvas.getContext('2d')!;
const grad = bgCtx.createLinearGradient(0, 0, 0, 512);
grad.addColorStop(0, '#1a0533');
grad.addColorStop(0.3, '#0f1b4d');
grad.addColorStop(0.6, '#162055');
grad.addColorStop(1, '#0a0a2e');
bgCtx.fillStyle = grad;
bgCtx.fillRect(0, 0, 2, 512);
const bgTexture = new THREE.CanvasTexture(bgCanvas);
scene.background = bgTexture;

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 2, 18);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0x4444aa, 0.5);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xeeeeff, 1.0);
mainLight.position.set(5, 10, 10);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(1024, 1024);
scene.add(mainLight);

const pointLight1 = new THREE.PointLight(0xc084fc, 1.5, 30);
pointLight1.position.set(-5, 0, 5);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x67e8f9, 1.0, 30);
pointLight2.position.set(5, -10, 5);
scene.add(pointLight2);

// --- Generate layout from demo beats ---
const boardDataList = generateLayout(demoBeats);

// --- Create boards ---
const boards: Board[] = [];
for (const data of boardDataList) {
  boards.push(new Board(data, scene));
}

// --- Create ball ---
const ball = new Ball(scene);
ball.buildPath(boardDataList);

// --- Effects ---
const effects = new EffectsManager(scene, 15);

// --- Lyrics ---
const lyrics = new LyricsManager(scene);
lyrics.createLyrics(boardDataList);

// Glow colors for effects (match board colors)
const GLOW_COLORS = [
  new THREE.Color(0xff6b9d),
  new THREE.Color(0xc084fc),
  new THREE.Color(0x67e8f9),
  new THREE.Color(0xa3e635),
  new THREE.Color(0xfbbf24),
  new THREE.Color(0xf87171),
  new THREE.Color(0x60a5fa),
];

// --- Camera follow ---
let cameraTargetY = 2;
const CAMERA_SMOOTH = 0.03;

// --- Animation loop ---
const clock = new THREE.Clock(false); // don't auto-start
let isPlaying = false;
let lastTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now() / 1000;
  const dt = lastTime > 0 ? Math.min(now - lastTime, 0.05) : 0;
  lastTime = now;

  // Update ball and check for board hits
  const hitIndex = ball.update(isPlaying ? dt : 0);
  if (hitIndex >= 0 && hitIndex < boards.length) {
    boards[hitIndex].activate();
    effects.emit(
      boards[hitIndex].data.position.clone(),
      GLOW_COLORS[hitIndex % GLOW_COLORS.length]
    );
    lyrics.activate(hitIndex);
  }

  // Check if ball finished
  if (isPlaying && !ball.playing) {
    isPlaying = false;
    iconPlay.innerHTML = PLAY_SVG;
  }

  // Update boards
  for (const board of boards) {
    board.update(dt);
  }

  // Update effects
  effects.update(dt);

  // Update lyrics
  lyrics.update(dt);

  // Camera follows ball smoothly
  if (ball.playing) {
    cameraTargetY = ball.getPosition().y + 4;
  }
  camera.position.y += (cameraTargetY - camera.position.y) * CAMERA_SMOOTH;
  camera.lookAt(0, camera.position.y - 4, 0);

  // Move point lights with camera
  pointLight1.position.y = camera.position.y;
  pointLight2.position.y = camera.position.y - 10;

  // Update UI
  updateUI();

  renderer.render(scene, camera);
}

animate();

// --- UI ---
const btnPlay = document.getElementById('btn-play')!;
const btnReset = document.getElementById('btn-reset')!;
const iconPlay = document.getElementById('icon-play')!;
const progressBar = document.getElementById('progress-bar')!;
const timeDisplay = document.getElementById('time-display')!;

const PLAY_SVG = '<polygon points="6,4 20,12 6,20"/>';
const PAUSE_SVG = '<rect x="5" y="4" width="4" height="16"/><rect x="15" y="4" width="4" height="16"/>';

// Total duration from ball path
const totalDuration = ball.getTotalDuration() || 10;

function formatTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateUI() {
  const elapsed = Math.max(0, ball.elapsed);
  const pct = Math.min(100, (elapsed / totalDuration) * 100);
  progressBar.style.width = `${pct}%`;
  timeDisplay.textContent = `${formatTime(elapsed)} / ${formatTime(totalDuration)}`;
}

btnPlay.addEventListener('click', () => {
  if (!isPlaying) {
    // If ball finished, reset first
    if (!ball.playing && ball.elapsed > 0) {
      ball.reset(boardDataList);
      for (const board of boards) {
        board.activated = false;
        board.glowIntensity = 0;
        board.material.color.set(0x1a1a3e);
        board.material.emissiveIntensity = 0;
        board.glowMaterial.opacity = 0;
      }
      lyrics.reset();
      cameraTargetY = 2;
      camera.position.y = 2;
    }
    ball.play();
    isPlaying = true;
    iconPlay.innerHTML = PAUSE_SVG;
  }
});

btnReset.addEventListener('click', () => {
  isPlaying = false;
  ball.reset(boardDataList);
  for (const board of boards) {
    board.activated = false;
    board.glowIntensity = 0;
    board.material.color.set(0x1a1a3e);
    board.material.emissiveIntensity = 0;
    board.glowMaterial.opacity = 0;
  }
  lyrics.reset();
  cameraTargetY = 2;
  camera.position.y = 2;
  iconPlay.innerHTML = PLAY_SVG;
  progressBar.style.width = '0%';
  timeDisplay.textContent = `0:00 / ${formatTime(totalDuration)}`;
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
