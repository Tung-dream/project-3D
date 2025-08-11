import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { PlayerSystem } from './src/modules/PlayerSystem.js';
import { GuiSystem } from './src/modules/GuiSystem.js';
import { ModelLoader } from './src/modules/ModelLoader.js';
import { InteractionSystem } from './src/modules/InteractionSystem.js';
import { RendererSystem } from './src/modules/RendererSystem.js';
import { CameraSystem } from './src/modules/CameraSystem.js';
import { SceneSystem } from './src/modules/SceneSystem.js';
import { ThunderAudio } from './src/audio/ThunderAudio.js';
import { RealisticRainShader } from './src/shaders/RealisticRainShader.js';
import { settings } from './src/config/settings.js';
import ControlsVR from './controlsVR.js';
import { Teleport } from './teleport.js';


// Khởi tạo Info Display System
let modelInfoDisplay;

//=== Code đã được chuyển sang các module ===
//ThunderAudio -> src/audio/ThunderAudio.js
//RealisticRainShader -> src/shaders/RealisticRainShader.js 
//RealisticRainSystem -> src/systems/RealisticRainSystem.js
//LightningShader -> src/shaders/LightningShader.js
//LightningSystem -> src/systems/LightningSystem.js

// === INITIALIZE CORE SYSTEMS ===
const scene = new SceneSystem();
const mainScene = scene.getScene();
Teleport.setupTeleport(mainScene);

// Setup viewer rig and camera
const viewerRig = new THREE.Group();
mainScene.add(viewerRig);

const cameraSystem = new CameraSystem();
const mainCamera = cameraSystem.getMainCamera();
viewerRig.add(mainCamera);

// Khởi tạo hệ thống hiển thị thông tin sau khi camera được tạo
modelInfoDisplay = new InfoDisplay(mainScene, mainCamera);

// Cleanup khi unload
window.addEventListener('unload', () => {
  if (modelInfoDisplay) {
    modelInfoDisplay.dispose();
  }
  scene.dispose();
  cameraSystem.dispose();
});

// Đặt vị trí ban đầu cho viewerRig
viewerRig.position.set(0, 0, 0);

function getActiveCamera(renderer, camera) {
  return renderer.xr.isPresenting ? renderer.xr.getCamera(camera) : camera;
}



// === INITIALIZE RENDERER ===
const rendererSystem = new RendererSystem();
const renderer = rendererSystem.renderer;

const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2');


console.log('Using WebGL Version:', gl instanceof WebGL2RenderingContext ? 'WebGL 2' : 'WebGL 1');

const vrHUD = document.createElement('div');
vrHUD.id = 'vrHud';
vrHUD.style.position = 'fixed';
vrHUD.style.top = '12px';
vrHUD.style.left = '12px';
vrHUD.style.padding = '8px 12px';
vrHUD.style.background = 'rgba(0,0,0,0.55)';
vrHUD.style.color = '#0ff';
vrHUD.style.font = '600 14px/1.2 system-ui, sans-serif';
vrHUD.style.letterSpacing = '0.5px';
vrHUD.style.border = '1px solid rgba(0,255,255,0.35)';
vrHUD.style.borderRadius = '8px';
vrHUD.style.backdropFilter = 'blur(4px)';
vrHUD.style.pointerEvents = 'none';
vrHUD.style.zIndex = '9999';
vrHUD.style.display = 'none'; // ẩn khi chưa VR
vrHUD.textContent = 'VR MODE';
document.body.appendChild(vrHUD);


// === POST-PROCESSING SETUP ===
let delta = 0;
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))

const rainPass = new ShaderPass(RealisticRainShader)
rainPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight)
composer.addPass(rainPass)

const lightningPass = new ShaderPass(LightningShader)
lightningPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight)
composer.addPass(lightningPass)


// === SKY SETUP ===
const pmremGenerator = new THREE.PMREMGenerator(renderer)
pmremGenerator.compileEquirectangularShader()

let dayTexture = null
let nightTexture = null
let sunTexture = null
let rainTexture = null
let noonTexture = null
// Xóa bỏ các biến skyDome và nightSkyMesh vì chúng không còn được sử dụng làm mesh
// let skyDome = null
// let nightSkyMesh = null 

// Load sunvip.hdr 
new RGBELoader().setPath("models1/").load(
  "sunvip.hdr",
  (texture) => {
    sunTexture = pmremGenerator.fromEquirectangular(texture).texture
    // Set as default background immediately
    scene.background = sunTexture
    scene.environment = sunTexture
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
    dayTexture = pmremGenerator.fromEquirectangular(texture).texture
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
    rainTexture = pmremGenerator.fromEquirectangular(texture).texture
    texture.dispose()
    console.log("Loaded troi-mua.hdr")
  },
  undefined,
  (err) => console.error("Error loading troi-mua.hdr:", err),
)

const loader = new GLTFLoader()
const draco = new DRACOLoader()
const ktx = new KTX2Loader()


// Load night5.hdr
new RGBELoader().setPath("models1/").load(
  "night5.hdr",
  (texture) => {
    nightTexture = pmremGenerator.fromEquirectangular(texture).texture
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
    noonTexture = pmremGenerator.fromEquirectangular(texture).texture
    texture.dispose()
    console.log("Loaded noon2.hdr")
  },
  undefined,
  (err) => console.error("Error loading noon2.hdr:", err),
)

