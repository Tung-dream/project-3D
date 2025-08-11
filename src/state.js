import * as THREE from "three"
// Đã xóa import 'keys' ở đây vì nó sẽ được quản lý nội bộ trong player-movement.js
import { infoDisplay } from "./utils/interaction.js"
import { settings } from "./config/gui-settings.js"
import { updateLights, toggleBulbLights } from "./utils/lights.js"
import {
  updateWeatherSystem,
  updateRainSettings,
  updateShaderUniforms,
  handleTimeOfDayChange,
  initWeatherSystems,
} from "./utils/weather-utils.js"
import { loadModel, fixHouseRenderingIssues } from "./utils/model-loader.js"
import { movePlayer } from "./utils/player-movement.js" // Import movePlayer và setupPlayerMovementListeners
import {
  detectNearbyInfo,
  checkHouseTrigger,
  isPlayerInFrontOfHouse,
  showInfoLabel,
  hideTriggerInfoLabel,
} from "./utils/interaction.js"

export const state = {
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200),
  renderer: null,
  composer: null,
  rainPass: null,
  lightningPass: null,
  pmremGenerator: null,

  dayTexture: null,
  nightTexture: null,
  sunTexture: null,
  rainTexture: null,
  noonTexture: null,
  skyDome: null,
  nightSkyMesh: null,

  controls: null,
  miniMapSizeWorld: 50,
  miniCamera: null,
  ambientLight: null,
  dirLight: null,
  moonLight: null,
  hemiLight: null,

  player: null,
  miniPlayer: null,

   keys: {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false
  },

  // Weather systems
  realisticRainSystem: null,
  lightningSystem: null,
  thunderAudio: null,
  rainAudio: null,
  stormAudio: null,

  // Model related global state
  interactiveObjects: [],
  obstacles: [],
  carLights: [],
  carModelsLoaded: [],
  houseModel: null,
  pointLights: [],
  collisionCubes: [],
  dnLights: [], // For the actual bulb lights
  groundBoundingBox: null,

  // Player movement and interaction state
  isMovingMode: false,
  // Đã xóa 'keys: keys,' khỏi đây
  yaw: 0,
  pitch: 0,
  isRightMouseDown: false,
  lastMouseX: 0,
  lastMouseY: 0,
  infoDisplay: infoDisplay, // Reference from interaction.js

  settings: settings, // from config/gui-settings.js

  // Helper functions that need state access (these will be assigned in main.js after state is fully defined)
  toggleBulbLights: (s, force) => toggleBulbLights(s, force),
  updateLights: (s) => updateLights(s),
  updateWeatherSystem: (s, type) => updateWeatherSystem(s, type),
  updateRainSettings: (s) => updateRainSettings(s),
  updateShaderUniforms: (s) => updateShaderUniforms(s),
  handleTimeOfDayChange: (s, val) => handleTimeOfDayChange(s, val),
  initWeatherSystems: (s) => initWeatherSystems(s),
  // initializeModelLoaders không còn là thuộc tính của state, nó được gọi trực tiếp từ main.js
  loadModel: (type, x, y, z, ry, scale, info, isCarInHouse) =>
    loadModel(type, x, y, z, ry, scale, info, isCarInHouse, state),
  fixHouseRenderingIssues: (model) => fixHouseRenderingIssues(model),
  movePlayer: (s, delta) => movePlayer(s, delta),
  detectNearbyInfo: (s) => detectNearbyInfo(s),
  checkHouseTrigger: (s) => checkHouseTrigger(s),
  isPlayerInFrontOfHouse: (s) => isPlayerInFrontOfHouse(s),
  showInfoLabel: (info, pos, s) => showInfoLabel(info, pos, s),
  hideTriggerInfoLabel: hideTriggerInfoLabel,
}
