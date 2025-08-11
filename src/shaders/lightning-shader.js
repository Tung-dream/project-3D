import * as THREE from "three"

export const LightningShader = {
  uniforms: {
    time: { value: 0.0 },
    resolution: { value: new THREE.Vector2() },
    lightningIntensity: { value: 0.0 },
    lightningPosition: { value: new THREE.Vector2(0.5, 0.8) },
    lightningBranches: { value: 5.0 },
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
    uniform float lightningIntensity;
    uniform float lightningPosition;
    uniform float lightningBranches;
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
    
    float lightning(vec2 uv, vec2 start, vec2 end, float thickness) {
      vec2 dir = normalize(end - start);
      vec2 perp = vec2(-dir.y, dir.x);
      
      float t = dot(uv - start, dir) / dot(end - start, dir);
      t = clamp(t, 0.0, 1.0);
      
      vec2 closest = start + t * (end - start);
      float dist = length(uv - closest);
      
      float zigzag = noise(vec2(t * 20.0, time * 10.0)) * 0.02;
      dist += zigzag;
      
      return 1.0 - smoothstep(0.0, thickness, dist);
    }
    
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      
      float bolt = 0.0;
      
      vec2 start = lightningPosition;
      vec2 end = vec2(lightningPosition.x + (noise(vec2(time * 5.0)) - 0.5) * 0.3, 0.0);
      bolt += lightning(uv, start, end, 0.005) * 2.0;
      
      for(int i = 0; i < int(lightningBranches); i++) {
        float fi = float(i);
        float t = fi / lightningBranches;
        vec2 branchStart = mix(start, end, t);
        vec2 branchEnd = branchStart + vec2(
          (noise(vec2(fi * 10.0, time * 3.0)) - 0.5) * 0.2,
          -(noise(vec2(fi * 15.0, time * 2.0))) * 0.3
        );
        bolt += lightning(uv, branchStart, branchEnd, 0.003) * 0.8;
      }
      
      float glow = bolt * 3.0;
      glow += bolt * 0.5 / (distance(uv, lightningPosition) + 0.1);
      
      vec3 lightningColor = vec3(0.8, 0.9, 1.0) * glow * lightningIntensity;
      
      gl_FragColor = vec4(lightningColor, glow * lightningIntensity);
    }
  `,
}
