import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { modelPositions } from '../config/settings.js';

export class ModelLoader {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.interactiveObjects = [];
    this.obstacles = [];
    this.carLights = [];
    this.carModelsLoaded = [];
    this.collisionCubes = [];
    this.bulbPositions = [];
    this.dnLights = [];
    this.houseModel = null;
    this.groundBoundingBox = null;
    this.groundMesh = null;

    this.setupLoaders();
  }

  setupLoaders() {
    this.dracoLoader.setDecoderPath('/public/libs/draco/');
    this.loader.setDRACOLoader(this.dracoLoader);
  }

  loadModels() {
    this.loadGround();
    this.loadModelsByType('trees');
    this.loadModelsByType('lights');
    this.loadModelsByType('cars');
    this.loadHouse();
  }

  loadModelsByType(type) {
    const models = modelPositions[type];
    if (!models) return;

    models.forEach(model => {
      this.loadModel(
        model.type,
        model.x,
        model.y || 0,
        model.z,
        model.ry || 0,
        model.scale || 1,
        model.info,
        model.isCarInHouse
      );
    });
  }

  loadModel(type, x, y = 0, z, ry = 0, scale = 1, info = null, isCarInHouse = false) {
    this.loader.load(
      `/models1/${type}.glb`,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(x, y, z);
        model.rotation.y = ry;
        model.scale.set(scale, scale, scale);

        if (info) {
          model.userData.info = info;
          model.userData.isCarInHouse = isCarInHouse;
          this.interactiveObjects.push(model);
        }

        this.processModel(model, type);
        this.scene.add(model);
      },
      undefined,
      (err) => console.error(`❌ Lỗi load ${type}.glb`, err)
    );
  }

  processModel(model, type) {
    if (type === 'house') {
      this.processHouseModel(model);
    }

    model.traverse(child => {
      if (!child.isMesh) return;

      this.optimizeMaterial(child);
      this.setupShadows(child);
      child.userData.type = type;

      if (type !== "tree3" && type !== "tree2" && 
          type !== "den1" && type !== "den2" && type !== "den3") {
        this.obstacles.push(child);
      }

      this.processDNLights(child);
      this.setupCollisionCubes(child, type, model);
    });
  }

  optimizeMaterial(mesh) {
    if (mesh.material && mesh.material.isMeshPhysicalMaterial) {
      mesh.material = new THREE.MeshStandardMaterial({
        map: mesh.material.map || null,
        normalMap: mesh.material.normalMap || null,
        roughnessMap: mesh.material.roughnessMap || null,
      });
      mesh.material.needsUpdate = true;
    }
  }

  setupShadows(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  processDNLights(mesh) {
    if (/^dn[1-6]$/i.test(mesh.name)) {
      this.createDNLight(mesh);
    }
  }

  createDNLight(mesh) {
    const spotLight = new THREE.SpotLight(0xffeeaa, 100.0, 15, Math.PI / 4, 0.7);
    const position = mesh.getWorldPosition(new THREE.Vector3());
    
    spotLight.position.copy(position);
    spotLight.position.y += 0.09;
    spotLight.target.position.copy(position);
    spotLight.target.position.y -= 2.0;
    
    this.scene.add(spotLight);
    this.scene.add(spotLight.target);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      new THREE.MeshBasicMaterial({ 
        color: 0xffcc88, 
        transparent: true, 
        opacity: 0.8 
      })
    );
    glow.position.copy(spotLight.position);
    glow.position.y -= 0.1;
    this.scene.add(glow);

    this.dnLights.push({ light: spotLight, glow: glow });
  }

  setupCollisionCubes(mesh, type, model) {
    if (["tree3", "tree2", "den1", "den2", "den3"].includes(type)) {
      this.createCollisionCube(mesh, type, model);
    }
  }

  createCollisionCube(mesh, type, model) {
    const boundingBox = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    boundingBox.getCenter(center);
    boundingBox.getSize(size);

    const dimensions = this.getCollisionCubeDimensions(type, size);
    const position = this.getCollisionCubePosition(type, center, size);

    const collisionCube = new THREE.Mesh(
      new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );

    collisionCube.position.copy(position);
    collisionCube.userData.type = `${type}Trunk`;
    this.collisionCubes.push(collisionCube);
    this.scene.add(collisionCube);
  }

  getCollisionCubeDimensions(type, size) {
    const dimensions = {
      tree3: { width: 1.0, height: 2.0, depth: 1.0 },
      tree2: { width: 0.8, height: 5.5, depth: 0.8 },
      den1: { width: 0.6, height: 3.0, depth: 0.6 },
      den2: { width: 0.5, height: 2.5, depth: 0.5 },
      den3: { width: 0.5, height: 3.5, depth: 0.5 }
    };
    return dimensions[type];
  }

  getCollisionCubePosition(type, center, size) {
    const position = center.clone();
    const adjustments = {
      tree3: { y: -(size.y - 2.0) / 2 },
      tree2: { y: -(size.y - 1.5) / 2, z: -1.5, x: -0.25 },
      den1: { y: -(size.y - 3.0) / 2, x: -1.4 },
      den2: { y: -(size.y - 2.5) / 2, x: -1.5 },
      den3: { y: -(size.y - 2.5) / 2 }
    };

    const adjustment = adjustments[type];
    if (adjustment) {
      Object.entries(adjustment).forEach(([axis, value]) => {
        position[axis] += value;
      });
    }

    return position;
  }

  loadGround() {
    this.loader.load(
      '/models1/ground.glb',
      (gltf) => {
        const ground = gltf.scene;
        this.processGround(ground);
        this.scene.add(ground);
        this.groundMesh = ground;
        this.setupGroundBoundingBox();
      },
      undefined,
      (err) => console.error('❌ Lỗi ground', err)
    );
  }

  processGround(ground) {
    ground.traverse(child => {
      if (child.isMesh && child.material) {
        const material = child.material;
        
        if ('metalness' in material) material.metalness = 0.0;
        if ('roughness' in material) {
          material.roughness = Math.min(1, (material.roughness ?? 0.5) + 0.35);
        }
        if ('envMapIntensity' in material) {
          material.envMapIntensity = Math.min(0.3, (material.envMapIntensity ?? 1));
        }
        if (material.color) material.color.multiplyScalar(0.92);
        if (material.map) material.map.encoding = THREE.sRGBEncoding;
        if (material.normalScale) material.normalScale.multiplyScalar(0.85);
        
        material.needsUpdate = true;
      }
    });
  }

  setupGroundBoundingBox() {
    this.groundBoundingBox = new THREE.Box3().setFromObject(this.groundMesh);
  }

  processHouseModel(model) {
    this.houseModel = model;
    model.userData.type = "house";
    
    setTimeout(() => {
      this.fixHouseRenderingIssues();
    }, 100);
  }

  fixHouseRenderingIssues() {
    if (!this.houseModel) return;

    this.houseModel.traverse(child => {
      if (child.isMesh && child.material) {
        this.optimizeHouseMaterial(child);
        this.optimizeHouseGeometry(child);
      }
    });

    this.houseModel.updateMatrixWorld(true);
  }

  optimizeHouseMaterial(mesh) {
    mesh.material = mesh.material.clone();
    mesh.material.side = THREE.FrontSide;
    mesh.material.depthWrite = true;
    mesh.material.depthTest = true;
    mesh.material.transparent = false;
    mesh.material.alphaTest = 0;

    if (mesh.material.map) {
      mesh.material.map.generateMipmaps = true;
      mesh.material.map.minFilter = THREE.LinearMipmapLinearFilter;
      mesh.material.map.magFilter = THREE.LinearFilter;
    }

    mesh.material.needsUpdate = true;
  }

  optimizeHouseGeometry(mesh) {
    if (!mesh.geometry) return;

    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (!box) return;

    const positions = mesh.geometry.attributes.position;
    const normals = mesh.geometry.attributes.normal;

    if (!positions || !normals) return;

    for (let i = 0; i < positions.count; i++) {
      const offset = 0.001;
      positions.setX(i, positions.getX(i) + normals.getX(i) * offset);
      positions.setY(i, positions.getY(i) + normals.getY(i) * offset);
      positions.setZ(i, positions.getZ(i) + normals.getZ(i) * offset);
    }
    positions.needsUpdate = true;
  }
}
