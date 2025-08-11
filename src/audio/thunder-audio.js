export class ThunderAudio {
  constructor() {
    this.audioContext = null
    this.thunderSounds = []
    this.initAudioContext()
  }

  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      console.warn("Web Audio API không được hỗ trợ")
    }
  }

  generateThunderSound(duration = 2000, intensity = 0.5) {
    if (!this.audioContext) return

    const sampleRate = this.audioContext.sampleRate
    const length = sampleRate * (duration / 1000)
    const buffer = this.audioContext.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < length; i++) {
      const t = i / length
      const envelope = Math.exp(-t * 3) * intensity
      const noise = (Math.random() * 2 - 1) * envelope
      const lowFreq = Math.sin(t * Math.PI * 20) * envelope * 0.3
      data[i] = noise + lowFreq
    }

    return buffer
  }

  playThunder(intensity = 0.5) {
    if (!this.audioContext) return

    const buffer = this.generateThunderSound(1500 + Math.random() * 1000, intensity)
    const source = this.audioContext.createBufferSource()
    const gainNode = this.audioContext.createGain()

    source.buffer = buffer
    source.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(intensity, this.audioContext.currentTime + 0.1)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 2)

    source.start()
    source.stop(this.audioContext.currentTime + 3)
  }
}
