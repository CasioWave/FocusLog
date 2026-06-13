export class AudioController {
  constructor() {
    this.audioCtx = null;
    this.intervalId = null;
    this.audioElement = new Audio();
    this.audioElement.volume = 0.5;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  async fetchConfig() {
    try {
      const res = await fetch('/api/settings');
      return await res.json();
    } catch(e) {
      return null;
    }
  }

  playSynthesizedBell() {
    if (!this.audioCtx) this.init();
    
    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 1.5);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 2);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(t);
    osc.stop(t + 2);
  }

  async playBell(isEnd = false) {
    const config = await this.fetchConfig();
    const customPath = isEnd ? config?.endBellPath : config?.intervalBellPath;

    if (customPath && customPath.trim() !== '') {
      this.audioElement.src = `/api/audio?path=${encodeURIComponent(customPath.trim())}`;
      this.audioElement.currentTime = 0;
      this.audioElement.play().catch(e => {
        console.error("Custom audio play failed, falling back to sine wave", e);
        this.playSynthesizedBell();
      });
    } else {
      this.playSynthesizedBell();
    }
  }

  startRandomBell(minMinutes = 5, maxMinutes = 15) {
    this.stopBell();
    const scheduleNext = () => {
      const delay = (Math.random() * (maxMinutes - minMinutes) + minMinutes) * 60 * 1000;
      this.intervalId = setTimeout(() => {
        this.playBell(false);
        scheduleNext();
      }, delay);
    };
    scheduleNext();
  }

  startIntervalBell(minutes) {
    this.stopBell();
    this.intervalId = setInterval(() => {
      this.playBell(false);
    }, minutes * 60 * 1000);
  }

  stopBell() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Pause any currently playing custom audio element
    if (!this.audioElement.paused) {
      this.audioElement.pause();
    }
  }
}

export const audioController = new AudioController();
