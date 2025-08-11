import GUI from 'lil-gui';
import { settings, weatherOptions } from '../config/settings.js';

export class GuiSystem {
  constructor(scene, weatherSystem, lightSystem) {
    this.scene = scene;
    this.weatherSystem = weatherSystem;
    this.lightSystem = lightSystem;
    this.gui = new GUI({ title: "🌦️ Hệ thống thời tiết 3D", width: 320 });
    this.initGui();
  }

  initGui() {
    // Main Controls Folder
    const mainFolder = this.gui.addFolder("🎮 Điều khiển chính");
    mainFolder.add(settings, "miniMap").name("📍 Hiện mini map");
    
    mainFolder.add(settings, "timeOfDay", {
      "☀️ Buổi trưa": "sun",
      "🌅 Buổi sáng": "day",
      "🌅 Buổi chiều": "noon",
      "🌙 Buổi tối": "night",
      "🌧️ Trời sắp mưa": "rain",
    })
    .name("🌍 Chế độ môi trường")
    .onChange(value => this.updateTimeOfDay(value));
    
    mainFolder.open();

    // Weather System Folder
    const weatherFolder = this.gui.addFolder("🌧️ Hệ thống thời tiết");
    weatherFolder.add(settings, "weather", {
      "☀️ Quang đãng": "Quang đãng",
      "🌦️ Mưa vừa": "Mưa vừa",
      "🌧️ Mưa lớn": "Mưa lớn",
      "⛈️ Mưa bão": "Mưa bão",
    })
    .name("🌤️ Loại thời tiết")
    .onChange(label => this.weatherSystem.updateWeatherSystem(weatherOptions[label]));

    this.addWeatherControls(weatherFolder);
    weatherFolder.open();

    // Advanced Settings Folder
    const advancedFolder = this.gui.addFolder("⚙️ Cài đặt nâng cao");
    this.addAdvancedControls(advancedFolder);
  }

  addWeatherControls(folder) {
    folder.add(settings, "rainIntensity", 0.0, 1.0, 0.05)
      .name("💧 Cường độ mưa")
      .onChange(() => this.weatherSystem.updateRainSettings());

    folder.add(settings, "windStrength", 0.0, 3.0, 0.1)
      .name("💨 Sức gió")
      .onChange(() => this.weatherSystem.updateRainSettings());

    folder.add(settings, "lightningFrequency", 0.0, 1.0, 0.05)
      .name("⚡ Tần suất sét");

    folder.add(settings, "stormMode")
      .name("🌪️ Chế độ bão");

    folder.add(settings, "stormVolume", 0.0, 1.0, 0.05)
      .name("🔊 Âm lượng")
      .onChange(value => this.weatherSystem.updateAudioVolume(value));
  }

  addAdvancedControls(folder) {
    folder.add(settings, "rainSpeed", 0.1, 3.0, 0.1)
      .name("⬇️ Tốc độ rơi");

    folder.add(settings, "windX", -15, 15, 0.5)
      .name("↔️ Gió ngang")
      .onChange(() => this.weatherSystem.updateRainSettings());

    folder.add(settings, "windZ", -15, 15, 0.5)
      .name("↕️ Gió xiên")
      .onChange(() => this.weatherSystem.updateRainSettings());

    folder.add(settings, "enableBulbLights")
      .name("💡 Bật đèn bulb")
      .onChange(() => this.lightSystem.toggleBulbLights());
  }

  updateTimeOfDay(value) {
    settings.timeOfDay = value;
    this.lightSystem.updateLightState(value);
  }
}
