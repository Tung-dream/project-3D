import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

export class RendererSystem {
  constructor(container = document.body) {
    this.renderer = this.createRenderer();
    this.setupRenderer(container);
    this.setupVR();
    this.setupEventListeners();
  }

  createRenderer() {
    return new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      logarithmicDepthBuffer: true,
      xrCompatible: true
    });
  }

  setupRenderer(container) {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Thêm renderer vào container
    container.appendChild(this.renderer.domElement);
    
    // Style setup
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.style.backgroundColor = "#000";
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.setAttribute("tabindex", "0");
    this.renderer.domElement.focus();
  }

  setupVR() {
    this.renderer.xr.enabled = true;
    document.body.appendChild(VRButton.createButton(this.renderer));
    
    // Create VR HUD
    this.vrHUD = document.createElement('div');
    this.vrHUD.id = 'vrHud';
    this.vrHUD.style.position = 'fixed';
    this.vrHUD.style.top = '12px';
    this.vrHUD.style.left = '12px';
    this.vrHUD.style.padding = '8px 12px';
    this.vrHUD.style.background = 'rgba(0,0,0,0.55)';
    this.vrHUD.style.color = '#0ff';
    this.vrHUD.style.font = '600 14px/1.2 system-ui, sans-serif';
    this.vrHUD.style.letterSpacing = '0.5px';
    this.vrHUD.style.border = '1px solid rgba(0,255,255,0.35)';
    this.vrHUD.style.borderRadius = '8px';
    this.vrHUD.style.backdropFilter = 'blur(4px)';
    this.vrHUD.style.pointerEvents = 'none';
    this.vrHUD.style.zIndex = '9999';
    this.vrHUD.style.display = 'none';
    this.vrHUD.textContent = 'VR MODE';
    document.body.appendChild(this.vrHUD);

    // VR event listeners
    window.addEventListener('vr-present', (e) => {
      const vrIsOn = !!e.detail?.on;
      this.vrHUD.style.display = vrIsOn ? 'block' : 'none';
      this.vrHUD.textContent = vrIsOn ? 'VR MODE' : '';
      if (vrIsOn) {
        this.vrHUD.style.color = '#0ff';
        this.vrHUD.style.borderColor = 'rgba(0,255,255,0.35)';
      }
    });

    window.addEventListener('vr-move', (e) => {
      const moving = !!e.detail?.moving;
      this.vrHUD.textContent = moving ? 'VR MODE — Moving' : 'VR MODE — Idle';
      this.vrHUD.style.color = moving ? '#ff0' : '#0ff';
      this.vrHUD.style.borderColor = moving ? 'rgba(255,255,0,0.35)' : 'rgba(0,255,255,0.35)';
    });
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize());
  }

  onWindowResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);
  }

  renderMiniMap(scene, miniCamera, marginPx, mapSizePx) {
    this.renderer.setViewport(marginPx, window.innerHeight - mapSizePx - marginPx, mapSizePx, mapSizePx);
    this.renderer.setScissor(marginPx, window.innerHeight - mapSizePx - marginPx, mapSizePx, mapSizePx);
    this.renderer.setScissorTest(true);
    this.renderer.clearDepth();
    this.renderer.render(scene, miniCamera);
    this.renderer.setScissorTest(false);
  }

  setAnimationLoop(callback) {
    this.renderer.setAnimationLoop(callback);
  }

  get xr() {
    return this.renderer.xr;
  }

  dispose() {
    this.renderer.dispose();
    if (this.vrHUD && this.vrHUD.parentNode) {
      this.vrHUD.parentNode.removeChild(this.vrHUD);
    }
  }
}