// === INITIALIZE SYSTEMS ===
const controls = new OrbitControls(mainCamera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.rotateSpeed = 0.8;
controls.zoomSpeed = 1.0;
controls.panSpeed = 0.5;
controls.enablePan = true;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI / 2;
controls.minDistance = 5;
controls.maxDistance = 100;
controls.enableZoom = false;

// Initialize core systems
const modelLoader = new ModelLoader(mainScene);
const playerSystem = new PlayerSystem(mainScene, mainCamera, controls);
const interactionSystem = new InteractionSystem(mainScene, mainCamera, playerSystem.player, modelLoader);

// === WEATHER SYSTEMS ===
const realisticRainSystem = new RealisticRainSystem(mainScene);
const lightningSystem = new LightningSystem(mainScene);
const thunderAudio = new ThunderAudio();
const rainAudio = new THREE.Audio(new THREE.AudioListener());
const stormAudio = new THREE.Audio(new THREE.AudioListener());

// Load audio
const audioLoader = new THREE.AudioLoader();
audioLoader.load('/rain.mp3', (buffer) => {
  rainAudio.setBuffer(buffer);
  rainAudio.setLoop(true);
  rainAudio.setVolume(settings.stormVolume);
});

audioLoader.load('/storm.mp3', (buffer) => {
  stormAudio.setBuffer(buffer);
  stormAudio.setLoop(true);
  stormAudio.setVolume(settings.stormVolume);
});

// === Mini map camera ===
let miniMapSizeWorld = 50
const miniCamera = new THREE.OrthographicCamera(
  -miniMapSizeWorld,
  miniMapSizeWorld,
  miniMapSizeWorld,
  -miniMapSizeWorld,
  0.1,
  200,
)
miniCamera.position.set(0, 50, 0)
miniCamera.lookAt(0, 0, 0)
miniCamera.up.set(0, 0, -1)

// Ánh sáng môi trường và ánh trăng
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
scene.add(ambientLight)
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
dirLight.position.set(50, 100, 50)
dirLight.target.position.set(0, 0, 0)
scene.add(dirLight)
scene.add(dirLight.target)
dirLight.castShadow = true
dirLight.shadow.mapSize.width = 4096
dirLight.shadow.mapSize.height = 4096
dirLight.shadow.camera.near = 0.1
dirLight.shadow.camera.far = 300
dirLight.shadow.camera.left = -200
dirLight.shadow.camera.right = 200
dirLight.shadow.camera.top = 200
dirLight.shadow.camera.bottom = -200
dirLight.shadow.bias = -0.01

const moonLight = new THREE.DirectionalLight(0xadd8e6, 0.2)
moonLight.position.set(-10, 10, -10)
moonLight.target.position.set(0, 0, 0)
scene.add(moonLight)
scene.add(moonLight.target)
moonLight.castShadow = false

// === PLAYER SETUP ===
const player = new THREE.Mesh(
  new THREE.CylinderGeometry(0.3, 0.3, 1.75, 16),
  new THREE.MeshBasicMaterial({ color: "blue", transparent: true, opacity: 0 }),
)
player.position.set(0, 0.875, 0)
scene.add(player)

// === Player cho mini map ===
const miniPlayer = new THREE.Mesh(new THREE.SphereGeometry(2, 40, 40), new THREE.MeshBasicMaterial({ color: "cyan" }))
miniPlayer.position.copy(player.position)
scene.add(miniPlayer)

// === ENHANCED GUI SETTINGS ===
const settings = {
  miniMap: true,
  weather: "Quang đãng",
  rainIntensity: 0.0,
  windStrength: 0.1,
  lightningFrequency: 0.1,
  timeOfDay: "sun",
  stormMode: false,
  rainSpeed: 0.5,
  windX: 5,
  windZ: 2,
  stormVolume: 0.5,
  rainEnvironmentIntensity: 0.5,
  enableBulbLights: false,
}


const weatherOptions = {
  "Quang đãng": "clear",
  "Mưa vừa": "moderate_rain",
  "Mưa lớn": "heavy_rain",
  "Mưa bão": "storm_rain",
}

// === Mini map camera ===

// === IMPROVED GUI ===
const gui = new GUI({ title: "🌦️ Hệ thống thời tiết 3D", width: 320 });

// === MAIN CONTROLS FOLDER ===
const mainFolder = gui.addFolder("🎮 Điều khiển chính");
mainFolder.add(settings, "miniMap").name("📍 Hiện mini map");

mainFolder
  .add(settings, "timeOfDay", {
    "☀️ Buổi trưa": "sun",
    "🌅 Buổi sáng": "day",
    "🌅 Buổi chiều": "noon",
    "🌙 Buổi tối": "night",
    "🌧️ Trời sắp mưa": "rain",
  })
  .name("🌍 Chế độ môi trường")
  .onChange((value) => {
    settings.timeOfDay = value
    console.log("Changed timeOfDay to:", value)

    scene.traverse((child) => {
      if (child.userData && child.userData.light) {
        updateLightState(child.userData.light, child.userData.glow, value)
      }
    })

    if (value === "sun" && sunTexture) {
      scene.background = sunTexture
      scene.environment = sunTexture
      // if (skyDome) scene.remove(skyDome) // Đã xóa
      // if (nightSkyMesh) scene.remove(nightSkyMesh) // Đã xóa
      toggleBulbLights(false)

    } else if (value === "day" && dayTexture) {
      scene.background = dayTexture
      scene.environment = dayTexture
      // if (skyDome) scene.remove(skyDome) // Đã xóa
      // if (nightSkyMesh) scene.remove(nightSkyMesh) // Đã xóa
      toggleBulbLights(false)

    } else if (value === "noon" && noonTexture) {
      scene.background = noonTexture
      scene.environment = noonTexture
      // if (skyDome) scene.remove(skyDome) // Đã xóa
      // if (nightSkyMesh) scene.remove(nightSkyMesh) // Đã xóa
      toggleBulbLights(true)

    } else if (value === "night" && nightTexture) {
      scene.background = nightTexture
      scene.environment = nightTexture
      // if (skyDome) scene.remove(skyDome) // Đã xóa
      scene.fog = null
      toggleBulbLights(true)

    } else if (value === "rain" && rainTexture) {
      scene.background = rainTexture
      scene.environment = rainTexture
      scene.backgroundIntensity = 0.3
      scene.environmentIntensity = settings.rainEnvironmentIntensity
      // if (skyDome) scene.remove(skyDome) // Đã xóa
      // if (nightSkyMesh) scene.remove(nightSkyMesh) // Đã xóa
      toggleBulbLights(false)
    }

    updateLights();
  })
mainFolder.open()

// === WEATHER SYSTEM FOLDER ===
const weatherFolder = gui.addFolder("🌧️ Hệ thống thời tiết")
weatherFolder
  .add(settings, "weather", {
    "☀️ Quang đãng": "Quang đãng",
    "🌦️ Mưa vừa": "Mưa vừa",
    "🌧️ Mưa lớn": "Mưa lớn",
    "⛈️ Mưa bão": "Mưa bão",
  })
  .name("🌤️ Loại thời tiết")
  .onChange((label) => updateWeatherSystem(weatherOptions[label]))

weatherFolder.add(settings, "rainIntensity", 0.0, 1.0, 0.05).name("💧 Cường độ mưa").onChange(updateRainSettings)
weatherFolder.add(settings, "windStrength", 0.0, 3.0, 0.1).name("💨 Sức gió").onChange(updateRainSettings)
weatherFolder.add(settings, "lightningFrequency", 0.0, 1.0, 0.05).name("⚡ Tần suất sét")
weatherFolder.add(settings, "stormMode").name("🌪️ Chế độ bão")
weatherFolder
  .add(settings, "stormVolume", 0.0, 1.0, 0.05)
  .name("🔊 Âm lượng")
  .onChange((value) => {
    if (rainAudio) {
      rainAudio.setVolume(value)
    }
    if (stormAudio) {
      stormAudio.setVolume(value)
    }
  })
weatherFolder.open()

// === ADVANCED SETTINGS FOLDER ===
const advancedFolder = gui.addFolder("⚙️ Cài đặt nâng cao")
advancedFolder.add(settings, "rainSpeed", 0.1, 3.0, 0.1).name("⬇️ Tốc độ rơi")
advancedFolder.add(settings, "windX", -15, 15, 0.5).name("↔️ Gió ngang").onChange(updateRainSettings)
advancedFolder.add(settings, "windZ", -15, 15, 0.5).name("↕️ Gió xiên").onChange(updateRainSettings)
advancedFolder.add(settings, "enableBulbLights").name("💡 Bật đèn bulb")
  .onChange(() => {
    toggleBulbLights();
  });
// === ENHANCED WEATHER SYSTEM ===
function updateWeatherSystem(weatherType) {
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

  updateRainSettings()
  updateShaderUniforms()
}

function updateRainSettings() {
  if (realisticRainSystem) {
    realisticRainSystem.generateRain(settings.rainIntensity, settings.windX * 0.1, settings.windZ * 0.1)
    realisticRainSystem.setWindForce(settings.windX * 0.1, settings.windZ * 0.1)
    realisticRainSystem.setIntensity(settings.rainIntensity)
  }
}

function updateShaderUniforms() {
  rainPass.uniforms.rainIntensity.value = settings.rainIntensity
  rainPass.uniforms.windDirection.value.set(settings.windX * 0.01, settings.windZ * 0.01)
  lightningPass.uniforms.lightningIntensity.value = settings.lightningFrequency
}

// === MOUSE LOOK CONTROL ===
let yaw = 0,
  pitch = 0
let isRightMouseDown = false
let lastMouseX = 0
let lastMouseY = 0

renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault())
renderer.domElement.addEventListener("mousedown", (e) => {
  if (e.button === 2) {
    isRightMouseDown = true
    lastMouseX = e.clientX
    lastMouseY = e.clientY
  }
})
renderer.domElement.addEventListener("mouseup", (e) => {
  if (e.button === 2) isRightMouseDown = false
})

