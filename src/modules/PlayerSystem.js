import * as THREE from 'three';

export class PlayerSystem {
  constructor(scene, camera, controls) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.isMovingMode = false;
    this.keys = {};
    this.playerHeight = 1.75;
    this.playerRadius = 0.5;
    this.raycaster = new THREE.Raycaster();

    this.initPlayer();
    this.initMiniPlayer();
    this.setupEventListeners();
  }

  initPlayer() {
    this.player = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 1.75, 16),
      new THREE.MeshBasicMaterial({ color: "blue", transparent: true, opacity: 0 })
    );
    this.player.position.set(0, 0.875, 0);
    this.scene.add(this.player);
  }

  initMiniPlayer() {
    this.miniPlayer = new THREE.Mesh(
      new THREE.SphereGeometry(2, 40, 40),
      new THREE.MeshBasicMaterial({ color: "cyan" })
    );
    this.miniPlayer.position.copy(this.player.position);
    this.scene.add(this.miniPlayer);
  }

  setupEventListeners() {
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));
  }

  handleKeyDown(e) {
    this.keys[e.key] = true;
    if (!this.renderer?.xr.isPresenting) {
      this.isMovingMode = true;
      this.controls.enabled = false;
    }
  }

  handleKeyUp(e) {
    this.keys[e.key] = false;
  }

  movePlayer(delta, obstacles, collisionCubes, houseModel) {
    if (this.renderer?.xr.isPresenting) return;

    const speed = 8;
    const moveVector = new THREE.Vector3();

    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    const rightVector = new THREE.Vector3();
    rightVector.crossVectors(cameraDirection, this.camera.up).normalize();
    const forwardVector = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();

    // Handle keyboard input
    if (this.keys["ArrowUp"] || this.keys["w"] || this.keys["W"]) moveVector.add(forwardVector);
    if (this.keys["ArrowDown"] || this.keys["s"] || this.keys["S"]) moveVector.sub(forwardVector);
    if (this.keys["ArrowLeft"] || this.keys["a"] || this.keys["A"]) moveVector.sub(rightVector);
    if (this.keys["ArrowRight"] || this.keys["d"] || this.keys["D"]) moveVector.add(rightVector);

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
      const movement = moveVector.multiplyScalar(speed * delta);
      const newPosition = this.player.position.clone().add(movement);

      const playerRaycastOrigin = this.player.position.clone();
      playerRaycastOrigin.y += 0.5;
      let canMove = true;
      const normalizedMovement = movement.clone().normalize();

      if (this.checkCollision(playerRaycastOrigin, normalizedMovement, obstacles, 1.5)) {
        canMove = false;
      }

      // Check house collision
      if (houseModel) {
        const houseBox = new THREE.Box3().setFromObject(houseModel);
        if (houseBox.containsPoint(newPosition) || 
            houseBox.intersectsSphere(new THREE.Sphere(newPosition, this.playerRadius))) {
          canMove = false;
        }
      }

      // Check collision cubes
      for (const cube of collisionCubes) {
        const cubeBox = new THREE.Box3().setFromObject(cube);
        if (cubeBox.intersectsSphere(new THREE.Sphere(newPosition, this.playerRadius))) {
          canMove = false;
          break;
        }
      }

      this.raycaster.set(
        new THREE.Vector3(newPosition.x, this.player.position.y + 10, newPosition.z),
        new THREE.Vector3(0, -1, 0)
      );
      const groundIntersects = this.raycaster.intersectObjects(obstacles, true);

      if (canMove) {
        if (groundIntersects.length > 0) {
          const groundPoint = groundIntersects[0].point;
          const distanceToGround = newPosition.y - groundPoint.y;
          if (Math.abs(distanceToGround) < 5 && newPosition.y > groundPoint.y - 0.1) {
            newPosition.y = groundPoint.y + this.playerRadius;
            this.player.position.copy(newPosition);
            this.miniPlayer.position.copy(this.player.position);
            
            // Sync camera position
            this.camera.position.x = this.player.position.x;
            this.camera.position.y = this.player.position.y + (1.75 - this.playerRadius);
            this.camera.position.z = this.player.position.z;
          }
        }
      }
    }
  }

  checkCollision(position, direction, obstacles, distance = 1.5) {
    this.raycaster.set(position, direction);
    const intersects = this.raycaster.intersectObjects(obstacles, true);
    return intersects.length > 0 && intersects[0].distance < distance;
  }

  update(delta, obstacles, collisionCubes, houseModel) {
    if (this.isMovingMode) {
      this.movePlayer(delta, obstacles, collisionCubes, houseModel);
    }
  }
}
