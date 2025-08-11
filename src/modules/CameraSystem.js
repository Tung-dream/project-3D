import * as THREE from 'three';

export class CameraSystem {
  constructor(aspect = window.innerWidth / window.innerHeight) {
    this.mainCamera = this.createMainCamera(aspect);
    this.miniMapCamera = this.createMiniMapCamera();
    this.setupEventListeners();
  }

  createMainCamera(aspect) {
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, 2, 4);
    return camera;
  }

  createMiniMapCamera() {
    const miniCamera = new THREE.OrthographicCamera(
      -20, 20,  // left, right
      20, -20,  // top, bottom
      0.1, 100  // near, far
    );
    miniCamera.position.set(0, 30, 0);
    miniCamera.lookAt(0, 0, 0);
    return miniCamera;
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize());
  }

  onWindowResize() {
    this.mainCamera.aspect = window.innerWidth / window.innerHeight;
    this.mainCamera.updateProjectionMatrix();
  }

  getMainCamera() {
    return this.mainCamera;
  }

  getMiniMapCamera() {
    return this.miniMapCamera;
  }

  updateCameraPosition(x, y, z) {
    this.mainCamera.position.set(x, y, z);
  }

  lookAt(x, y, z) {
    this.mainCamera.lookAt(x, y, z);
  }
}