document.addEventListener("mousemove", (e) => {
  if (!isMovingMode || !isRightMouseDown) return
  const sensitivity = 0.003
  const movementX = e.clientX - lastMouseX
  const movementY = e.clientY - lastMouseY
  lastMouseX = e.clientX
  lastMouseY = e.clientY
  yaw -= movementX * sensitivity
  pitch -= movementY * sensitivity
  pitch = Math.max(0, Math.min(Math.PI / 2, pitch))
  camera.rotation.set(pitch, yaw, 0, "YXZ")
})

// === LIGHTS ===
const hemiLight = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.4)
scene.add(hemiLight)

function updateLights() {
  if (settings.timeOfDay === "day" || settings.timeOfDay === "sun" || settings.timeOfDay === "noon") {
    // Chế độ ban ngày: có đổ bóng
    dirLight.intensity = 1.5;
    // Giảm cường độ ánh sáng môi trường để bóng đổ tối hơn
    ambientLight.intensity = 0.1;
    hemiLight.intensity = 0.6;
    dirLight.color.setHSL(0.12, 0.8, 0.7);
    moonLight.intensity = 0;
    dirLight.castShadow = false;
    moonLight.castShadow = false;
    toggleBulbLights(false);
  } else if (settings.timeOfDay === "night") {
    // Chế độ ban đêm: tắt đổ bóng
    dirLight.intensity = 0.01;
    ambientLight.intensity = 0.02;
    hemiLight.intensity = 0.1;
    dirLight.color.setHSL(0.6, 0.3, 0.2);
    moonLight.intensity = 0.1;
    moonLight.color.setHSL(0.55, 0.5, 0.8);
    dirLight.castShadow = false;
    moonLight.castShadow = false;
    toggleBulbLights(true);
  } else {
    // Các chế độ khác
    dirLight.intensity = 0.01;
    ambientLight.intensity = 0.02;
    hemiLight.intensity = 0.05;
    dirLight.color.setHSL(0.6, 0.3, 0.2);
    moonLight.intensity = 0.3;
    moonLight.color.setHSL(0.55, 0.5, 0.8);
    dirLight.castShadow = false;
    moonLight.castShadow = false;
    toggleBulbLights(false);
  }
}

