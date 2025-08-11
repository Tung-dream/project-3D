import * as THREE from "three"

// Unused but included for reference as per instruction "không được chỉnh sửa gì về logic code"
export const RainShader = {
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
    
    void main() {
      vec2 st = gl_FragCoord.xy / resolution.xy;
      st.x *= resolution.x / resolution.y;
      
      float rain1 = 0.0;
      float rain2 = 0.0;
      float rain3 = 0.0;
      
      for(int i = 0; i < 40; i++) {
        float fi = float(i);
        vec2 pos = st + vec2(fi * 0.1, 0.0);
        pos.y += time * (2.0 + fi * 0.1) * rainIntensity;
        pos.x += windDirection.x * time * 0.5;
        pos = fract(pos);
        
        float drop = smoothstep(0.0, 0.005, abs(pos.x - 0.5)) * 
                     smoothstep(0.0, 0.02, pos.y) * 
                     smoothstep(1.0, 0.98, pos.y);
        rain1 += drop * 0.3;
      }
      
      for(int i = 0; i < 60; i++) {
        float fi = float(i);
        vec2 pos = st * 2.0 + vec2(fi * 0.05, 0.0);
        pos.y += time * (3.0 + fi * 0.05) * rainIntensity;
        pos.x += windDirection.x * time * 0.3;
        pos = fract(pos);
        
        float drop = smoothstep(0.0, 0.003, abs(pos.x - 0.5)) * 
                     smoothstep(0.0, 0.01, pos.y) * 
                     smoothstep(1.0, 0.99, pos.y);
        rain2 += drop * 0.2;
      }
      
      for(int i = 0; i < 30; i++) {
        float fi = float(i);
        vec2 pos = st * 0.5 + vec2(fi * 0.2, 0.0);
        pos.y += time * (1.5 + fi * 0.2) * rainIntensity;
        pos.x += windDirection.x * time * 0.7;
        pos = fract(pos);
        
        float drop = smoothstep(0.0, 0.01, abs(pos.x - 0.5)) * 
                     smoothstep(0.0, 0.03, pos.y) * 
                     smoothstep(1.0, 0.97, pos.y);
        rain3 += drop * 0.1;
      }
      
      float totalRain = (rain1 + rain2 + rain3) * rainIntensity;
      
      float fog = rainIntensity * 0.1 * noise(st * 10.0 + time * 0.1);
      
      vec4 rainColor = vec4(0.8, 0.9, 1.0, totalRain);
      vec4 fogColor = vec4(0.7, 0.8, 0.9, fog);
      
      gl_FragColor = mix(vec4(0.0), rainColor + fogColor, rainIntensity);
    }
  `,
}
