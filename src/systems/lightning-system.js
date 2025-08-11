import * as THREE from "three"

export class LightningSystem {
  constructor(scene, camera, thunderAudio) {
    this.scene = scene
    this.camera = camera
    this.lightningFlashes = []
    this.ambientLightning = null
    this.thunderAudio = thunderAudio
    this.lastLightningTime = 0
    this.lightningInterval = 3000

    this.createAmbientLightning()
  }

  createAmbientLightning() {
    this.ambientLightning = new THREE.DirectionalLight(0x9999ff, 0)
    this.ambientLightning.position.set(0, 50, 0)
    this.scene.add(this.ambientLightning)
  }

  createLightningFlash(position = null) {
    if (!position) {
      position = new THREE.Vector3((Math.random() - 0.5) * 100, 30 + Math.random() * 20, (Math.random() - 0.5) * 100)
    }

    const lightningLight = new THREE.PointLight(0x9999ff, 2, 50)
    lightningLight.position.copy(position)
    this.scene.add(lightningLight)

    const lightningGeometry = new THREE.CylinderGeometry(0.1, 0.1, 30, 8)
    const lightningMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    })

    const lightningBolt = new THREE.Mesh(lightningGeometry, lightningMaterial)
    lightningBolt.position.copy(position)
    lightningBolt.position.y -= 15

    const points = []
    for (let i = 0; i <= 20; i++) {
      const y = position.y - (i / 20) * 30
      const x = position.x + (Math.random() - 0.5) * 2
      const z = position.z + (Math.random() - 0.5) * 2
      points.push(new THREE.Vector3(x, y, z))
    }

    const lightningPath = new THREE.CatmullRomCurve3(points)
    const tubeGeometry = new THREE.TubeGeometry(lightningPath, 20, 0.05, 8, false)
    const tubeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
    })

    const lightningTube = new THREE.Mesh(tubeGeometry, tubeMaterial)
    this.scene.add(lightningTube)

    const flash = {
      light: lightningLight,
      bolt: lightningTube,
      startTime: Date.now(),
      duration: 200 + Math.random() * 300,
    }

    this.lightningFlashes.push(flash)

    setTimeout(
      () => {
        this.playThunder()
      },
      100 + Math.random() * 500,
    )

    this.ambientLightning.intensity = 0.5
    setTimeout(() => {
      this.ambientLightning.intensity = 0
    }, 100)
  }

  playThunder() {
    if (this.thunderAudio) {
      this.thunderAudio.playThunder(0.5 + Math.random() * 0.3)
    }
  }

  update(weatherIntensity) {
    const currentTime = Date.now()

    if (weatherIntensity > 0.3 && currentTime - this.lastLightningTime > this.lightningInterval) {
      if (Math.random() < weatherIntensity * 0.3) {
        this.createLightningFlash()
        this.lastLightningTime = currentTime
        this.lightningInterval = 2000 + Math.random() * 3000 * (1 - weatherIntensity)
      }
    }

    this.lightningFlashes = this.lightningFlashes.filter((flash) => {
      const elapsed = currentTime - flash.startTime
      const progress = elapsed / flash.duration

      if (progress >= 1) {
        this.scene.remove(flash.light)
        this.scene.remove(flash.bolt)
        return false
      }

      const opacity = 1 - progress
      flash.light.intensity = 2 * opacity
      flash.bolt.material.opacity = opacity

      return true
    })
  }
}