// === LOADER & MODEL CACHE ===
const interactiveObjects = []
const obstacles = []
const carLights = []
const carModelsLoaded = []
let houseModel = null
const pointLights = []
const collisionCubes = []
const bulbPositions = []
const dnLights = []
let groundBoundingBox = null
let groundMesh = null; // Khai báo biến groundMesh ở đây
let isVRInitialized = false; // Đã sửa: Thêm biến trạng thái VR

function loadModel(type, x, y = 0, z, ry = 0, scale = 1, info = null, isCarInHouse = false) {
  loader.load(
    `/models1/${type}.glb`,
    (gltf) => {
      const model = gltf.scene
      model.position.set(x, y, z)
      model.rotation.y = ry
      model.scale.set(scale, scale, scale)

      if (info) {
        model.userData.info = info
        model.userData.isCarInHouse = isCarInHouse
        interactiveObjects.push(model)
      }

      if (type === "house") {
        houseModel = model
        model.userData.type = "house"


        // Fix rendering issues cho house
        setTimeout(() => {
          fixHouseRenderingIssues(houseModel)
        }, 100)

        const frontOffset = 5
        const houseDirection = new THREE.Vector3(0, 0, 1)
        houseDirection.applyQuaternion(houseModel.quaternion)
        const frontPosition = houseModel.position.clone().add(houseDirection.multiplyScalar(frontOffset))
        miniPlayer.position.set(frontPosition.x, 0.5, frontPosition.z)
      }

      model.traverse((child) => {
        if (!child.isMesh) return


        // ✅ CHUYỂN MATERIAL NẶNG → NHẸ
  if (child.material && child.material.isMeshPhysicalMaterial) {
    child.material = new THREE.MeshStandardMaterial({
      map: child.material.map || null,
      normalMap: child.material.normalMap || null,
      roughnessMap: child.material.roughnessMap || null,

    });
    child.material.needsUpdate = true;
  }
        child.castShadow = true
        child.receiveShadow = true
        child.userData.type = type

    
        // ✅ Thêm ánh sáng nếu tên là dn1 → dn6
// ✅ Thêm ánh sáng nếu tên là dn1 → dn6
if (/^dn[1-6]$/i.test(child.name)) {
  console.log("Found light source:", child.name);

  const spotLight = new THREE.SpotLight(0xffeeaa, 100.0, 15, Math.PI / 4, 0.7);
  spotLight.position.copy(child.getWorldPosition(new THREE.Vector3()));
  spotLight.position.y += 0.09;
  spotLight.target.position.copy(child.getWorldPosition(new THREE.Vector3()));
  spotLight.target.position.y -= 2.0;
  scene.add(spotLight);
  scene.add(spotLight.target);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffcc88, transparent: true, opacity: 0.8 })
  );
  glow.position.copy(spotLight.position);
  glow.position.y -= 0.1;
  scene.add(glow);

dnLights.push({ light: spotLight, glow: glow });


  // ✅ Thêm ngay sau khi đèn đã được gán
  toggleBulbLights();
}

        // Xử lý đặc biệt cho house model để fix z-fighting
        if (type === "house") {
          if (child.material) {
            // Clone material để tránh ảnh hưởng đến các object khác
            child.material = child.material.clone()

            // Fix z-fighting và backface culling issues
            child.material.side = THREE.FrontSide
            child.material.depthWrite = true
            child.material.depthTest = true
            child.material.transparent = false
            child.material.alphaTest = 0

            // Tăng độ chính xác depth
            if (child.material.map) {
              child.material.map.generateMipmaps = true
              child.material.map.minFilter = THREE.LinearMipmapLinearFilter
              child.material.map.magFilter = THREE.LinearFilter
            }

            // Đảm bảo material được update
            child.material.needsUpdate = true

            // Thêm một chút offset cho geometry để tránh z-fighting
            if (child.geometry) {
              child.geometry.computeBoundingBox()
              const box = child.geometry.boundingBox
              if (box) {
                // Dịch chuyển nhẹ geometry theo normal để tránh overlap
                const positions = child.geometry.attributes.position
                const normals = child.geometry.attributes.normal

                if (positions && normals) {
                  for (let i = 0; i < positions.count; i++) {
                    const nx = normals.getX(i)
                    const ny = normals.getY(i)
                    const nz = normals.getZ(i)

                    // Offset nhỏ theo hướng normal
                    const offset = 0.001
                    positions.setX(i, positions.getX(i) + nx * offset)
                    positions.setY(i, positions.getY(i) + ny * offset)
                    positions.setZ(i, positions.getZ(i) + nz * offset)
                  }
                  positions.needsUpdate = true
                }
              }
            }
          }

          // Đảm bảo house không bị coi là obstacle để tránh collision issues
          // (sẽ được xử lý riêng ở phần collision detection)
        } else {
          // Xử lý bình thường cho các model khác
          if (type !== "tree3" && type !== "tree2" && type !== "den1" && type !== "den2" && type !== "den3") {
            obstacles.push(child)
          }
        } 

        if (type === "den1" || type === "den2" || type === "den3") {
          child.userData.isLightSource = true
          child.userData.light = null
        }
      })

      // Thêm cube riêng cho từng loại tree và den
      if (type === "tree3" || type === "tree2" || type === "den1" || type === "den2" || type === "den3") {
        const boundingBox = new THREE.Box3().setFromObject(model)
        const center = new THREE.Vector3()
        boundingBox.getCenter(center)
        const size = new THREE.Vector3()
        boundingBox.getSize(size)

        let trunkBox
        switch (type) {
          case "tree3":
            trunkBox = new THREE.Mesh(
              new THREE.BoxGeometry(1.0, 2.0, 1.0), // Kích thước cube cho tree3
              new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }), // Debug
            )
            trunkBox.position.copy(center)
            trunkBox.position.y -= (size.y - 2.0) / 2 // Điều chỉnh vị trí
            break

          case "tree2":
            trunkBox = new THREE.Mesh(
              new THREE.BoxGeometry(0.8, 5.5, 0.8), // Kích thước cube cho tree2
              new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }), // Debug
            )
            trunkBox.position.copy(center)
            trunkBox.position.y -= (size.y - 1.5) / 2
            trunkBox.position.z -= 1.5 // lùi cube va chạm về sau
            trunkBox.position.x -= 0.25 // sang trái / phải
            break

          case "den1":
            trunkBox = new THREE.Mesh(
              new THREE.BoxGeometry(0.6, 3.0, 0.6), // Kích thước cube cho den1
              new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }), // Debug
            )
            trunkBox.position.copy(center)
            trunkBox.position.y -= (size.y - 3.0) / 2
            trunkBox.position.x -= 1.4
            break

          case "den2":
            trunkBox = new THREE.Mesh(
              new THREE.BoxGeometry(0.5, 2.5, 0.5), // Kích thước cube cho den2
              new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }), // Debug
            )
            trunkBox.position.copy(center)
            trunkBox.position.y -= (size.y - 2.5) / 2
            trunkBox.position.x -= 1.5
            break

          case "den3":
            trunkBox = new THREE.Mesh(
              new THREE.BoxGeometry(0.5, 3.5, 0.5), // Kích thước cube cho den2
              new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }), // Debug
            )
            trunkBox.position.copy(center)
            trunkBox.position.y -= (size.y - 2.5) / 2
            break
        }

        if (trunkBox) {
          trunkBox.userData.type = `${type}Trunk`
          collisionCubes.push(trunkBox) // Lưu cube vào mảng riêng
          scene.add(trunkBox)
        }
      }

      if (type === "zil1" || type === "xequansu") {
        model.userData.boundingBox = new THREE.Box3().setFromObject(model)
        carModelsLoaded.push(model)
      }
      scene.add(model);
          if (["den1", "den2", "den3"].includes(type)) {
      toggleBulbLights();
          }
    },
    undefined,
    (err) => console.error(`❌ Lỗi load ${type}.glb`, err),
  )
}

