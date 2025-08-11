import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { LightningShader } from '../shaders/LightningShader.js';
import { ThunderAudio } from '../audio/ThunderAudio.js';

export class LightningSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.composer = null;
    this.lightningPass = null;
    this.thunderAudio = new ThunderAudio();
    this.lightningEnabled = false;
    this.lastLightningTime = 0;
    this.lightningInterval = 0;
    this.lightningDuration = 0;
    
    this.setupLightningEffect();
  }

  setupLightningEffect() {
    const renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      {
        format: THREE.RGBAFormat,
        stencilBuffer: false
      }
    );

    this.composer = new EffectComposer(renderer, renderTarget);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.lightningPass = new ShaderPass(LightningShader);
    this.lightningPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    this.lightningPass.uniforms.lightningIntensity.value = 0;
    this.composer.addPass(this.lightningPass);
  }

  update(deltaTime) {
    if (!this.lightningEnabled) return;

    const currentTime = performance.now();
    
    if (currentTime - this.lastLightningTime > this.lightningInterval) {
      this.triggerLightning();
      this.lastLightningTime = currentTime;
      this.lightningInterval = 5000 + Math.random() * 10000;
    }

    this.lightningPass.uniforms.time.value += deltaTime;
    
    const timeSinceLastLightning = currentTime - this.lastLightningTime;
    if (timeSinceLastLightning < this.lightningDuration) {
      const intensity = Math.max(0, 1 - timeSinceLastLightning / this.lightningDuration);
      this.lightningPass.uniforms.lightningIntensity.value = intensity;
    } else {
      this.lightningPass.uniforms.lightningIntensity.value = 0;
    }
  }

  triggerLightning() {
    this.lightningDuration = 200 + Math.random() * 300;
    this.lightningPass.uniforms.lightningPosition.value.set(
      0.3 + Math.random() * 0.4,
      0.7 + Math.random() * 0.2
    );
    this.lightningPass.uniforms.lightningBranches.value = 3 + Math.random() * 4;
    
    const intensity = 0.5 + Math.random() * 0.5;
    this.thunderAudio.playThunder(intensity);
  }

  setEnabled(enabled) {
    this.lightningEnabled = enabled;
    if (!enabled) {
      this.lightningPass.uniforms.lightningIntensity.value = 0;
    }
  }

  onWindowResize() {
    this.lightningPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  }
}
