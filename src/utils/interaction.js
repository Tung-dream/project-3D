import * as THREE from "three"

export const raycasterInteraction = new THREE.Raycaster()
export const mouse = new THREE.Vector2()
export const infoDisplay = document.createElement("div")

infoDisplay.style.position = "absolute"
infoDisplay.style.backgroundColor = "rgba(0, 0, 0, 0.7)"
infoDisplay.style.color = "white"
infoDisplay.style.padding = "8px"
infoDisplay.style.borderRadius = "5px"
infoDisplay.style.pointerEvents = "none"
infoDisplay.style.display = "none"
infoDisplay.style.zIndex = "100"
document.body.appendChild(infoDisplay)

export function isPlayerInFrontOfHouse(state) {
  const { houseModel, player } = state
  if (!houseModel) return false
  const houseDirection = new THREE.Vector3(0, 0, 1)
  houseDirection.applyQuaternion(houseModel.quaternion)
  const toPlayer = new THREE.Vector3().subVectors(player.position, houseModel.position).normalize()
  const dot = houseDirection.dot(toPlayer)
  return dot > 0.5
}

export function detectNearbyInfo(state) {
  const { camera, interactiveObjects, settings } = state
  const maxVisibleDistance = 18
  const cameraFrustum = new THREE.Frustum()
  const camViewProjMatrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  cameraFrustum.setFromProjectionMatrix(camViewProjMatrix)

  if (infoDisplay.style.display === "block") {
    document.querySelectorAll(".info-label-instance").forEach((e) => e.remove())
    return
  }

  document.querySelectorAll(".info-label-instance").forEach((e) => e.remove())
  const isInFrontOfHouse = isPlayerInFrontOfHouse(state)

  for (const model of interactiveObjects) {
    if (!model.userData.info) continue
    if ((model.userData.isCarInHouse || model.userData.type === "house") && !isInFrontOfHouse) continue

    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const distance = camera.position.distanceTo(center)
    const isVisible = cameraFrustum.intersectsBox(box)

    if (isVisible && distance < maxVisibleDistance) {
      const screenPosition = center.clone().project(camera)
      const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth
      const y = (-screenPosition.y * 0.5 + 0.5) * window.innerHeight

      const label = document.createElement("div")
      label.className = "info-label-instance"
      label.innerText = model.userData.info
      Object.assign(label.style, {
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -100%)",
        background: "rgba(0,0,0,0.7)",
        color: "white",
        padding: "4px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        zIndex: 100,
      })
      document.body.appendChild(label)
    }
  }
}

export function checkHouseTrigger(state) {
  const { houseModel, player, interactiveObjects, carModelsLoaded } = state
  const isInFrontOfHouse = isPlayerInFrontOfHouse(state)
  if (!houseModel) return

  if (isInFrontOfHouse) {
    for (const car of carModelsLoaded) {
      if (car.userData.isCarInHouse) {
        const dist = player.position.distanceTo(car.position)
        if (dist < 3) {
          showInfoLabel(car.userData.info, car.position, state)
          return
        }
      }
    }
  }

  for (const model of interactiveObjects) {
    if (!model.userData.info) continue
    if (model.userData.type === "house" && !isInFrontOfHouse) {
      continue
    }

    const box = new THREE.Box3().setFromObject(model)
    if (box.containsPoint(player.position)) {
      showInfoLabel(model.userData.info, model.position, state)
      return
    }
  }

  hideTriggerInfoLabel()
}

export function showInfoLabel(info, position, state) {
  infoDisplay.textContent = info
  infoDisplay.style.display = "block"
  const vector = position.clone().project(state.camera)
  const x = (vector.x * 0.5 + 0.5) * window.innerWidth
  const y = (-vector.y * 0.5 + 0.5) * window.innerHeight
  infoDisplay.style.left = `${x + 10}px`
  infoDisplay.style.top = `${y + 10}px`
  clearTimeout(infoDisplay._hideTimer)
  infoDisplay._hideTimer = setTimeout(() => {
    infoDisplay.style.display = "none"
  }, 3000)
}

export function hideTriggerInfoLabel() {
  infoDisplay.style.display = "none"
}