// Thêm vào sau phần khai báo biến global
const bulbLights = []; // Mảng lưu trữ các đèn bulb
const bulbGlowMeshes = []; // Mảng lưu trữ hiệu ứng phát sáng của bulb

// === Hàm tạo ánh sáng tại vị trí bulb ===
function createBulbLight(bulbObject, parentModel) {
  // Lấy vị trí world của bulb
  const worldPosition = new THREE.Vector3();
  bulbObject.getWorldPosition(worldPosition);
  
  // Tạo PointLight
  const bulbLight = new THREE.PointLight(0xfff4e6, 0, 12, 2); // Màu vàng ấm, intensity=0 ban đầu
  bulbLight.position.copy(worldPosition);
  bulbLight.castShadow = true;
  bulbLight.shadow.mapSize.width = 512; // Giảm xuống để tiết kiệm tài nguyên
  bulbLight.shadow.mapSize.height = 512;
  bulbLight.shadow.camera.near = 0.1;
  bulbLight.shadow.camera.far = 12;
  bulbLight.shadow.bias = -0.001;
  bulbLight.userData.isBulbLight = true;
  
  scene.add(bulbLight);
  
  // Tạo hiệu ứng phát sáng cho bulb
  const glowGeometry = new THREE.SphereGeometry(0.15, 8, 6); // Giảm segments để tối ưu
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff4e6,
    transparent: true,
    opacity: 0.8,
    fog: false
  });
  
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  glowMesh.position.copy(worldPosition);
  glowMesh.userData.isBulbGlow = true;
  scene.add(glowMesh);
  
  // Lưu vào mảng
  bulbLights.push({
    light: bulbLight,
    glow: glowMesh,
    bulbObject: bulbObject,
    parentModel: parentModel
  });
  
  console.log(`Created bulb light at position: ${worldPosition.x.toFixed(2)}, ${worldPosition.y.toFixed(2)}, ${worldPosition.z.toFixed(2)}`);
}

// === Hàm tìm và tạo đèn cho tất cả bulb objects ===
function initializeBulbLights() {
  scene.traverse((object) => {
    // Tìm các object có tên bắt đầu bằng "dn" (dn1, dn2, dn3, dn4, dn5, dn6)
    if (object.name && object.name.match(/^dn[1-6]$/)) {
      console.log(`Found bulb object: ${object.name}`);
      
      // Tìm parent model (den1, den2, hoặc den3)
      let parentModel = object;
      while (parentModel.parent && !parentModel.userData.type) {
        parentModel = parentModel.parent;
      }
      
      createBulbLight(object, parentModel);
    }
  });
  
  console.log(`Initialized ${bulbLights.length} bulb lights`);
}

