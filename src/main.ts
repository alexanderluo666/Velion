import * as THREE from 'three';
import './style.css';

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

// CAMERA
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

// LIGHT
const light = new THREE.PointLight(0xffffff, 1.8);
light.position.set(5, 10, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

// FLOOR
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

// TARGET
const targetMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.2, roughness: 0.4 });
const target = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), targetMaterial);
target.position.set(0, 1, -10);
scene.add(target);

// GUN
const gun = new THREE.Group();
const gunBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.16, 0.09, 0.4),
  new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 })
);
gunBody.position.set(0, -0.1, -0.3);
gun.add(gunBody);

const gunBarrel = new THREE.Mesh(
  new THREE.BoxGeometry(0.06, 0.06, 0.18),
  new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.2 })
);
gunBarrel.position.set(0, -0.05, -0.55);
gun.add(gunBarrel);

camera.add(gun);

// PLAYER STATE
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let yaw = 0;
let pitch = 0;
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
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.key.toLowerCase()) {
    case 'w': moveForward = false; break;
    case 's': moveBackward = false; break;
    case 'a': moveLeft = false; break;
    case 'd': moveRight = false; break;
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
  if (now - lastShot < 200) return;
  lastShot = now;

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  raycaster.set(camera.position, direction);

  const intersects = raycaster.intersectObject(target, false);
  if (intersects.length > 0) {
    targetMaterial.color.set(0x00ff00);
    setTimeout(() => targetMaterial.color.set(0xff0000), 150);
    target.position.set((Math.random() - 0.5) * 16, 1 + Math.random() * 2, -10 - Math.random() * 8);
  }
}

// START POSITION
camera.position.set(0, 2, 5);

// ANIMATION LOOP
function animate() {
  requestAnimationFrame(animate);

  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  const moveSpeed = 0.12;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, camera.up).normalize();

  if (moveForward) camera.position.addScaledVector(forward, moveSpeed);
  if (moveBackward) camera.position.addScaledVector(forward, -moveSpeed);
  if (moveLeft) camera.position.addScaledVector(right, -moveSpeed);
  if (moveRight) camera.position.addScaledVector(right, moveSpeed);

  renderer.render(scene, camera);
}

animate();
