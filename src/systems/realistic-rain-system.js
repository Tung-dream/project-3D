import * as THREE from "three"

export class RealisticRainSystem {
  constructor(scene, groundBoundingBox) {
    this.scene = scene
    this.groundBoundingBox = groundBoundingBox
    this.rainDrops = []
    this.splashParticles = []
    this.rainMesh = null
    this.splashMesh = null
    this.maxRainDrops = 0
    this.rainIntensity = 0
    this.windForce = new THREE.Vector3(0, 0, 0)

    this.createRainMaterials()
  }

  createRainMaterials() {
    this.rainMaterial = new THREE.MeshBasicMaterial({
      color: 0xaaaaff,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    this.splashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    })
  }

  generateRain(intensity, windX = 0, windZ = 0) {
    this.rainIntensity = intensity
    this.windForce.set(windX, 0, windZ)

    this.clearRain()

    if (intensity === 0 || !this.groundBoundingBox) return

    this.maxRainDrops = Math.floor(intensity * 83500)

    const rainGeometry = this.createRainDropGeometry()

    this.rainMesh = new THREE.InstancedMesh(rainGeometry, this.rainMaterial, this.maxRainDrops)
    this.rainMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    this.initializeRainDrops()

    this.createSplashSystem()

    this.scene.add(this.rainMesh)
    if (this.splashMesh) {
      this.scene.add(this.splashMesh)
    }
  }

  createRainDropGeometry() {
    const geometry = new THREE.ConeGeometry(0.008, 0.4, 4)
    geometry.translate(0, -0.2, 0)
    return geometry
  }

  initializeRainDrops() {
    const dummy = new THREE.Object3D()
    const groundSize = new THREE.Vector3()
    this.groundBoundingBox.getSize(groundSize)
    const groundCenter = new THREE.Vector3()
    this.groundBoundingBox.getCenter(groundCenter)

    for (let i = 0; i < this.maxRainDrops; i++) {
      const x = groundCenter.x + (Math.random() - 0.5) * groundSize.x
      const y = Math.random() * 150 + 50
      const z = groundCenter.z + (Math.random() - 0.5) * groundSize.z

      dummy.position.set(x, y, z)

      const windTilt = Math.atan2(this.windForce.x, 10) * 0.3
      dummy.rotation.set(0, 0, windTilt)

      const scale = 0.8 + Math.random() * 0.4
      dummy.scale.set(scale, 1 + Math.random() * 0.5, scale)

      dummy.updateMatrix()
      this.rainMesh.setMatrixAt(i, dummy.matrix)

      this.rainDrops[i] = {
        velocity: new THREE.Vector3(0, -(8 + Math.random() * 4), 0),
        life: Math.random(),
        initialY: y,
      }
    }
  }

  createSplashSystem() {
    const splashCount = Math.floor(this.maxRainDrops * 0.1)
    if (splashCount === 0) return

    const splashGeometry = new THREE.SphereGeometry(0.05, 6, 4)
    this.splashMesh = new THREE.InstancedMesh(splashGeometry, this.splashMaterial, splashCount)
    this.splashMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    for (let i = 0; i < splashCount; i++) {
      this.splashParticles[i] = {
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0.5,
        active: false,
      }
    }
  }

  update(deltaTime) {
    if (!this.rainMesh || this.rainIntensity === 0) return

    this.updateRainDrops(deltaTime)
    this.updateSplashes(deltaTime)
  }

  updateRainDrops(deltaTime) {
    const dummy = new THREE.Object3D()
    const groundSize = new THREE.Vector3()
    this.groundBoundingBox.getSize(groundSize)
    const groundCenter = new THREE.Vector3()
    this.groundBoundingBox.getCenter(groundCenter)

    for (let i = 0; i < this.maxRainDrops; i++) {
      const drop = this.rainDrops[i]

      this.rainMesh.getMatrixAt(i, dummy.matrix)
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale)

      drop.velocity.y -= 9.8 * deltaTime * 2
      drop.velocity.x = this.windForce.x * 0.5
      drop.velocity.z = this.windForce.z * 0.5

      dummy.position.add(drop.velocity.clone().multiplyScalar(deltaTime))

      if (dummy.position.y <= 0.1) {
        this.createSplash(dummy.position.clone())

        dummy.position.set(
          groundCenter.x + (Math.random() - 0.5) * groundSize.x,
          drop.initialY + Math.random() * 50,
          groundCenter.z + (Math.random() - 0.5) * groundSize.z,
        )
        drop.velocity.set(0, -(8 + Math.random() * 4), 0)
      }

      const velocityDirection = drop.velocity.clone().normalize()
      dummy.rotation.set(0, 0, Math.atan2(velocityDirection.x, -velocityDirection.y))

      dummy.updateMatrix()
      this.rainMesh.setMatrixAt(i, dummy.matrix)
    }

    this.rainMesh.instanceMatrix.needsUpdate = true
  }

  createSplash(position) {
    for (let i = 0; i < this.splashParticles.length; i++) {
      const splash = this.splashParticles[i]
      if (!splash.active) {
        splash.position.copy(position)
        splash.position.y = 0.05

        splash.velocity.set((Math.random() - 0.5) * 2, Math.random() * 3 + 1, (Math.random() - 0.5) * 2)

        splash.life = 0
        splash.active = true
        break
      }
    }
  }

  updateSplashes(deltaTime) {
    if (!this.splashMesh) return

    const dummy = new THREE.Object3D()

    for (let i = 0; i < this.splashParticles.length; i++) {
      const splash = this.splashParticles[i]

      if (!splash.active) continue

      splash.life += deltaTime

      if (splash.life >= splash.maxLife) {
        splash.active = false
        dummy.position.set(0, -1000, 0)
        dummy.scale.set(0, 0, 0)
      } else {
        splash.velocity.y -= 9.8 * deltaTime
        splash.position.add(splash.velocity.clone().multiplyScalar(deltaTime))

        dummy.position.copy(splash.position)

        const lifeRatio = splash.life / splash.maxLife
        const scale = (1 - lifeRatio) * 0.5
        dummy.scale.set(scale, scale, scale)
      }

      dummy.updateMatrix()
      this.splashMesh.setMatrixAt(i, dummy.matrix)
    }

    this.splashMesh.instanceMatrix.needsUpdate = true
  }

  clearRain() {
    if (this.rainMesh) {
      this.scene.remove(this.rainMesh)
      this.rainMesh.geometry.dispose()
      this.rainMesh = null
    }

    if (this.splashMesh) {
      this.scene.remove(this.splashMesh)
      this.splashMesh.geometry.dispose()
      this.splashMesh = null
    }

    this.rainDrops = []
    this.splashParticles = []
  }

  setWindForce(x, z) {
    this.windForce.set(x, 0, z)
  }

  setIntensity(intensity) {
    this.rainIntensity = intensity

    if (this.rainMesh) {
      this.rainMaterial.opacity = 0.3 + intensity * 0.5
    }
  }
}