function toggleBulbLights() {
  const intensity = settings.enableBulbLights ? 150.0 : 0;
  const glowOpacity = settings.enableBulbLights ? 1.0 : 0;

  for (const obj of dnLights) {
    obj.light.intensity = intensity;
    obj.glow.material.opacity = glowOpacity;
    obj.glow.visible = glowOpacity > 0;
  }
}

// === LOAD GROUND ===
loader.load(
  "/models1/ground.glb",
  (gltf) => {
    const ground = gltf.scene
    scene.add(ground);
   ground.traverse((o) => {
  if (o.isMesh && o.material) {
    const m = o.material;
    if ('metalness' in m) m.metalness = 0.0;                 // đất không kim loại
    if ('roughness' in m)  m.roughness = Math.min(1, (m.roughness ?? 0.5) + 0.35); // tăng nhám
    if ('envMapIntensity' in m) m.envMapIntensity = Math.min(0.3, (m.envMapIntensity ?? 1)); // giảm phản xạ HDRI
    if (m.color) m.color.multiplyScalar(0.92);               // hạ nhẹ độ sáng albedo
    if (m.map) m.map.encoding = THREE.sRGBEncoding;          // đảm bảo gamma đúng
    if (m.normalScale) m.normalScale.multiplyScalar(0.85);   // nếu normal gắt quá
    m.needsUpdate = true;
  }
});

    groundMesh = ground; 
    groundBoundingBox = new THREE.Box3().setFromObject(ground)
    const size = new THREE.Vector3()
    groundBoundingBox.getSize(size)
    miniMapSizeWorld = Math.max(size.x, size.z) / 2
    miniCamera.left = -miniMapSizeWorld
    miniCamera.right = miniMapSizeWorld
    miniCamera.top = miniMapSizeWorld
    miniCamera.bottom = -miniMapSizeWorld
    miniCamera.updateProjectionMatrix()
    const center = new THREE.Vector3()
    groundBoundingBox.getCenter(center)
    miniCamera.position.x = center.x
    miniCamera.position.z = center.z
    miniCamera.lookAt(center.x, 0, center.z)

    initWeatherSystems()
  },
  undefined,
  (err) => console.error("❌ Lỗi ground", err),
)

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
  loadModel(p.type, p.x, p.y || 0, p.z, 0, 1, p.info)
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
  loadModel(c.type, c.x, c.y || 0, c.z, c.ry || 0, c.scale || 1, c.info, isCarInHouse)
})

function fixHouseRenderingIssues(houseModel) {
  if (!houseModel) return;

  houseModel.traverse((child) => {
    if (child.isMesh && child.material) {
      // Dòng code này sẽ bật đổ bóng cho mô hình con
      child.castShadow = true;
      // Dòng code này sẽ cho phép mô hình con nhận bóng
      child.receiveShadow = true;

      child.material.side = THREE.FrontSide;
      child.material.depthWrite = true;
      child.material.depthTest = true;
      child.material.transparent = false;
      child.material.color.multiplyScalar(0.3);   // Điều chỉnh ánh sáng ngôi nhà

      if (child.material.map) {
        child.material.map.flipY = false;
        child.material.map.needsUpdate = true;
      }

      child.material.needsUpdate = true;

      if (child.geometry) {
        child.geometry.computeVertexNormals();
        child.geometry.computeBoundingBox();
        child.geometry.computeBoundingSphere();
      }
    }
  });

  houseModel.updateMatrixWorld(true);
}

// === WEATHER SYSTEMS INITIALIZATION ===
function initWeatherSystems() {
  realisticRainSystem = new RealisticRainSystem(scene)
  lightningSystem = new LightningSystem(scene, camera)
  thunderAudio = new ThunderAudio()
  lightningSystem.thunderAudio = thunderAudio // Gán thunderAudio sau khi khởi tạo

  const audioLoader = new THREE.AudioLoader()
  const listener = new THREE.AudioListener()
  camera.add(listener)

  rainAudio = new THREE.Audio(listener)
  audioLoader.load(
    "/rain.mp3",
    (buffer) => {
      rainAudio.setBuffer(buffer)
      rainAudio.setLoop(true)
      rainAudio.setVolume(settings.stormVolume)
      console.log("Loaded rain.mp3")
    },
    undefined,
    (err) => console.error("Error loading rain.mp3:", err),
  )

  stormAudio = new THREE.Audio(listener)
  audioLoader.load(
    "/storm.mp3",
    (buffer) => {
      stormAudio.setBuffer(buffer)
      stormAudio.setLoop(true)
      stormAudio.setVolume(settings.stormVolume)
      console.log("Loaded storm.mp3")
    },
    undefined,
    (err) => console.error("Error loading storm.mp3:", err),
  )

  updateWeatherSystem("clear")

  console.log("✅ Realistic Rain System initialized")
}


let vrIsOn = false;

window.addEventListener('vr-present', (e) => {
  vrIsOn = !!e.detail?.on;
  vrHUD.style.display = vrIsOn ? 'block' : 'none';
  vrHUD.textContent = vrIsOn ? 'VR MODE' : '';
  // Tuỳ chọn: đổi màu khi on
  if (vrIsOn) {
    vrHUD.style.color = '#0ff';
    vrHUD.style.borderColor = 'rgba(0,255,255,0.35)';
  }
});

