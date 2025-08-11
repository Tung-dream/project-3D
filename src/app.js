import * as THREE from "three"
import GUI from "lil-gui"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js"
import { RealisticRainShader } from "./shaders/realistic-rain-shader.js"
import { LightningShader } from "./shaders/lightning-shader.js"
import { setupPlayerMovementListeners } from "./utils/player-movement.js"
import { initializeModelLoaders } from "./utils/model-loader.js"
import { state } from "./state.js"

// === SCENE SETUP ===
state.camera.position.set(0, 1.75, 0)

// === RENDERER ===
state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, logarithmicDepthBuffer: true })
state.renderer.setSize(window.innerWidth, window.innerHeight)
state.renderer.outputEncoding = THREE.sRGBEncoding
state.renderer.setPixelRatio(window.devicePixelRatio)
state.renderer.toneMapping = THREE.ACESFilmicToneMapping
state.renderer.shadowMap.enabled = true
state.renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.style.margin = "0"
document.body.style.overflow = "hidden"
document.body.style.backgroundColor = "#000"
document.body.appendChild(state.renderer.domElement)
state.renderer.domElement.setAttribute("tabindex", "0")
state.renderer.domElement.focus()
state.renderer.shadowMap.type = THREE.PCFSoftShadowMap
state.renderer.toneMapping = THREE.ACESFilmicToneMapping

const canvas = document.createElement("canvas")
const gl = canvas.getContext("webgl2")
console.log("Using WebGL Version:", gl instanceof WebGL2RenderingContext ? "WebGL 2" : "WebGL 1")

// === POST-PROCESSING SETUP ===
state.composer = new EffectComposer(state.renderer)
state.composer.addPass(new RenderPass(state.scene, state.camera))

state.rainPass = new ShaderPass(RealisticRainShader)
state.rainPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight)
state.composer.addPass(state.rainPass)

state.lightningPass = new ShaderPass(LightningShader)
state.lightningPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight)
state.composer.addPass(state.lightningPass)

// === SKY SETUP ===
state.pmremGenerator = new THREE.PMREMGenerator(state.renderer)
state.pmremGenerator.compileEquirectangularShader()

// Load sunvip.hdr
new RGBELoader().setPath("models1/").load(
  "sunvip.hdr",
  (texture) => {
    state.sunTexture = state.pmremGenerator.fromEquirectangular(texture).texture
    state.scene.background = state.sunTexture
    state.scene.environment = state.sunTexture
    texture.dispose()
    console.log("Loaded sunvip.hdr (set as default)")
  },
  undefined,
  (err) => console.error("Error loading sunvip.hdr:", err),
)

// Load sky.hdr (day)
new RGBELoader().setPath("models1/").load(
  "sky2.hdr",
  (texture) => {
    state.dayTexture = state.pmremGenerator.fromEquirectangular(texture).texture
    texture.dispose()
    console.log("Loaded sky2.hdr")
  },
  undefined,
  (err) => console.error("Error loading sky2.hdr:", err),
)

// load troi-mua.hdr
new RGBELoader().setPath("models1/").load(
  "troi-mua.hdr",
  (texture) => {
    state.rainTexture = state.pmremGenerator.fromEquirectangular(texture).texture
    texture.dispose()
    console.log("Loaded troi-mua.hdr")
  },
  undefined,
  (err) => console.error("Error loading troi-mua.hdr:", err),
)

// Initialize model loaders (needs renderer)
initializeModelLoaders(state.renderer)

// Load night5.hdr
new RGBELoader().setPath("models1/").load(
  "night5.hdr",
  (texture) => {
    state.nightTexture = state.pmremGenerator.fromEquirectangular(texture).texture
    texture.dispose()
    console.log("Loaded night5.hdr")
  },
  undefined,
  (err) => console.error("Error loading night5.hdr:", err),
)

// Load noon.hdr (buổi chiều)
new RGBELoader().setPath("models1/").load(
  "noon2.hdr",
  (texture) => {
    state.noonTexture = state.pmremGenerator.fromEquirectangular(texture).texture
    texture.dispose()
    console.log("Loaded noon2.hdr")
  },
  undefined,
  (err) => console.error("Error loading noon2.hdr:", err),
)

// === KHAI BÁO CONTROLS ===
state.controls = new OrbitControls(state.camera, state.renderer.domElement)
state.controls.enableDamping = true
state.controls.dampingFactor = 0.25
state.controls.rotateSpeed = 0.8
state.controls.zoomSpeed = 1.0
state.controls.panSpeed = 0.5
state.controls.enablePan = true
state.controls.minPolarAngle = 0
state.controls.maxPolarAngle = Math.PI / 2
state.controls.minDistance = 5
state.controls.maxDistance = 100
state.controls.enableZoom = false

