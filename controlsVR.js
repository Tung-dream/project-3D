import * as THREE from "three";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";
// Nếu bạn không dùng teleport thì có thể bỏ import dưới đây
import { Teleport } from "./teleport.js";

/* ================== CẤU HÌNH DI CHUYỂN ================== */
let controllerLeft = null;
let controllerRight = null;
let locomotionMode = "hybrid"; // "smooth" | "teleport" | "hybrid"
let movementReference = "rig"; // "rig" hoặc "head"

export function setMovementReference(ref = "rig") {
  movementReference = ref === "head" ? "head" : "rig";
}

/* ================== THAM SỐ CHUNG ================== */
const DEADZONE = 0.15;
const MOVE_SPEED = 1.5;
const TURN_SMOOTH_SPEED = Math.PI / 6; // rad/s
const SNAP_TURN_ANGLE = Math.PI / 6;   // 30°
const SNAP_COOLDOWN_MS = 180;

const PLAYER_RADIUS = 0.5;   // Giữ đồng bộ desktop
const SKIN = 0.01;           // Đệm chung (hông/lưng)
const MIN_GAP = 0.002;       // Dán cách mặt tường 2mm
const HYST = 0.008;          // Hysteresis chống rung

/* === Cấu hình RIÊNG cho MẶT TRƯỚC nhà (để đi sát hơn) === */
const FRONT_AXIS = "z";      // Nếu mặt trước theo trục X, đổi thành "x"
const FRONT_BAND = 0.40;     // Dải 40cm tính từ mặt trước vào trong
const FRONT_SKIN = 0.002;    // Đệm cực mỏng cho front
const FRONT_SHRINK = { x: 0.02, y: 0.02, z: 0.02 }; // Co hộp front 2cm mỗi trục

/* ================== TRẠNG THÁI TURN ================== */
const turnState = {
  mode: "smooth", // "smooth" | "snap"
  wasTurning: false,
  lastSnapTime: 0
};

/* ================== AABB NHÀ (FRONT / OTHER) ================== */
let _houseFrontBoxes = null;
let _houseOtherBoxes = null;

function shrinkBox3(box, dx, dy, dz) {
  const out = box.clone();
  out.min.x += dx; out.max.x -= dx;
  out.min.y += dy; out.max.y -= dy;
  out.min.z += dz; out.max.z -= dz;
  // đảm bảo hợp lệ
  if (out.min.x > out.max.x) out.min.x = out.max.x - 0.001;
  if (out.min.y > out.max.y) out.min.y = out.max.y - 0.001;
  if (out.min.z > out.max.z) out.min.z = out.max.z - 0.001;
  return out;
}

function closestPointOnBox(p, box) {
  return new THREE.Vector3(
    THREE.MathUtils.clamp(p.x, box.min.x, box.max.x),
    THREE.MathUtils.clamp(p.y, box.min.y, box.max.y),
    THREE.MathUtils.clamp(p.z, box.min.z, box.max.z)
  );
}

function buildHouseBoxesOnce(houseModel) {
  if (!houseModel || (_houseFrontBoxes && _houseOtherBoxes)) return;

  _houseFrontBoxes = [];
  _houseOtherBoxes = [];

  houseModel.updateMatrixWorld(true);

  // AABB toàn nhà để xác định mặt trước
  const houseBBox = new THREE.Box3().setFromObject(houseModel);
  const frontPlane = FRONT_AXIS === "x" ? houseBBox.max.x : houseBBox.max.z;

  houseModel.traverse((o) => {
    if (!o?.isMesh) return;

    // Bỏ mái/hiên để không chặn sớm
    const n = (o.name || "").toLowerCase();
    if (n.includes("roof") || n.includes("canopy") || n.includes("porch")) return;

    const b = new THREE.Box3().setFromObject(o);
    if (b.isEmpty()) return;

    const c = b.getCenter(new THREE.Vector3());
    const distFront = FRONT_AXIS === "x" ? (frontPlane - c.x) : (frontPlane - c.z);

    if (distFront >= 0 && distFront <= FRONT_BAND) {
      _houseFrontBoxes.push(shrinkBox3(b, FRONT_SHRINK.x, FRONT_SHRINK.y, FRONT_SHRINK.z));
    } else {
      _houseOtherBoxes.push(b.clone());
    }
  });
}