window.addEventListener('vr-move', (e) => {
  if (!vrIsOn) return;
  const moving = !!e.detail?.moving;
  vrHUD.textContent = moving ? 'VR MODE — Moving' : 'VR MODE — Idle';
  // Nháy nhẹ khi moving
  vrHUD.style.color = moving ? '#ff0' : '#0ff';
  vrHUD.style.borderColor = moving ? 'rgba(255,255,0,0.35)' : 'rgba(0,255,255,0.35)';
});


// === KEYBOARD MOVE ===
const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  // Chỉ bật isMovingMode nếu không ở trong VR
  if (!renderer.xr.isPresenting) {
    isMovingMode = true;
    controls.enabled = false; // Vô hiệu hóa OrbitControls khi di chuyển bằng bàn phím
  }
});

window.addEventListener("keyup", (e) => (keys[e.key] = false));
// const playerHeight = 1.75; // Đã khai báo ở đầu tệp
const playerRadius = 0.5;

const raycaster = new THREE.Raycaster();

function movePlayer(delta) {
  // Đã sửa: Chỉ di chuyển bằng bàn phím khi không ở chế độ VR
  if (renderer.xr.isPresenting) return; 
  const speed = 8;
  const moveVector = new THREE.Vector3();

  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);
  const rightVector = new THREE.Vector3();
  rightVector.crossVectors(cameraDirection, camera.up).normalize();
  const forwardVector = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();

  if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
    moveVector.add(forwardVector);
  }
  if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
    moveVector.sub(forwardVector);
  }
  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
    moveVector.sub(rightVector);
  }
  if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
    moveVector.add(rightVector);
  }

  // isMovingMode = true; // Đã được đặt trong keydown
  // controls.enabled = false; // Đã được đặt trong keydown

  if (moveVector.lengthSq() > 0) {
    moveVector.normalize();
    const movement = moveVector.multiplyScalar(speed * delta);
    const newPosition = player.position.clone().add(movement);

    const playerRaycastOrigin = player.position.clone();
    playerRaycastOrigin.y += 0.5;
    let canMove = true;
    const normalizedMovement = movement.clone().normalize();

   // Kiểm tra va chạm với obstacles hiện tại
    if (checkCollision(playerRaycastOrigin, normalizedMovement, 1.5)) {
      canMove = false;
    }

    // Kiểm tra va chạm với house
    if (houseModel) {
      const houseBox = new THREE.Box3().setFromObject(houseModel);
      if (houseBox.containsPoint(newPosition) || houseBox.intersectsSphere(new THREE.Sphere(newPosition, playerRadius))) {
        canMove = false;
      }
    }

    // Kiểm tra va chạm với collisionCubes
    for (const cube of collisionCubes) {
      const cubeBox = new THREE.Box3().setFromObject(cube);
      if (cubeBox.intersectsSphere(new THREE.Sphere(newPosition, playerRadius))) {
        canMove = false;
        break; // Dừng nếu va chạm
      }
    }

    raycaster.set(new THREE.Vector3(newPosition.x, player.position.y + 10, newPosition.z), new THREE.Vector3(0, -1, 0));
    const groundIntersects = raycaster.intersectObjects(obstacles, true);

    if (canMove) {
      if (groundIntersects.length > 0) {
        const groundPoint = groundIntersects[0].point;
        const distanceToGround = newPosition.y - groundPoint.y;
        if (Math.abs(distanceToGround) < 5 && newPosition.y > groundPoint.y - 0.1) {
          newPosition.y = groundPoint.y + playerRadius;
          player.position.copy(newPosition);
          miniPlayer.position.copy(player.position);
          // Đồng bộ vị trí camera với player (trong chế độ non-VR)
          camera.position.x = player.position.x;
          camera.position.y = player.position.y + (1.75 - playerRadius);
          camera.position.z = player.position.z;
        }
      }
    }
  }
}

function checkCollision(position, direction, distance = 1.5) {
  raycaster.set(position, direction);
  const intersects = raycaster.intersectObjects(obstacles, true);

  if (intersects.length > 0) {
    return intersects[0].distance < distance;
  }
  return false;
}


// === Hàm xử lý khi di chuyển lên phía trước ngôi nhà thì mới hiện thông tin 

   function isPlayerInFrontOfHouse() {
  if (!houseModel) return false
  const houseDirection = new THREE.Vector3(0, 0, 1)
  houseDirection.applyQuaternion(houseModel.quaternion)
  const toPlayer = new THREE.Vector3().subVectors(player.position, houseModel.position).normalize()
  const dot = houseDirection.dot(toPlayer)
  return dot > 0.5
}


// === INTERACTION ===
const raycasterInteraction = new THREE.Raycaster()
const mouse = new THREE.Vector2()
// Khởi tạo hệ thống hiển thị thông tin
modelInfoDisplay = new InfoDisplay(scene, camera);


const clock = new THREE.Clock();

