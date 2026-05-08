import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Player {
  public group: THREE.Group;
  public model: THREE.Group | null = null;
  public gun: THREE.Group;
  public gunModel: THREE.Group | null = null;
  public armsModel: THREE.Group | null = null;
  public position: THREE.Vector3;
  public yaw = 0;
  public pitch = 0;
  public velocityY = 0;
  public onGround = true;
  public isFirstPerson = true;

  private loader: GLTFLoader;
  private readonly eyeHeight = 0.6;
  private readonly firstPersonLayer = 1;
  private readonly armsModelPath = '/models/Rigged Fps Arms.glb';
  private readonly gunModelPath = '/models/Pistol.glb';
  private readonly firstPersonRig = new THREE.Group();

  constructor() {
    this.group = new THREE.Group();
    this.gun = new THREE.Group();
    this.position = this.group.position;
    this.loader = new GLTFLoader();
    this.position.set(0, 10, 0);
    this.firstPersonRig.renderOrder = 1000;
    this.loadModels();
  }

  private loadModels() {
    this.model = this.createFallbackPlayer();
    this.group.add(this.model);

    this.loader.load(
      this.armsModelPath,
      (gltf) => {
        this.armsModel = gltf.scene;
        this.prepareModel(this.armsModel);
        this.fitModelToHeight(this.armsModel, 1.35);
        this.centerModel(this.armsModel);
        this.configureFirstPersonObject(this.armsModel);
        this.armsModel.position.set(0.18, -0.9, -0.22);
        this.armsModel.rotation.set(0.08, Math.PI - 0.2, 0.16);
        this.firstPersonRig.add(this.armsModel);
        console.log(`Arms model loaded from ${this.armsModelPath}`);
      },
      undefined,
      () => {
        this.armsModel = this.createFallbackArms();
        this.firstPersonRig.add(this.armsModel);
        console.warn(`Arms model not found at ${this.armsModelPath}, using fallback mesh`);
      }
    );

    this.loader.load(
      this.gunModelPath,
      (gltf) => {
        this.gunModel = gltf.scene;
        this.prepareModel(this.gunModel);
        this.fitModelToLongestSide(this.gunModel, 0.42);
        this.centerModel(this.gunModel);
        this.configureFirstPersonObject(this.gunModel);
        this.gunModel.position.set(0.14, -0.14, -0.02);
        this.gunModel.rotation.set(-0.02, -Math.PI / 2 - 0.12, 0.14);
        this.gun.add(this.gunModel);
        console.log(`Gun model loaded from ${this.gunModelPath}`);
      },
      undefined,
      () => {
        this.gunModel = this.createFallbackGun();
        this.gun.add(this.gunModel);
        console.warn(`Gun model not found at ${this.gunModelPath}, using fallback mesh`);
      }
    );
  }

  private prepareModel(model: THREE.Group) {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          if (!(material instanceof THREE.MeshStandardMaterial) && !(material instanceof THREE.MeshPhysicalMaterial)) {
            continue;
          }

          material.color.multiplyScalar(0.95);
          material.roughness = Math.min(material.roughness + 0.1, 1);
          material.metalness = Math.min(material.metalness, 0.15);

          if (material.map) {
            material.map.colorSpace = THREE.SRGBColorSpace;
          } else if (material.color.equals(new THREE.Color(1, 1, 1))) {
            material.color = new THREE.Color(0xd8b08c);
          }

          material.needsUpdate = true;
        }
      }
    });
  }

  private configureFirstPersonObject(object: THREE.Object3D) {
    object.traverse((child) => {
      child.layers.set(this.firstPersonLayer);

      if (child instanceof THREE.Mesh) {
        child.renderOrder = 1000;
        child.frustumCulled = false;
      }
    });
  }

  private fitModelToHeight(model: THREE.Object3D, targetHeight: number) {
    const bounds = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bounds.getSize(size);

    if (size.y > 0) {
      model.scale.multiplyScalar(targetHeight / size.y);
    }
  }

  private fitModelToLongestSide(model: THREE.Object3D, targetLength: number) {
    const bounds = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const longestSide = Math.max(size.x, size.y, size.z);

    if (longestSide > 0) {
      model.scale.multiplyScalar(targetLength / longestSide);
    }
  }

  private centerModel(model: THREE.Object3D) {
    const bounds = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    bounds.getCenter(center);
    model.position.sub(center);
  }

  private createFallbackArms(): THREE.Group {
    const arms = new THREE.Group();
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0xd2a679, roughness: 0.95 });

    const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.55, 4, 8), armMaterial);
    leftArm.position.set(-0.18, -0.42, -0.12);
    leftArm.rotation.z = 0.55;

    const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.55, 4, 8), armMaterial);
    rightArm.position.set(0.14, -0.48, -0.02);
    rightArm.rotation.z = -0.85;

    arms.add(leftArm, rightArm);
    return arms;
  }

  private createFallbackPlayer(): THREE.Group {
    const fallback = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0x5f8d4e, roughness: 0.9 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.1, 4, 8), material);
    body.position.y = -0.1;
    body.castShadow = true;
    body.receiveShadow = true;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xe0b27f, roughness: 0.95 })
    );
    head.position.y = 0.9;
    head.castShadow = true;

    fallback.add(body, head);
    return fallback;
  }

  private createFallbackGun(): THREE.Group {
    const fallback = new THREE.Group();
    const gunMaterial = new THREE.MeshStandardMaterial({ color: 0x353535, roughness: 0.6, metalness: 0.2 });

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.45), gunMaterial);
    stock.position.set(0, -0.02, 0);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 12), gunMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.26, 0.03, -0.08);

    fallback.add(stock, barrel);
    return fallback;
  }

  updateCamera(camera: THREE.PerspectiveCamera) {
    if (this.isFirstPerson) {
      camera.position.copy(this.position);
      camera.position.y += this.eyeHeight;
      camera.rotation.order = 'YXZ';
      camera.rotation.y = this.yaw;
      camera.rotation.x = this.pitch;

      if (this.model) {
        this.model.visible = false;
      }

      if (this.firstPersonRig.parent !== camera) {
        camera.add(this.firstPersonRig);
      }

      if (this.gun.parent !== this.firstPersonRig) {
        this.firstPersonRig.add(this.gun);
      }

      this.firstPersonRig.position.set(0.3, -0.27, -0.28);
      this.firstPersonRig.rotation.set(0.01, -0.08, 0);
      this.gun.position.set(0.24, 0.01, -0.1);
      this.gun.rotation.set(-0.02, -0.1, 0.02);
    } else {
      const offset = new THREE.Vector3(0, 2, 5);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      camera.position.copy(this.position).add(offset);
      camera.lookAt(this.position);

      if (this.model) {
        this.model.visible = true;
      }

      if (this.firstPersonRig.parent === camera) {
        camera.remove(this.firstPersonRig);
      }

      if (this.gun.parent !== this.group) {
        this.group.add(this.gun);
      }

      this.gun.position.set(0.35, 0.45, -0.15);
      this.gun.rotation.set(0, 0, 0);
    }
  }

  jump(jumpStrength: number) {
    if (this.onGround) {
      this.velocityY = jumpStrength;
      this.onGround = false;
    }
  }

  applyGravity(gravity: number, groundY: number) {
    this.velocityY += gravity;
    this.position.y += this.velocityY;

    if (this.position.y <= groundY) {
      this.position.y = groundY;
      this.velocityY = 0;
      this.onGround = true;
    }
  }

  move(forward: boolean, backward: boolean, left: boolean, right: boolean, speed: number, camera: THREE.Camera) {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    const rightVec = new THREE.Vector3();
    rightVec.crossVectors(camera.up, direction).normalize();

    if (forward) this.position.addScaledVector(direction, speed);
    if (backward) this.position.addScaledVector(direction, -speed);
    if (left) this.position.addScaledVector(rightVec, -speed);
    if (right) this.position.addScaledVector(rightVec, speed);
  }

  setRotation(yaw: number, pitch: number) {
    this.yaw = yaw;
    this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    this.group.rotation.y = this.yaw;
  }

  toggleView() {
    this.isFirstPerson = !this.isFirstPerson;
  }
}