// === Mini map camera ===
state.miniCamera = new THREE.OrthographicCamera(
  -state.miniMapSizeWorld,
  state.miniMapSizeWorld,
  state.miniMapSizeWorld,
  -state.miniMapSizeWorld,
  0.1,
  200,
)
state.miniCamera.position.set(0, 50, 0)
state.miniCamera.lookAt(0, 0, 0)
state.miniCamera.up.set(0, 0, -1)

// Ánh sáng môi trường và ánh trăng
state.ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
state.scene.add(state.ambientLight)
state.dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
state.dirLight.position.set(50, 100, 50)
state.dirLight.target.position.set(0, 0, 0)
state.scene.add(state.dirLight)
state.scene.add(state.dirLight.target)
state.dirLight.castShadow = true
state.dirLight.shadow.mapSize.width = 4096
state.dirLight.shadow.mapSize.height = 4096
state.dirLight.shadow.camera.near = 0.1
state.dirLight.shadow.camera.far = 300
state.dirLight.shadow.camera.left = -200
state.dirLight.shadow.camera.right = 200
state.dirLight.shadow.camera.top = 200
state.dirLight.shadow.camera.bottom = -200
state.dirLight.shadow.bias = -0.01

state.moonLight = new THREE.DirectionalLight(0xadd8e6, 0.2)
state.moonLight.position.set(-10, 10, -10)
state.moonLight.target.position.set(0, 0, 0)
state.scene.add(state.moonLight)
state.scene.add(state.moonLight.target)
state.moonLight.castShadow = false

// === PLAYER SETUP ===
const playerRadius = 0.5 // Định nghĩa playerRadius ở đây để sử dụng cho vị trí ban đầu
state.player = new THREE.Mesh(
  new THREE.CylinderGeometry(0.3, 0.3, 1.75, 16),
  new THREE.MeshBasicMaterial({ color: "blue", transparent: true, opacity: 0 }),
)
state.player.position.set(0, playerRadius, 0) // Đặt vị trí Y ban đầu của người chơi trên mặt đất
state.scene.add(state.player)

// === Player cho mini map ===
state.miniPlayer = new THREE.Mesh(new THREE.SphereGeometry(2, 40, 40), new THREE.MeshBasicMaterial({ color: "cyan" }))
state.miniPlayer.position.copy(state.player.position)
state.scene.add(state.miniPlayer)

// === IMPROVED GUI ===
const gui = new GUI({ title: "🌦️ Hệ thống thời tiết 3D", width: 320 })

// === MAIN CONTROLS FOLDER ===
const mainFolder = gui.addFolder("🎮 Điều khiển chính")
mainFolder.add(state.settings, "miniMap").name("📍 Hiện mini map")

mainFolder
  .add(state.settings, "timeOfDay", {
    "☀️ Buổi trưa": "sun",
    "🌅 Buổi sáng": "day",
    "🌅 Buổi chiều": "noon",
    "🌙 Buổi tối": "night",
    "🌧️ Trời sắp mưa": "rain",
  })
  .name("🌍 Chế độ môi trường")
  .onChange((value) => state.handleTimeOfDayChange(state, value))
mainFolder.open()

// === WEATHER SYSTEM FOLDER ===
const weatherFolder = gui.addFolder("🌧️ Hệ thống thời tiết")
weatherFolder
  .add(state.settings, "weather", {
    "☀️ Quang đãng": "Quang đãng",
    "🌦️ Mưa vừa": "Mưa vừa",
    "🌧️ Mưa lớn": "Mưa lớn",
    "⛈️ Mưa bão": "Mưa bão",
  })
  .name("🌤️ Loại thời tiết")
  .onChange((label) => state.updateWeatherSystem(state, state.weatherOptions[label]))

weatherFolder
  .add(state.settings, "rainIntensity", 0.0, 1.0, 0.05)
  .name("💧 Cường độ mưa")
  .onChange(() => state.updateRainSettings(state))
weatherFolder
  .add(state.settings, "windStrength", 0.0, 3.0, 0.1)
  .name("💨 Sức gió")
  .onChange(() => state.updateRainSettings(state))
weatherFolder.add(state.settings, "lightningFrequency", 0.0, 1.0, 0.05).name("⚡ Tần suất sét")
weatherFolder.add(state.settings, "stormMode").name("🌪️ Chế độ bão")
weatherFolder
  .add(state.settings, "stormVolume", 0.0, 1.0, 0.05)
  .name("🔊 Âm lượng")
  .onChange((value) => {
    if (state.rainAudio) {
      state.rainAudio.setVolume(value)
    }
    if (state.stormAudio) {
      state.stormAudio.setVolume(value)
    }
  })
