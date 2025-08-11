export function updateLights(state) {
  const { settings, dirLight, ambientLight, hemiLight, moonLight, dnLights } = state

  // Thêm kiểm tra null để đảm bảo các đối tượng ánh sáng đã được khởi tạo
  if (!dirLight || !ambientLight || !hemiLight || !moonLight) {
    console.warn("Lights not fully initialized in state, skipping updateLights.")
    return
  }

  if (settings.timeOfDay === "day" || settings.timeOfDay === "sun" || settings.timeOfDay === "noon") {
    dirLight.intensity = 1.5
    ambientLight.intensity = 0.1
    hemiLight.intensity = 0.6
    dirLight.color.setHSL(0.12, 0.8, 0.7)
    moonLight.intensity = 0
    dirLight.castShadow = true
    moonLight.castShadow = false
    toggleBulbLights(state, false)
  } else if (settings.timeOfDay === "night") {
    dirLight.intensity = 0.01
    ambientLight.intensity = 0.02
    hemiLight.intensity = 0.1
    dirLight.color.setHSL(0.6, 0.3, 0.2)
    moonLight.intensity = 0.1
    moonLight.color.setHSL(0.55, 0.5, 0.8)
    dirLight.castShadow = false
    moonLight.castShadow = false
    toggleBulbLights(state, true)
  } else {
    dirLight.intensity = 0.01
    ambientLight.intensity = 0.02
    hemiLight.intensity = 0.05
    dirLight.color.setHSL(0.6, 0.3, 0.2)
    moonLight.intensity = 0.3
    moonLight.color.setHSL(0.55, 0.5, 0.8)
    dirLight.castShadow = false
    moonLight.castShadow = false
    toggleBulbLights(state, false)
  }
}

export function toggleBulbLights(state, forceState = null) {
  const { settings, dnLights } = state
  const enable = forceState !== null ? forceState : settings.enableBulbLights

  const intensity = enable ? 150.0 : 0
  const glowOpacity = enable ? 1.0 : 0

  for (const obj of dnLights) {
    // Thêm kiểm tra null cho light và glow
    if (obj.light) {
      obj.light.intensity = intensity
    }
    if (obj.glow && obj.glow.material) {
      obj.glow.material.opacity = glowOpacity
      obj.glow.visible = glowOpacity > 0
    }
  }
}
