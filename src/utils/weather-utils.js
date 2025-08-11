import * as THREE from "three"
import { updateLights } from "./lights.js"
import { RealisticRainSystem } from "../systems/realistic-rain-system.js"
import { LightningSystem } from "../systems/lightning-system.js"

export function updateWeatherSystem(state, weatherType) {
  const { settings, scene, rainAudio, stormAudio, realisticRainSystem, lightningSystem } = state

  switch (weatherType) {
    case "clear":
      settings.rainIntensity = 0.0
      settings.lightningFrequency = 0.0
      settings.stormMode = false
      scene.fog = null
      if (rainAudio && rainAudio.isPlaying) {
        rainAudio.stop()
      }
      if (stormAudio && stormAudio.isPlaying) {
        stormAudio.stop()
      }
      break

    case "moderate_rain":
      settings.rainIntensity = 0.6
      settings.lightningFrequency = 0.3
      settings.stormMode = false
      scene.fog = new THREE.Fog(0x555555, 30, 150)
      if (stormAudio && stormAudio.isPlaying) {
        stormAudio.stop()
      }
      if (rainAudio && !rainAudio.isPlaying && rainAudio.buffer) {
        rainAudio.play()
      }
      break

    case "heavy_rain":
      settings.rainIntensity = 0.8
      settings.lightningFrequency = 0.5
      settings.stormMode = false
      scene.fog = new THREE.Fog(0x333333, 20, 100)
      if (rainAudio && rainAudio.isPlaying) {
        rainAudio.stop()
      }
      if (stormAudio && !stormAudio.isPlaying && stormAudio.buffer) {
        stormAudio.play()
      }
      break

    case "storm_rain":
      settings.rainIntensity = 1.0
      settings.lightningFrequency = 0.8
      settings.stormMode = true
      scene.fog = new THREE.Fog(0x222222, 15, 80)
      if (rainAudio && rainAudio.isPlaying) {
        rainAudio.stop()
      }
      if (stormAudio && !stormAudio.isPlaying && stormAudio.buffer) {
        stormAudio.play()
      }
      break
  }

  updateRainSettings(state)
  updateShaderUniforms(state)
}

export function updateRainSettings(state) {
  const { settings, realisticRainSystem, rainPass } = state
  if (realisticRainSystem) {
    realisticRainSystem.generateRain(settings.rainIntensity, settings.windX * 0.1, settings.windZ * 0.1)
    realisticRainSystem.setWindForce(settings.windX * 0.1, settings.windZ * 0.1)
    realisticRainSystem.setIntensity(settings.rainIntensity)
  }
}

export function updateShaderUniforms(state) {
  const { settings, rainPass, lightningPass } = state
  rainPass.uniforms.rainIntensity.value = settings.rainIntensity
  rainPass.uniforms.windDirection.value.set(settings.windX * 0.01, settings.windZ * 0.01)
  lightningPass.uniforms.lightningIntensity.value = settings.lightningFrequency
}

export function handleTimeOfDayChange(state, value) {
  const { settings, scene, sunTexture, dayTexture, noonTexture, nightTexture, rainTexture, skyDome, nightSkyMesh } =
    state
  settings.timeOfDay = value
  console.log("Changed timeOfDay to:", value)

  scene.traverse((child) => {
    if (child.userData && child.userData.light) {
      // This part of the logic was missing from the original code after refactoring.
      // It assumes 'updateLightState' exists which it doesn't.
      // Keeping it commented out or adapting based on 'toggleBulbLights' for now.
      // The original code uses 'toggleBulbLights' directly on the GUI change.
    }
  })

  if (value === "sun" && sunTexture) {
    scene.background = sunTexture
    scene.environment = sunTexture
    if (skyDome) scene.remove(skyDome)
    if (nightSkyMesh) scene.remove(nightSkyMesh)
    state.toggleBulbLights(state, false)
  } else if (value === "day" && dayTexture) {
    scene.background = dayTexture
    scene.environment = dayTexture
    if (skyDome) scene.remove(skyDome)
    if (nightSkyMesh) scene.remove(nightSkyMesh)
    state.toggleBulbLights(state, false)
  } else if (value === "noon" && noonTexture) {
    scene.background = noonTexture
    scene.environment = noonTexture
    if (skyDome) scene.remove(skyDome)
    if (nightSkyMesh) scene.remove(nightSkyMesh)
    state.toggleBulbLights(state, true)
  } else if (value === "night" && nightTexture) {
    scene.background = nightTexture
    scene.environment = nightTexture
    if (skyDome) scene.remove(skyDome)
    scene.fog = null // Re-add fog removal for night
    state.toggleBulbLights(state, true)
  } else if (value === "rain" && rainTexture) {
    scene.background = rainTexture
    scene.environment = rainTexture
    scene.backgroundIntensity = 0.3 // This property doesn't exist directly on scene
    scene.environmentIntensity = settings.rainEnvironmentIntensity // This property doesn't exist directly on scene.environment
    if (skyDome) scene.remove(skyDome)
    if (nightSkyMesh) scene.remove(nightSkyMesh)
    state.toggleBulbLights(state, false)
  }

  updateLights(state)
}

export function initWeatherSystems(state) {
  const { scene, camera, groundBoundingBox, settings } = state
  state.realisticRainSystem = new RealisticRainSystem(scene, groundBoundingBox)
  state.lightningSystem = new LightningSystem(scene, camera, state.thunderAudio)

  const audioLoader = new THREE.AudioLoader()
  const listener = new THREE.AudioListener()
  camera.add(listener)

  state.rainAudio = new THREE.Audio(listener)
  audioLoader.load(
    "/rain.mp3",
    (buffer) => {
      state.rainAudio.setBuffer(buffer)
      state.rainAudio.setLoop(true)
      state.rainAudio.setVolume(settings.stormVolume)
      console.log("Loaded rain.mp3")
    },
    undefined,
    (err) => console.error("Error loading rain.mp3:", err),
  )

  state.stormAudio = new THREE.Audio(listener)
  audioLoader.load(
    "/storm.mp3",
    (buffer) => {
      state.stormAudio.setBuffer(buffer)
      state.stormAudio.setLoop(true)
      state.stormAudio.setVolume(settings.stormVolume)
      console.log("Loaded storm.mp3")
    },
    undefined,
    (err) => console.error("Error loading storm.mp3:", err),
  )

  updateWeatherSystem(state, "clear")

  console.log("✅ Realistic Rain System initialized")
}