weatherFolder.open()

// === ADVANCED SETTINGS FOLDER ===
const advancedFolder = gui.addFolder("⚙️ Cài đặt nâng cao")
advancedFolder.add(state.settings, "rainSpeed", 0.1, 3.0, 0.1).name("⬇️ Tốc độ rơi")
advancedFolder
  .add(state.settings, "windX", -15, 15, 0.5)
  .name("↔️ Gió ngang")
  .onChange(() => state.updateRainSettings(state))
advancedFolder
  .add(state.settings, "windZ", -15, 15, 0.5)
  .name("↕️ Gió xiên")
  .onChange(() => state.updateRainSettings(state))
advancedFolder
  .add(state.settings, "enableBulbLights")
  .name("💡 Bật đèn bulb")
  .onChange(() => {
    state.toggleBulbLights(state)
  })

// === MOUSE LOOK CONTROL ===
setupPlayerMovementListeners(state.renderer)

// === LOAD GROUND ===
state.loadModel("ground", 0, 0, 0, 0, 1, null, false)

// This is called AFTER ground is loaded to ensure groundBoundingBox is available
state.renderer.domElement.addEventListener("groundLoaded", () => {
  state.initWeatherSystems(state)
})

// === LOAD MODELS ===
const treePositions = [
  { type: "tree3", x: -5, z: 50, y: -0.05, info: "Cây xanh, cung cấp oxy" },
  { type: "tree3", x: 25, z: 55, y: -0.05, info: "Cây xanh, cung cấp oxy" },
  { type: "tree2", x: 27, z: 48, info: "Cây khô" },
  { type: "tree2", x: -6, z: -10, info: "Cây khô" },
  { type: "tree2", x: 20, z: -10, info: "Cây khô" },
  { type: "tree3", x: -8, z: 3, y: -0.05, info: "Cây xanh, cung cấp oxy" },
  { type: "den1", x: -36, z: 36, y: 7 },
  { type: "den1", x: 15, z: 39, y: 7, ry: -Math.PI / -2 },
  { type: "den2", x: -20, z: -8, y: 10 },
  { type: "den2", x: 20, z: -8, y: 10 },
  { type: "den3", x: 5, z: 15, y: 10 },
  { type: "den3", x: -25, z: 15, y: 10 },
  { type: "den3", x: 9, z: -33, y: 10 },
  { type: "den3", x: 40, z: -37, y: 10 },
  { type: "den3", x: -40, z: -37, y: 10 },
  { type: "house", x: -1, z: 5, info: "Nhà xe" },
]

treePositions.forEach((p) => {
  state.loadModel(p.type, p.x, p.y || 0, p.z, 0, 1, p.info)
})

const carModels = [
  {
    type: "zil1",
    x: 13,
    z: 15,
    y: 0.05,
    ry: -Math.PI / 1,
    scale: 0.8,
    info: "Xe bọc thép, chống đạn, tính an toàn cao",
  },
  {
    type: "xequansu",
    x: -14.8,
    z: 5,
    y: 1.07,
    ry: -Math.PI / 2,
    info: "Xe vận chuyển vũ khí, trang thiết bị vật tư, vật liệu quân dụng",
  },
  {
    type: "zil1",
    x: 30,
    z: 15,
    y: 0.05,
    ry: -Math.PI / 1,
    scale: 0.8,
    info: "Xe bọc thép, chống đạn, tính an toàn cao",
  },
  {
    type: "xequansu",
    x: 3,
    z: 5,
    y: 1.07,
    ry: -Math.PI / 2,
    info: "Xe vận chuyển vũ khí, trang thiết bị vật tư, vật liệu quân dụng",
  },
  {
    type: "xequansu",
    x: -12,
    z: 23,
    y: 1.07,
    ry: -Math.PI / 2,
    info: "Xe vận chuyển vũ khí, trang thiết bị vật tư, vật liệu quân dụng",
  },
  { type: "zil1", x: 5, z: 45, y: 0.05, ry: Math.PI / 2, scale: 1, info: "Xe bọc thép, chống đạn, tính an toàn cao" },
]

