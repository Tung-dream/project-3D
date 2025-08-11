import * as THREE from 'three';

export class InfoDisplay {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.currentInfo = null;
    this.infoPanel = null;
    this.vrInfoSprites = new Map(); // Lưu trữ sprite cho mỗi object trong VR
    this.raycaster = new THREE.Raycaster();
    this.tempVector = new THREE.Vector3();
    this.distance = 2; // Khoảng cách hiển thị trong VR
    
    this.initInfoPanel();
  }

  initInfoPanel() {
    // Tạo div hiển thị thông tin trên màn hình PC
    this.infoPanel = document.createElement('div');
    this.infoPanel.style.position = 'fixed';
    this.infoPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.infoPanel.style.color = 'white';
    this.infoPanel.style.padding = '10px';
    this.infoPanel.style.borderRadius = '5px';
    this.infoPanel.style.display = 'none';
    this.infoPanel.style.zIndex = '1000';
    document.body.appendChild(this.infoPanel);
  }

  createTextSprite(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = '24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Wrap text if too long
    const words = text.split(' ');
    let line = '';
    let lines = [];
    let y = 64;
    
    for(let word of words) {
      const testLine = line + word + ' ';
      if (context.measureText(testLine).width > canvas.width - 20) {
        lines.push(line);
        line = word + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    
    lines.forEach((line, i) => {
      context.fillText(line, canvas.width/2, y + (i - lines.length/2) * 30);
    });
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1);
    
    return sprite;
  }

  checkDistance(position, maxDistance = 5) {
    // Kiểm tra khoảng cách từ camera đến object
    return this.camera.position.distanceTo(position) <= maxDistance;
  }

  update(isVR, objects) {
    for (const obj of objects) {
      if (!obj.userData.info) continue;

      // Kiểm tra khoảng cách
      if (!this.checkDistance(obj.position)) {
        // Ẩn thông tin nếu ở xa
        if (this.vrInfoSprites.has(obj.uuid)) {
          const sprite = this.vrInfoSprites.get(obj.uuid);
          sprite.visible = false;
        }
        continue;
      }

      if (isVR) {
        // Xử lý hiển thị trong VR
        if (!this.vrInfoSprites.has(obj.uuid)) {
          const sprite = this.createTextSprite(obj.userData.info);
          this.vrInfoSprites.set(obj.uuid, sprite);
          this.scene.add(sprite);
        }

        const sprite = this.vrInfoSprites.get(obj.uuid);
        sprite.visible = true;

        // Cập nhật vị trí sprite
        sprite.position.copy(obj.position);
        sprite.position.y += obj.scale.y + 1; // Hiển thị phía trên object
        sprite.lookAt(this.camera.position);
      } else {
        // Xử lý hiển thị trên màn hình PC
        const screenPosition = obj.position.clone();
        screenPosition.project(this.camera);

        const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPosition.y * 0.5 + 0.5) * window.innerHeight;

        if (x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight) {
          this.infoPanel.style.display = 'block';
          this.infoPanel.style.left = x + 'px';
          this.infoPanel.style.top = y + 'px';
          this.infoPanel.textContent = obj.userData.info;
        }
      }
    }
  }

  dispose() {
    // Cleanup
    this.vrInfoSprites.forEach(sprite => {
      sprite.material.map.dispose();
      sprite.material.dispose();
      this.scene.remove(sprite);
    });
    this.vrInfoSprites.clear();
    
    if (this.infoPanel && this.infoPanel.parentNode) {
      this.infoPanel.parentNode.removeChild(this.infoPanel);
    }
  }
}
