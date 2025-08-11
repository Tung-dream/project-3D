import * as THREE from "three"

// These functions were defined in the original file but not actively used in the main logic flow.
// The primary bulb light control happens via `dnLights` and `toggleBulbLights`.
// Keeping them here to adhere to the "no logic modification" rule, but they are not called.

export const bulbLights = []
export const bulbGlowMeshes = []

export function createBulbLight(bulbObject, parentModel, scene) {
  const worldPosition = new THREE.Vector3()
  bulbObject.getWorldPosition(worldPosition)

  const bulbLight = new THREE.PointLight(0xfff4e6, 0, 12, 2)
  bulbLight.position.copy(worldPosition)
  bulbLight.castShadow = true
  bulbLight.shadow.mapSize.width = 512
  bulbLight.shadow.mapSize.height = 512
  bulbLight.shadow.camera.near = 0.1
  bulbLight.shadow.camera.far = 12
  bulbLight.shadow.bias = -0.001
  bulbLight.userData.isBulbLight = true

  scene.add(bulbLight)

  const glowGeometry = new THREE.SphereGeometry(0.15, 8, 6)
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff4e6,
    transparent: true,
    opacity: 0.8,
    fog: false,
  })

  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial)
  glowMesh.position.copy(worldPosition)
  glowMesh.userData.isBulbGlow = true
  scene.add(glowMesh)

  bulbLights.push({
    light: bulbLight,
    glow: glowMesh,
    bulbObject: bulbObject,
    parentModel: parentModel,
  })

  console.log(
    `Created bulb light at position: ${worldPosition.x.toFixed(2)}, ${worldPosition.y.toFixed(2)}, ${worldPosition.z.toFixed(2)}`,
  )
}

export function initializeBulbLights(scene) {
  scene.traverse((object) => {
    if (object.name && object.name.match(/^dn[1-6]$/)) {
      console.log(`Found bulb object: ${object.name}`)

      let parentModel = object
      while (parentModel.parent && !parentModel.userData.type) {
        parentModel = parentModel.parent
      }

      createBulbLight(object, parentModel, scene)
    }
  })

  console.log(`Initialized ${bulbLights.length} bulb lights`)
}
