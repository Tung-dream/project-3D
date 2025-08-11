import * as THREE from 'three';
import { InfoDisplay } from '../info-display.js';

export class InteractionSystem {
  constructor(scene, camera, player, modelLoader) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.modelLoader = modelLoader;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.modelInfoDisplay = new InfoDisplay(scene, camera);
  }

  isPlayerInFrontOfHouse() {
    if (!this.modelLoader.houseModel) return false;
    
    const houseDirection = new THREE.Vector3(0, 0, 1);
    houseDirection.applyQuaternion(this.modelLoader.houseModel.quaternion);
    const toPlayer = new THREE.Vector3()
      .subVectors(this.player.position, this.modelLoader.houseModel.position)
      .normalize();
    
    return houseDirection.dot(toPlayer) > 0.5;
  }

  detectNearbyInfo(renderer) {
    if (!this.modelInfoDisplay) return;

    const isVR = renderer.xr.isPresenting;
    const isInFrontOfHouse = this.isPlayerInFrontOfHouse();
    let visibleObjects = [];
    
    for (const model of this.modelLoader.interactiveObjects) {
      if (!model.userData.info) continue;
      if ((model.userData.isCarInHouse || model.userData.type === "house") && !isInFrontOfHouse) continue;
      
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const distance = this.camera.position.distanceTo(center);
      
      if (distance < 18) {
        visibleObjects.push(model);
      }
    }
    
    this.modelInfoDisplay.update(isVR, visibleObjects);
  }

  showInfoLabel(info, position, renderer) {
    if (!this.modelInfoDisplay) return;
    
    const dummyObject = new THREE.Object3D();
    dummyObject.position.copy(position);
    dummyObject.userData.info = info;
    this.modelInfoDisplay.update(renderer.xr.isPresenting, [dummyObject]);
    
    setTimeout(() => {
      this.modelInfoDisplay.update(renderer.xr.isPresenting, []);
    }, 3000);
  }

  hideTriggerInfoLabel(renderer) {
    if (this.modelInfoDisplay) {
      this.modelInfoDisplay.update(renderer.xr.isPresenting, []);
    }
  }

  checkHouseTrigger(renderer) {
    const isInFrontOfHouse = this.isPlayerInFrontOfHouse();
    if (!this.modelLoader.houseModel) return;

    if (isInFrontOfHouse) {
      for (const car of this.modelLoader.carModelsLoaded) {
        if (car.userData.isCarInHouse) {
          const dist = this.player.position.distanceTo(car.position);
          if (dist < 3) {
            this.showInfoLabel(car.userData.info, car.position, renderer);
            return;
          }
        }
      }
    }

    for (const model of this.modelLoader.interactiveObjects) {
      if (!model.userData.info) continue;
      if (model.userData.type === "house" && !isInFrontOfHouse) continue;

      const box = new THREE.Box3().setFromObject(model);
      if (box.containsPoint(this.player.position)) {
        this.showInfoLabel(model.userData.info, model.position, renderer);
        return;
      }
    }

    this.hideTriggerInfoLabel(renderer);
  }

  update(renderer) {
    this.detectNearbyInfo(renderer);
    this.checkHouseTrigger(renderer);
  }

  dispose() {
    if (this.modelInfoDisplay) {
      this.modelInfoDisplay.dispose();
    }
  }
}
