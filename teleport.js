// teleport.js
import * as THREE from "three";

const teleportState = {
  marker: null,
  ray: null,
  isActive: false,
  teleportPoint: null,
};

export const Teleport = {
  teleportState,
  setupTeleport,
  updateTeleportRay,
  handleTeleport,
  cleanupTeleport,
};

function setupTeleport(scene) {
  if (teleportState.marker) return;

  // flat ring marker
  const markerGeo = new THREE.RingGeometry(0.15, 0.22, 32);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, opacity: 0.75, transparent: true });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  scene.add(marker);
  teleportState.marker = marker;

  // curved line (arc)
  const lineGeo = new THREE.BufferGeometry();
  const lineMat = new THREE.LineBasicMaterial({ color: 0x00ff00, opacity: 0.85, transparent: true });
  const line = new THREE.Line(lineGeo, lineMat);
  line.visible = false;
  scene.add(line);
  teleportState.ray = line;
}

function updateTeleportRay(controller, groundMesh) {
  if (!controller || !groundMesh) return;
  if (!teleportState.ray || !teleportState.marker) {
    // dev forgot to call setupTeleport(scene)
    const scene = controller.parent; // best guess
    if (scene) setupTeleport(scene);
  }

  // Build a world-space ray from the controller pose
  const tempMatrix = new THREE.Matrix4().extractRotation(controller.matrixWorld);
  const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
  const dir = new THREE.Vector3(0, -0.5, -1).applyMatrix4(tempMatrix).normalize(); // slight downward bias feels natural

  const raycaster = new THREE.Raycaster(origin, dir, 0.05, 50);
  const hit = raycaster.intersectObject(groundMesh, true)[0];

  if (hit) {
    const point = hit.point;

    // Save target and show marker
    teleportState.teleportPoint = point.clone();
    teleportState.marker.position.copy(point);
    teleportState.marker.position.y += 0.01; // avoid z-fighting
    teleportState.marker.visible = true;

    // Draw a smooth arc from controller to point
    const segments = 20;
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = new THREE.Vector3().lerpVectors(origin, point, t);
      // add a soft parabola bump so it looks like an arc
      p.y += Math.sin(t * Math.PI) * 0.5;
      pts.push(p);
    }
    teleportState.ray.geometry.setFromPoints(pts);
    teleportState.ray.material.color.setHex(0x00ff00);
    teleportState.ray.visible = true;
  } else {
    // No hit -> show short red straight ray and hide marker
    teleportState.marker.visible = false;
    const end = origin.clone().add(dir.clone().multiplyScalar(5));
    teleportState.ray.geometry.setFromPoints([origin, end]);
    teleportState.ray.material.color.setHex(0xff0000);
    teleportState.ray.visible = true;
    teleportState.teleportPoint = null;
  }
}

function handleTeleport(viewerRig) {
  if (!teleportState.teleportPoint || !teleportState.marker.visible) return;

  const p = teleportState.teleportPoint;
  // Move the rig to the hit point (keep rig’s current yaw)
  viewerRig.position.set(p.x, 0, p.z);

  // visual feedback + cleanup
  teleportState.marker.material.color.setHex(0xffffff);
  setTimeout(() => teleportState.marker.material.color.setHex(0x00ff00), 80);

  teleportState.marker.visible = false;
  teleportState.ray.visible = false;
  teleportState.teleportPoint = null;
}

function cleanupTeleport() {
  teleportState.isActive = false;
  teleportState.teleportPoint = null;
  if (teleportState.marker) teleportState.marker.visible = false;
  if (teleportState.ray) {
    teleportState.ray.visible = false;
    teleportState.ray.material.color.setHex(0x00ff00);
    teleportState.ray.geometry.setFromPoints([]);
  }
}
