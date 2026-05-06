import * as THREE from 'three';

// =====================
// SCENE
// =====================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

// =====================
// CAMERA
// =====================
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

// =====================
// RENDERER
// =====================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// =====================
// RESIZE
// =====================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// =====================
// LIGHT
// =====================
const light = new THREE.PointLight(0xffffff, 2);
light.position.set(5, 5, 5);
scene.add(light);

scene.add(new THREE.AmbientLight(0x404040));

// =====================
// FLOOR (so you see movement)
// =====================
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x111122 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// =====================
// PLAYER STATE
// =====================
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

// =====================
// MOUSE LOOK
// =====================
let yaw = 0;
let pitch = 0;

document.body.addEventListener('click', () => {
    document.body.requestPointerLock();
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;

        pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
    }
});

// =====================
// INPUT
// =====================
document.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
        case 'w': moveForward = true; break;
        case 's': moveBackward = true; break;
        case 'a': moveLeft = true; break;
        case 'd': moveRight = true; break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.key.toLowerCase()) {
        case 'w': moveForward = false; break;
        case 's': moveBackward = false; break;
        case 'a': moveLeft = false; break;
        case 'd': moveRight = false; break;
    }
});

// =====================
// START POSITION
// =====================
camera.position.set(0, 2, 5);

// =====================
// LOOP
// =====================
function animate() {
    requestAnimationFrame(animate);

    // rotation
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    // movement direction
    direction.set(0, 0, 0);

    if (moveForward) direction.z -= 1;
    if (moveBackward) direction.z += 1;
    if (moveLeft) direction.x -= 1;
    if (moveRight) direction.x += 1;

    direction.normalize();

    // move relative to camera
    const speed = 0.1;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up);

    if (moveForward) camera.position.addScaledVector(forward, speed);
    if (moveBackward) camera.position.addScaledVector(forward, -speed);
    if (moveLeft) camera.position.addScaledVector(right, -speed);
    if (moveRight) camera.position.addScaledVector(right, speed);

    renderer.render(scene, camera);
}

animate();