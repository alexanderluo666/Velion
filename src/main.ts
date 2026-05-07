import * as THREE from 'three';
import './style.css';
import { Environment } from './environment';
import { Player } from './player';

// SCENE
const environment = new Environment();
const scene = environment.scene;

// CAMERA
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 0);
camera.lookAt(0, 0, -10);

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
document.body.appendChild(renderer.domElement);

// HUD
const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = `<div id="crosshair"></div><div id="hint">Click to lock mouse, then left-click to fire</div>`;
document.body.appendChild(hud);

// RESIZE
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// TARGET
const targetMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.2, roughness: 0.4 });
const target = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), targetMaterial);
target.position.set(0, 1.5, -18);
target.castShadow = true;
scene.add(target);

// AUDIO
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

function playShotSound() {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;

  osc.type = 'square';
  osc.frequency.setValueAtTime(1300, now);
  gain.gain.setValueAtTime(0.16, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start(now);
  osc.stop(now + 0.08);
}

// MUZZLE FLASH
const muzzleFlash = new THREE.Mesh(
  new THREE.SphereGeometry(0.08, 8, 6),
  new THREE.MeshBasicMaterial({ color: 0xfff3a8, transparent: true, opacity: 0.85 })
);
muzzleFlash.visible = false;
camera.add(muzzleFlash);
muzzleFlash.position.set(0.5, -0.5, -2);

// BULLET EFFECTS
const bullets: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3; life: number; material: THREE.MeshBasicMaterial }> = [];

function spawnBullet(origin: THREE.Vector3, direction: THREE.Vector3) {
  const material = new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 1 });
  const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), material);
  bullet.position.copy(origin);
  const velocity = direction.clone().multiplyScalar(1.3);
  bullets.push({ mesh: bullet, velocity, life: 40, material });
  scene.add(bullet);
}

// PLAYER STATE
const player = new Player();
scene.add(player.group);
scene.add(camera);

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let jumpPressed = false;
let sprint = false;
let yaw = 0;
let pitch = 0;
const gravity = -0.01;
const jumpStrength = 0.3;
const raycaster = new THREE.Raycaster();
let lastShot = 0;

// CONTROLS
renderer.domElement.addEventListener('click', () => {
  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  const hint = document.getElementById('hint');
  if (document.pointerLockElement === renderer.domElement) {
    hint?.classList.add('hidden');
  } else {
    hint?.classList.remove('hidden');
  }
});

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement === renderer.domElement) {
    yaw -= event.movementX * 0.0025;
    pitch -= event.movementY * 0.0025;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
  }
});

document.addEventListener('keydown', (event) => {
  switch (event.key.toLowerCase()) {
    case 'w': moveForward = true; break;
    case 's': moveBackward = true; break;
    case 'a': moveLeft = true; break;
    case 'd': moveRight = true; break;
    case ' ': jumpPressed = true; break;
    case 'shift': sprint = true; break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.key.toLowerCase()) {
    case 'w': moveForward = false; break;
    case 's': moveBackward = false; break;
    case 'a': moveLeft = false; break;
    case 'd': moveRight = false; break;
    case ' ': jumpPressed = false; break;
    case 'shift': sprint = false; break;
  }
});

document.addEventListener('mousedown', (event) => {
  if (event.button !== 0) return;
  if (document.pointerLockElement === renderer.domElement) {
    shoot();
  } else {
    renderer.domElement.requestPointerLock();
  }
});

// SHOOTING
function shoot() {
  const now = performance.now();
  if (now - lastShot < 180) return;
  lastShot = now;

  playShotSound();

  muzzleFlash.visible = true;
  muzzleFlash.scale.setScalar(1.5 + Math.random() * 0.5);
  setTimeout(() => {
    muzzleFlash.visible = false;
  }, 70);

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  raycaster.set(camera.position, direction);

  const intersects = raycaster.intersectObject(target, false);
  if (intersects.length > 0) {
    targetMaterial.color.set(0x00ff00);
    setTimeout(() => targetMaterial.color.set(0xff0000), 150);
    target.position.set((Math.random() - 0.5) * 24, 1.5 + Math.random() * 1.5, -18 - Math.random() * 10);
  }

  spawnBullet(camera.position.clone(), direction);
}

// ANIMATION LOOP
function animate() {
  requestAnimationFrame(animate);

  // Handle jumping
  if (jumpPressed) {
    player.jump(jumpStrength);
  }

  const groundHeight = environment.getGroundHeight(player.position.x, player.position.z) + 1;
  player.applyGravity(gravity, groundHeight);

  // Movement
  let moveSpeed = 0.15;
  if (sprint) moveSpeed *= 2;

  player.setRotation(yaw, pitch);
  player.move(moveForward, moveBackward, moveLeft, moveRight, moveSpeed, camera);
  player.updateCamera(camera);

  // BULLETS
  bullets.forEach((bullet, index) => {
    bullet.mesh.position.add(bullet.velocity);
    bullet.life -= 1;
    bullet.material.opacity = Math.max(bullet.life / 40, 0.1);
    if (bullet.life <= 0) {
      scene.remove(bullet.mesh);
      bullets.splice(index, 1);
    }
  });

  renderer.render(scene, camera);
}

animate();
