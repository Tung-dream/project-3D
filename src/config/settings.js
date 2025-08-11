export const settings = {
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
};

export const weatherOptions = {
  "Quang đãng": "clear",
  "Mưa vừa": "moderate_rain",
  "Mưa lớn": "heavy_rain", 
  "Mưa bão": "storm_rain",
};

export const modelPositions = {
  trees: [
    { type: "tree3", x: -5, z: 50, y: -0.05, info: "Cây xanh, cung cấp oxy" },
    { type: "tree3", x: 25, z: 55, y: -0.05, info: "Cây xanh, cung cấp oxy" },
    { type: "tree2", x: 27, z: 48, info: "Cây khô" },
    { type: "tree2", x: -6, z: -10, info: "Cây khô" },
    { type: "tree2", x: 20, z: -10, info: "Cây khô" },
    { type: "tree3", x: -8, z: 3, y: -0.05, info: "Cây xanh, cung cấp oxy" }
  ],
  lights: [
    { type: "den1", x: -36, z: 36, y: 7 },
    { type: "den1", x: 15, z: 39, y: 7, ry: -Math.PI / -2 },
    { type: "den2", x: -20, z: -8, y: 10 },
    { type: "den2", x: 20, z: -8, y: 10 },
    { type: "den3", x: 5, z: 15, y: 10 },
    { type: "den3", x: -25, z: 15, y: 10 },
    { type: "den3", x: 9, z: -33, y: 10 },
    { type: "den3", x: 40, z: -37, y: 10 },
    { type: "den3", x: -40, z: -37, y: 10 }
  ],
  house: { type: "house", x: -1, z: 5, info: "Nhà xe" },
  cars: [
    {
      type: "zil1",
      x: 13,
      z: 15,
      y: 0.05,
      ry: -Math.PI / 1,
      scale: 0.8,
      info: "Xe bọc thép, chống đạn, tính an toàn cao",
      isCarInHouse: true
    },
    {
      type: "xequansu",
      x: -14.8,
      z: 5,
      y: 1.07,
      ry: -Math.PI / 2,
      info: "Xe vận chuyển vũ khí, trang thiết bị vật tư, vật liệu quân dụng",
      isCarInHouse: true
    }
    // Thêm các xe khác...
  ]
};
