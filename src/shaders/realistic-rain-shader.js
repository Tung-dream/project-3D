import * as THREE from "three"

export const RealisticRainShader = {
  uniforms: {
    time: { value: 0.0 },
    resolution: { value: new THREE.Vector2() },
    rainIntensity: { value: 0.5 },
    windDirection: { value: new THREE.Vector2(0.1, 0.0) },
    cameraPosition: { value: new THREE.Vector3() },
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform float time;
    uniform vec2 resolution;
    uniform float rainIntensity;
    uniform vec2 windDirection;
    uniform vec3 cameraPosition;
    varying vec2 vUv;
    
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }
    
    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    float rainDrop(vec2 uv, float speed, float size, float offset) {
      uv.y += time * speed;
      uv.x += windDirection.x * time * 0.3;
      uv = fract(uv + offset);
      
      float drop = length(vec2(uv.x - 0.5, (uv.y - 0.5) * 3.0));
      drop = 1.0 - smoothstep(0.0, size, drop);
      
      float tail = smoothstep(0.1, 0.9, uv.y) * smoothstep(0.0, 0.1, abs(uv.x - 0.5));
      drop = max(drop, tail * 0.3);
      
      return drop;
    }
    
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      
      float rain = 0.0;
      
      for(int i = 0; i < 15; i++) {
        float fi = float(i);
        float scale = 1.0 + fi * 0.3;
        float speed = 2.0 + fi * 0.5;
        float size = 0.02 + fi * 0.01;
        float offset = fi * 0.1;
        
        rain += rainDrop(uv * scale, speed, size, offset) * (0.8 - fi * 0.05);
      }
      
      for(int i = 0; i < 8; i++) {
        float fi = float(i);
        float scale = 0.3 + fi * 0.1;
        float speed = 1.0 + fi * 0.2;
        float size = 0.05 + fi * 0.02;
        float offset = fi * 0.2;
        
        rain += rainDrop(uv * scale, speed, size, offset) * 0.2;
      }
      
      float groundSplash = 0.0;
      if(uv.y < 0.3) {
        float splashNoise = noise(uv * 20.0 + time * 2.0);
        groundSplash = splashNoise * rainIntensity * 0.1 * (0.3 - uv.y);
      }
      
      rain = clamp(rain * rainIntensity, 0.0, 1.0);
      
      vec3 rainColor = vec3(0.7, 0.8, 0.9);
      vec3 splashColor = vec3(0.9, 0.95, 1.0);
      
      vec4 finalColor = vec4(rainColor, rain) + vec4(splashColor, groundSplash);
      
      gl_FragColor = finalColor;
    }
  `,
}
