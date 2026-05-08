import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class Environment {
  public scene: THREE.Scene;
  public terrainChunks: THREE.Mesh[] = [];
  private chunkSize = 100;
  private chunkSegments = 40;
  private noise2D: ReturnType<typeof createNoise2D>;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.noise2D = createNoise2D();
    this.setupLights();
    this.generateTerrain();
  }

  private setupLights() {
    const skyLight = new THREE.AmbientLight(0xffffff, 0.8);
    skyLight.layers.enable(1);
    this.scene.add(skyLight);

    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(20, 30, 10);
    sun.castShadow = true;
    sun.layers.enable(1);
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xc0d8ff, 0.4);
    fill.position.set(-10, 15, -20);
    fill.layers.enable(1);
    this.scene.add(fill);
  }

  private generateTerrain() {
    for (let cx = -3; cx <= 3; cx++) {
      for (let cz = -3; cz <= 3; cz++) {
        this.generateChunk(cx, cz);
      }
    }

    const groundGrid = new THREE.GridHelper(800, 50, 0x8fbc8f, 0x8fbc8f);
    groundGrid.material.opacity = 0.25;
    groundGrid.material.transparent = true;
    this.scene.add(groundGrid);
  }

  private generateChunk(chunkX: number, chunkZ: number) {
    const geometry = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, this.chunkSegments, this.chunkSegments);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({ color: 0x3f7f3a, roughness: 0.95, metalness: 0 });

    const positions = geometry.attributes.position.array as Float32Array;
    const chunkOffsetX = chunkX * this.chunkSize;
    const chunkOffsetZ = chunkZ * this.chunkSize;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i] + chunkOffsetX;
      const z = positions[i + 2] + chunkOffsetZ;
      const height = this.getGroundHeight(x, z);
      positions[i + 1] = height;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(chunkOffsetX, 0, chunkOffsetZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.terrainChunks.push(mesh);
    this.scene.add(mesh);
  }

  getGroundHeight(x: number, z: number): number {
    const broadHills = this.noise2D(x * 0.012, z * 0.012) * 6.5;
    const mediumVariation = this.noise2D(x * 0.03 + 100, z * 0.03 + 100) * 1.8;
    const detail = this.noise2D(x * 0.07 - 250, z * 0.07 - 250) * 0.35;
    const combinedHeight = broadHills + mediumVariation + detail;

    return Math.max(combinedHeight, -1.5);
  }
}