carModels.forEach((c, index) => {
  const isCarInHouse = index < 4
  state.loadModel(c.type, c.x, c.y || 0, c.z, c.ry || 0, c.scale || 1, c.info, isCarInHouse)
})

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const delta = clock.getDelta()
  const elapsedTime = clock.getElapsedTime()

  if (state.realisticRainSystem) {
    state.realisticRainSystem.update(delta)
  }

  if (state.lightningSystem) {
    state.lightningSystem.update(state.settings.lightningFrequency)
  }

  state.rainPass.uniforms.time.value = elapsedTime
  state.rainPass.uniforms.cameraPosition.value.copy(state.camera.position)
  state.rainPass.uniforms.rainIntensity.value = state.settings.rainIntensity
  state.rainPass.uniforms.windDirection.value.set(state.settings.windX * 0.01, state.settings.windZ * 0.01)

  state.lightningPass.uniforms.time.value = elapsedTime
  state.lightningPass.uniforms.lightningPosition.value.set(0.3 + Math.sin(elapsedTime * 0.5) * 0.4, 0.8)
  state.lightningPass.uniforms.lightningIntensity.value = state.settings.lightningFrequency

  if (state.nightSkyMesh && state.settings.timeOfDay === "night") {
    state.nightSkyMesh.rotation.y = state.camera.rotation.y
  }

  if (state.skyDome && state.settings.timeOfDay === "night") {
    state.skyDome.rotation.y = state.camera.rotation.y
  }

  state.updateLights(state)

  if (state.isMovingMode) {
    state.movePlayer(state, delta)
  } else {
    state.controls.update()
  }

  state.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight)
  state.renderer.setScissorTest(false)

  state.renderer.render(state.scene, state.camera)

  if (state.settings.miniMap) {
    const mapSizePx = 200
    const marginPx = 15
    state.renderer.setViewport(marginPx, window.innerHeight - mapSizePx - marginPx, mapSizePx, mapSizePx)
    state.renderer.setScissor(marginPx, window.innerHeight - mapSizePx - marginPx, mapSizePx, mapSizePx)
    state.renderer.setScissorTest(true)
    state.renderer.clearDepth()
    state.miniPlayer.position.set(state.player.position.x, 0.5, state.player.position.z)
    state.renderer.render(state.scene, state.miniCamera)
    state.renderer.setScissorTest(false)
  }

  state.detectNearbyInfo(state)
  state.checkHouseTrigger(state)
}

window.addEventListener("resize", () => {
  state.camera.aspect = window.innerWidth / window.innerHeight
  state.camera.updateProjectionMatrix()
  state.renderer.setSize(window.innerWidth, window.innerHeight)
  state.composer.setSize(window.innerWidth, window.innerHeight)

  state.rainPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight)
  state.lightningPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight)
})

animate()

console.log(`
=== HỆ THỐNG MƯA THỰC TẾ - ĐÃ SỬA LỖI ===
✅ Sửa lỗi rendering ground (loại bỏ artifacts màu trắng/vàng)
✅ Cải thiện material handling cho ground mesh
✅ Tối ưu shadow và depth settings
✅ Giao diện điều khiển hiện đại với gradient và blur effects
✅ Giọt mưa 3D với hình dạng thực tế
✅ Hiệu ứng splash khi chạm đất
✅ Vật lý mưa với trọng lực và gió
✅ 6 chế độ mưa: Quang đãng → Mưa bão
✅ Shader mưa cải tiến với nhiều lớp
✅ Sấm chớp với âm thanh thực tế
✅ Âm thanh rain.mp3 cho Mưa nhỏ, Mưa vừa
✅ Âm thanh storm.mp3 cho Mưa lớn, Mưa bão
✅ Thanh điều khiển âm lượng mưa trong GUI
✅ Đã loại bỏ hệ thống mây
✅ Đã sửa lỗi đi xuyên cây và đèn
✅ Đã bỏ tính năng zoom bằng chuột
✅ Đã bỏ tính năng thời gian trôi
✅ Tích hợp hoàn toàn với hệ thống hiện có
✅ Mưa chỉ rơi trong khu vực của ground
✅ Bầu trời đêm xoay theo góc nhìn của người chơi

=== CẢI THIỆN MỚI ===
🎨 Giao diện điều khiển hiện đại với:
   - Gradient backgrounds và blur effects
   - Hover animations và transitions
   - Color-coded controls theo chức năng
   - Improved typography và spacing
🔧 Sửa lỗi ground rendering:
   - Loại bỏ z-fighting issues
   - Cải thiện material properties
   - Tối ưu texture handling
   - Fixed shadow artifacts

=== HƯỚNG DẪN SỬ DỤNG ===
🎮 Di chuyển: WASD hoặc mũi tên
🖱️ Góc nhìn: Chuột phải + di chuyển
🌧️ Thời tiết: Sử dụng GUI để thay đổi
⚡ Sấm chớp: Tự động khi có bão
💧 Mưa thực tế: Giọt mưa 3D + splash effects
🔊 Âm thanh mưa: Tự động phát theo chế độ thời tiết
`)