/* ================== RESOLVE VA CHẠM (AABB SET) ================== */
function resolveAgainstAABBSet(current, desired, boxes, radius, skin, hysteresis, minGap) {
  if (!boxes || boxes.length === 0) return { pos: desired.clone(), touched: false };

  const rApproach = radius + skin;
  const rStay = radius + Math.max(0, skin - hysteresis);
  const tries = [rApproach, rStay];

  for (const r of tries) {
    const s = new THREE.Sphere(desired, r);
    let hit = null;
    for (const box of boxes) {
      if (box.intersectsSphere(s)) { hit = box; break; }
    }
    if (!hit) continue;

    // Pháp tuyến xấp xỉ: từ điểm gần nhất trên box tới desired
    const nearest = closestPointOnBox(desired, hit);
    let n = desired.clone().sub(nearest);
    if (n.lengthSq() < 1e-8) {
      // Fallback theo trục chuyển động lớn nhất
      const dx = Math.abs(desired.x - current.x);
      const dz = Math.abs(desired.z - current.z);
      n.set(dx > dz ? Math.sign(desired.x - current.x) : 0, 0, dx > dz ? 0 : Math.sign(desired.z - current.z));
    }
    n.normalize();

    // Snap lên bề mặt + khe nhỏ để tránh rung/z-fighting
    const snap = nearest.clone().addScaledVector(n, r + minGap);
    return { pos: snap, touched: true };
  }

  return { pos: desired.clone(), touched: false };
}

/* ================== CLAMP THEO GROUND ================== */
function clampToGround(groundMesh, pos) {
  if (!groundMesh) return pos;
  const box = new THREE.Box3().setFromObject(groundMesh);
  // Thêm margin an toàn để người dùng không bị kẹt ở rìa
  const safeMargin = PLAYER_RADIUS * 1.1;
  pos.x = THREE.MathUtils.clamp(pos.x, box.min.x + safeMargin, box.max.x - safeMargin);
  pos.z = THREE.MathUtils.clamp(pos.z, box.min.z + safeMargin, box.max.z - safeMargin);
  return pos;
}

/* ================== THIẾT LẬP CONTROLLERS ================== */
function setupControlsVR(viewerRig, renderer, camera) {
  const factory = new XRControllerModelFactory();
  
  // Thêm listener cho sự kiện XRFrame để đồng bộ góc nhìn
  renderer.xr.addEventListener('sessionstart', () => {
    console.log('VR Session started - Enabling view sync');
  });

  function updateCameraFromXRPose() {
    const xrCamera = renderer.xr.getCamera();
    if (xrCamera) {
      // Đồng bộ vị trí và hướng nhìn từ camera VR sang camera chính
      camera.position.copy(xrCamera.position);
      camera.quaternion.copy(xrCamera.quaternion);
      camera.updateProjectionMatrix();
    }
  }

  // Thêm callback để cập nhật camera trong mỗi frame VR
  renderer.setAnimationLoop((timestamp, frame) => {
    if (frame) {
      updateCameraFromXRPose();
    }
  });

  for (let i = 0; i < 2; i++) {
    const ctrl = renderer.xr.getController(i);
    const grip = renderer.xr.getControllerGrip(i);
    if (grip) grip.add(factory.createControllerModel(grip));

    ctrl.addEventListener("connected", (e) => {
      const hand = e.data?.handedness; // 'left' | 'right'
      if (hand === "left") controllerLeft = ctrl;
      if (hand === "right") controllerRight = ctrl;

      viewerRig.add(ctrl);
      if (grip) viewerRig.add(grip);
    });

    ctrl.addEventListener("disconnected", () => {
      if (controllerLeft === ctrl) controllerLeft = null;
      if (controllerRight === ctrl) controllerRight = null;
    });
  }

  viewerRig.add(camera);
  camera.position.set(0, 1.6, 0);
}

export function setLocomotionMode(mode) {
  locomotionMode = mode;
  if (Teleport?.cleanupTeleport) Teleport.cleanupTeleport();
}

export function getControllers() {
  return { left: controllerLeft, right: controllerRight };
}

/* ================== XỬ LÝ INPUT + DI CHUYỂN ================== */
function handleVRControllerInput(
  viewerRig, camera, renderer,
  groundMesh, obstacles, collisionCubes, houseModel,
  playerRef, delta
) {
  const session = renderer.xr.getSession();
  if (!session) return;

  // Build AABB nhà 1 lần
  buildHouseBoxesOnce(houseModel);

  // Đọc cần gạt
  let lx = 0, ly = 0, rx = 0;
  for (const source of session.inputSources) {
    const g = source.gamepad;
    if (!g) continue;

    const ax0 = g.axes[0] ?? 0, ay0 = g.axes[1] ?? 0;
    const ax2 = g.axes[2] ?? 0, ay2 = g.axes[3] ?? 0;

    if (source.handedness === "left" && (locomotionMode === "smooth" || locomotionMode === "hybrid")) {
      const use02 = (Math.abs(ax2) + Math.abs(ay2)) >= (Math.abs(ax0) + Math.abs(ay0));
      const rawX = use02 ? ax2 : ax0;
      const rawY = use02 ? ay2 : ay0;
      lx = Math.abs(rawX) < DEADZONE ? 0 : rawX;
      ly = Math.abs(rawY) < DEADZONE ? 0 : rawY;
    }

    if (source.handedness === "right") {
      const rx0 = g.axes[0] ?? 0, rx2 = g.axes[2] ?? 0;
      rx = Math.abs(rx2) > Math.abs(rx0) ? rx2 : rx0;
    }
  }

  // Turn
  if (turnState.mode === "smooth") {
    if (Math.abs(rx) > DEADZONE) {
      viewerRig.rotation.y += -rx * TURN_SMOOTH_SPEED * delta; // gạt phải → quay phải
      viewerRig.updateMatrixWorld(true);
    }
  } else {
    const now = performance.now();
    if (Math.abs(rx) > DEADZONE) {
      if (!turnState.wasTurning && now - turnState.lastSnapTime > SNAP_COOLDOWN_MS) {
        const angle = (rx > 0 ? -1 : 1) * SNAP_TURN_ANGLE;
        viewerRig.rotation.y += angle;
        viewerRig.updateMatrixWorld(true);
        turnState.wasTurning = true;
        turnState.lastSnapTime = now;
      }
    } else {
      turnState.wasTurning = false;
    }
  }

  // Move
  if (lx === 0 && ly === 0) {
    // Không di chuyển: đồng bộ rig với player (nếu có)
    if (playerRef) viewerRig.position.set(playerRef.position.x, 0, playerRef.position.z);
    return;
  }

  moveVRPlayer(
    viewerRig, camera, lx, ly, delta,
    groundMesh, obstacles, collisionCubes, houseModel,
    true, playerRef
  );
}