// Main update loop
function updateFrame() {
  const delta = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // Update all systems
  playerSystem.update(delta);
  interactionSystem.update(renderer);
  realisticRainSystem.update(delta);
  lightningSystem.update(elapsedTime);

  // Update VR if active
  if (renderer.xr.isPresenting) {
    ControlsVR.handleVRControllerInput(
      viewerRig, mainCamera, renderer,
      modelLoader.groundMesh, 
      modelLoader.obstacles,
      modelLoader.collisionCubes,
      modelLoader.houseModel,
      playerSystem.player,
      delta
    );
  } else {
    // Desktop mode
    if (isMovingMode) {
      movePlayer(delta);
    } else {
      controls.update();
    }
    // Sync viewer rig with player
    viewerRig.position.copy(playerSystem.player.position);
    viewerRig.position.y = 0;
  }

  // Update rendering
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissorTest(false);

  // Update info display
  if (modelInfoDisplay) {
    const isVR = renderer.xr.isPresenting;
    const objects = mainScene.children.filter(obj => obj.userData && obj.userData.info);
    modelInfoDisplay.update(isVR, objects);
  }

  // Render main scene
  renderer.render(mainScene, mainCamera);

  // Render minimap if enabled
  if (settings.miniMap) {
    const mapSizePx = 200;
    const marginPx = 15;
    renderer.setViewport(marginPx, window.innerHeight - mapSizePx - marginPx, mapSizePx, mapSizePx);
    renderer.setScissor(marginPx, window.innerHeight - mapSizePx - marginPx, mapSizePx, mapSizePx);
    renderer.setScissorTest(true);
    renderer.clearDepth();
    
    // Update minimap player position
    miniPlayer.position.copy(playerSystem.player.position);
    miniPlayer.position.y = 0.5;
    
    // Render minimap
    renderer.render(mainScene, cameraSystem.getMiniMapCamera());
    renderer.setScissorTest(false);
  }

  // Update interaction checks
  checkHouseTrigger();
  detectNearbyInfo();
}


function detectNearbyInfo() {
  // Sử dụng modelInfoDisplay để xử lý hiển thị thông tin
  if (modelInfoDisplay) {
    const isVR = renderer.xr.isPresenting;
    const isInFrontOfHouse = isPlayerInFrontOfHouse();

    // Lọc các object cần hiển thị thông tin
    let visibleObjects = [];
    
    for (const model of interactiveObjects) {
      if (!model.userData.info) continue;
      if ((model.userData.isCarInHouse || model.userData.type === "house") && !isInFrontOfHouse) continue;
      
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const distance = camera.position.distanceTo(center);
      
      if (distance < 18) {
        visibleObjects.push(model);
      }
    }
    
    // Cập nhật hiển thị thông tin
    modelInfoDisplay.update(isVR, visibleObjects);
  }
}

function showInfoLabel(info, position) {
  if (modelInfoDisplay) {
    const dummyObject = new THREE.Object3D();
    dummyObject.position.copy(position);
    dummyObject.userData.info = info;
    modelInfoDisplay.update(renderer.xr.isPresenting, [dummyObject]);
    
    // Tự động ẩn sau 3 giây
    setTimeout(() => {
      modelInfoDisplay.update(renderer.xr.isPresenting, []);
    }, 3000);
  }
}

function hideTriggerInfoLabel() {
  if (modelInfoDisplay) {
    modelInfoDisplay.update(renderer.xr.isPresenting, []); // Truyền mảng rỗng để ẩn tất cả
  }
}

function checkHouseTrigger() {
  const isInFrontOfHouse = isPlayerInFrontOfHouse()
  if (!houseModel) return

  if (isInFrontOfHouse) {
    for (const car of carModelsLoaded) {
      if (car.userData.isCarInHouse) {
        const dist = player.position.distanceTo(car.position)
        if (dist < 3) {
          showInfoLabel(car.userData.info, car.position)
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
      showInfoLabel(model.userData.info, model.position)
      return
    }
  }

  hideTriggerInfoLabel()
}

// Khởi tạo VR
function initVR() {
  if (isVRInitialized) return;

  renderer.xr.enabled = true;
  renderer.xr.setFoveation(2); // Tiết kiệm GPU trên Quest 3
  document.body.appendChild(VRButton.createButton(renderer));
  ControlsVR.setupControlsVR(viewerRig, renderer, camera);
  ControlsVR.setLocomotionMode('hybrid');


renderer.xr.addEventListener('sessionstart', () => {
  isVRInitialized = true;
  ControlsVR.setupControlsVR(viewerRig, renderer, camera);
  ControlsVR.setLocomotionMode('hybrid');

  // Thêm hàm đồng bộ camera
  function syncCameraWithVR() {
    const xrCamera = renderer.xr.getCamera(camera);
    // Cập nhật camera chính theo camera VR
    camera.position.copy(xrCamera.position);
    camera.quaternion.copy(xrCamera.quaternion);
    camera.updateProjectionMatrix();
  }

  // Thêm callback vào animation loop để đồng bộ camera
  const vrAnimationLoop = (timestamp, frame) => {
    if (frame) {
      syncCameraWithVR();
    }
    // Tiếp tục render scene
    if (renderer.xr.isPresenting) {
      updateFrame();  // Gọi hàm update/render chính
    }
  };
  
  renderer.setAnimationLoop(vrAnimationLoop);
});

renderer.xr.addEventListener('sessionend', () => {
  ControlsVR.resetControllerState();
  isVRInitialized = false;
  // Khôi phục render loop bình thường
  renderer.setAnimationLoop(null);  // Tắt XR animation loop
  updateFrame();  // Khởi động lại render loop thông thường
});


  // Gọi setupControlsVR ở đây
  ControlsVR.setupControlsVR(viewerRig, renderer, camera);
  ControlsVR.setLocomotionMode('hybrid');
  isVRInitialized = true;
}


// Gọi initVR trong quá trình khởi tạo
initVR();

window.addEventListener("resize", () => {
  // Update camera aspect ratio
  mainCamera.aspect = window.innerWidth / window.innerHeight;
  mainCamera.updateProjectionMatrix();

  // Update renderer size
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Update post-processing
  if (composer) {
    composer.setSize(window.innerWidth, window.innerHeight);
  }

  // Update shader uniforms
  if (rainPass) {
    rainPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  }
  if (lightningPass) {
    lightningPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  }
});

// Start animation loop
renderer.setAnimationLoop(updateFrame);

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

`)
