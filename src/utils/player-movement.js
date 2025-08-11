import * as THREE from "three"

export const keys = {}
export let isMovingMode = false
export let yaw = 0
export let pitch = 0
export let isRightMouseDown = false
export let lastMouseX = 0
export let lastMouseY = 0

const playerHeight = 1.75
const playerRadius = 0.5
const raycaster = new THREE.Raycaster()

export function setupPlayerMovementListeners(renderer, state) {
  renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault())

  renderer.domElement.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      // Chuột phải
      isRightMouseDown = true
      lastMouseX = e.clientX
      lastMouseY = e.clientY
      state.controls.enabled = false // Vô hiệu hóa OrbitControls khi giữ chuột phải để xoay góc nhìn
    }
  })

  renderer.domElement.addEventListener("mouseup", (e) => {
    if (e.button === 2) {
      isRightMouseDown = false
      // Bật lại OrbitControls chỉ khi không ở chế độ di chuyển bằng bàn phím
      if (!isMovingMode) {
        state.controls.enabled = true
      }
    }
  })

  document.addEventListener("mousemove", (e) => {
    if (!isRightMouseDown) return // Chỉ xoay góc nhìn nếu chuột phải đang được giữ

    const sensitivity = 0.003
    const movementX = e.clientX - lastMouseX
    const movementY = e.clientY - lastMouseY
    lastMouseX = e.clientX
    lastMouseY = e.clientY

    yaw -= movementX * sensitivity
    pitch -= movementY * sensitivity
    // Giới hạn góc nhìn dọc từ -90 độ đến +90 độ
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch))
    state.camera.rotation.set(pitch, yaw, 0, "YXZ")
  })

  window.addEventListener("keydown", (e) => {
    // Chỉ xử lý nếu phím chưa được nhấn để tránh lặp lại hành động
    if (!keys[e.key]) {
      keys[e.key] = true
      isMovingMode = true
      state.controls.enabled = false // Vô hiệu hóa OrbitControls khi di chuyển bằng bàn phím
    }
  })

  window.addEventListener("keyup", (e) => {
    keys[e.key] = false
    // Kiểm tra xem còn phím di chuyển nào đang được nhấn không
    const anyMovementKeyActive = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "w",
      "s",
      "a",
      "d",
      "W",
      "S",
      "A",
      "D",
    ].some((key) => keys[key])

    if (!anyMovementKeyActive) {
      isMovingMode = false
      // Bật lại OrbitControls chỉ khi chuột phải không được giữ
      if (!isRightMouseDown) {
        state.controls.enabled = true
      }
    }
  })
}

export function movePlayer(delta, state) {
  if (!state.player || !state.miniPlayer) {
    return
  }

  const { player, camera, obstacles, collisionCubes, houseModel, miniPlayer, controls } = state
  const speed = 8
  const moveVector = new THREE.Vector3()

  const cameraDirection = new THREE.Vector3()
  camera.getWorldDirection(cameraDirection)
  const rightVector = new THREE.Vector3()
  rightVector.crossVectors(cameraDirection, camera.up).normalize()
  const forwardVector = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize()

  if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
    moveVector.add(forwardVector)
  }
  if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
    moveVector.sub(forwardVector)
  }
  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
    moveVector.sub(rightVector)
  }
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
    moveVector.add(rightVector)
  }

  if (moveVector.lengthSq() > 0) {
    moveVector.normalize()
    const movement = moveVector.multiplyScalar(speed * delta)
    const newPosition = player.position.clone().add(movement)

    const playerRaycastOrigin = player.position.clone()
    playerRaycastOrigin.y += 0.5
    let canMove = true
    const normalizedMovement = movement.clone().normalize()

    if (checkCollision(playerRaycastOrigin, normalizedMovement, 1.5, obstacles)) {
      canMove = false
    }

    if (houseModel) {
      const houseBox = new THREE.Box3().setFromObject(houseModel)
      if (
        houseBox.containsPoint(newPosition) ||
        houseBox.intersectsSphere(new THREE.Sphere(newPosition, playerRadius))
      ) {
        canMove = false
      }
    }

    for (const cube of collisionCubes) {
      const cubeBox = new THREE.Box3().setFromObject(cube)
      if (cubeBox.intersectsSphere(new THREE.Sphere(newPosition, playerRadius))) {
        canMove = false
        break
      }
    }

    raycaster.set(new THREE.Vector3(newPosition.x, player.position.y + 10, newPosition.z), new THREE.Vector3(0, -1, 0))
    const groundIntersects = raycaster.intersectObjects(obstacles, true)

    if (canMove) {
      if (groundIntersects.length > 0) {
        const groundPoint = groundIntersects[0].point
        const distanceToGround = newPosition.y - groundPoint.y
        if (Math.abs(distanceToGround) < 5 && newPosition.y > groundPoint.y - 0.1) {
          newPosition.y = groundPoint.y + playerRadius
          player.position.copy(newPosition)
          miniPlayer.position.copy(player.position)
          camera.position.x = player.position.x
          camera.position.y = player.position.y + (1.75 - playerRadius)
          camera.position.z = player.position.z
        }
      }
    }
  }
}

function checkCollision(position, direction, distance, obstacles) {
  raycaster.set(position, direction)
  const intersects = raycaster.intersectObjects(obstacles, true)

  if (intersects.length > 0) {
    return intersects[0].distance < distance
  }
  return false
}