let headBobTimer = 0;

function moveVRPlayer(
  viewerRig, camera, moveX, moveY, delta,
  groundMesh, obstacles, collisionCubes, houseModel,
  inVR = false, playerRef = null
) {
  // Hướng theo rig/head
  let forward, right;
  if (movementReference === "rig") {
    const yaw = viewerRig.rotation.y;
    const rot = new THREE.Euler(0, yaw, 0, "YXZ");
    forward = new THREE.Vector3(0, 0, -1).applyEuler(rot).setY(0).normalize();
    right   = new THREE.Vector3(1, 0,  0).applyEuler(rot).setY(0).normalize();
  } else {
    forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0; forward.normalize();
    right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0; right.normalize();
  }

  const movement = new THREE.Vector3()
    .addScaledVector(forward, -moveY * MOVE_SPEED * delta)
    .addScaledVector(right,   +moveX * MOVE_SPEED * delta);

  const current = (playerRef ? playerRef.position.clone() : viewerRig.position.clone());
  let desired = current.clone().add(movement);

  // 1) Front trước (đệm mỏng + shrink để SÁT ở phía trước)
  if (_houseFrontBoxes && _houseFrontBoxes.length) {
    desired = resolveAgainstAABBSet(current, desired, _houseFrontBoxes, PLAYER_RADIUS, FRONT_SKIN, HYST, MIN_GAP).pos;
  }
  // 2) Other sau (giữ chặt như cũ ở hông/lưng)
  if (_houseOtherBoxes && _houseOtherBoxes.length) {
    desired = resolveAgainstAABBSet(current, desired, _houseOtherBoxes, PLAYER_RADIUS, SKIN, HYST, MIN_GAP).pos;
  }

  // 3) Obstacles/collisionCubes (chặn cứng + lùi nhẹ tránh giật)
  if (Array.isArray(obstacles) || Array.isArray(collisionCubes)) {
    const sph = new THREE.Sphere(desired, PLAYER_RADIUS);
    const list = [];
    if (Array.isArray(obstacles)) list.push(...obstacles);
    if (Array.isArray(collisionCubes)) list.push(...collisionCubes);
    for (const o of list) {
      if (!o) continue;
      const b = new THREE.Box3().setFromObject(o);
      if (b.intersectsSphere(sph)) {
        const backOff = movement.clone();
        if (backOff.lengthSq() > 0) {
          backOff.setLength(Math.min(0.01, backOff.length()));
          desired.addScaledVector(backOff, -1);
        }
        break;
      }
    }
  }

  // 4) Clamp theo ground
  desired = clampToGround(groundMesh, desired);

  // 5) Apply
  if (playerRef) playerRef.position.copy(desired);
  viewerRig.position.set(desired.x, 0, desired.z);

  // Head bob chỉ áp dụng desktop
  if (!inVR && (Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1)) {
    headBobTimer += delta;
    camera.position.y = 1.6 + Math.sin(headBobTimer * 10) * 0.03;
  } else if (!inVR) {
    headBobTimer = 0;
    camera.position.y = 1.6;
  }
}

/* ================== EXPORT ================== */
function setupControlsVRWrapper(viewerRig, renderer, camera) { return setupControlsVR(viewerRig, renderer, camera); }
function handleVRControllerInputWrapper(viewerRig, camera, renderer, groundMesh, obstacles, collisionCubes, houseModel, playerRef, delta) {
  return handleVRControllerInput(viewerRig, camera, renderer, groundMesh, obstacles, collisionCubes, houseModel, playerRef, delta);
}
function resetControllerState() { turnState.wasTurning = false; }

export const ControlsVR = {
  setupControlsVR: setupControlsVRWrapper,
  handleVRControllerInput: handleVRControllerInputWrapper,
  resetControllerState,
  setLocomotionMode,
  getControllers
};

export default ControlsVR;
