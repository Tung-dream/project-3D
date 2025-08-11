import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { DRACOLoader } from 'three/examples/jsm/Addons.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import ControlsVR from '../controlsVR.js';
import { Teleport } from '../teleport.js';
import { InfoDisplay } from '../info-display.js';
import { RealisticRainSystem } from '../systems/RealisticRainSystem.js';
import { LightningSystem } from '../systems/LightningSystem.js';

export class Scene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    
    this.setupRenderer();
    this.setupCamera();
    this.setupLighting();
    this.setupControls();
    this.setupLoaders();
    
    this.rainSystem = new RealisticRainSystem(this.scene);
    this.lightningSystem = new LightningSystem(this.scene, this.camera);
    
    this.setupEventListeners();
    this.animate();
  }

  setupRenderer() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));
  }

  setupCamera() {
    this.camera.position.set(0, 2, 5);
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    this.vrControls = new ControlsVR(this.camera, this.scene);
    this.teleport = new Teleport(this.scene, this.camera);
  }

  setupLoaders() {
    this.gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/public/libs/draco/');
    this.gltfLoader.setDRACOLoader(dracoLoader);

    this.loadModels();
    this.loadEnvironment();
  }

  loadModels() {
    // Load your models here
  }

  loadEnvironment() {
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load('/public/models1/sunvip.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.environment = texture;
      this.scene.background = texture;
    });
  }

  setupEventListeners() {
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.lightningSystem.onWindowResize();
  }

  animate() {
    this.renderer.setAnimationLoop(() => {
      const deltaTime = this.clock.getDelta();
      
      this.controls.update();
      this.vrControls.update();
      this.teleport.update();
      
      this.rainSystem.update(deltaTime);
      this.lightningSystem.update(deltaTime);
      
      this.renderer.render(this.scene, this.camera);
    });
  }
}
