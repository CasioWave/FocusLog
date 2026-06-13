class NoiseGenerator {
  constructor() {
    this.audioContext = null;
    this.noiseNode = null;
    this.filterNode = null;
    this.gainNode = null;
    this.isPlaying = false;
  }

  initContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  createWhiteNoise() {
    const bufferSize = this.audioContext.sampleRate * 2; // 2 seconds
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    return noise;
  }

  createPinkNoise() {
    const bufferSize = this.audioContext.sampleRate * 2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // compensation
      b6 = white * 0.115926;
    }
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    return noise;
  }

  createBrownNoise() {
    const bufferSize = this.audioContext.sampleRate * 2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // compensation
    }
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    return noise;
  }

  playNoise(type = 'white', volume = 0.3) {
    this.initContext();
    this.stopNoise();

    if (type === 'none') return;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = volume;

    if (type === 'white') {
      this.noiseNode = this.createWhiteNoise();
    } else if (type === 'pink') {
      this.noiseNode = this.createPinkNoise();
    } else if (type === 'brown') {
      this.noiseNode = this.createBrownNoise();
    } else if (type === 'rain') {
      this.noiseNode = this.createPinkNoise();
      this.filterNode = this.audioContext.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 1000;
      this.noiseNode.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
    }

    if (type !== 'rain') {
      this.noiseNode.connect(this.gainNode);
    }

    this.gainNode.connect(this.audioContext.destination);
    this.noiseNode.start();
    this.isPlaying = true;
  }

  stopNoise() {
    if (this.noiseNode) {
      try { this.noiseNode.stop(); } catch (e) {}
      this.noiseNode.disconnect();
      this.noiseNode = null;
    }
    if (this.filterNode) {
      this.filterNode.disconnect();
      this.filterNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    this.isPlaying = false;
  }

  playSyntheticGong(freq = 440, type = 'sine') {
    this.initContext();
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
    
    // Gong envelope
    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 3);
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 3.1);
  }
}

export default new NoiseGenerator();
