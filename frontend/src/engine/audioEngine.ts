// A simple Web Audio API synthesizer for UI sound effects
// Features: Soft click, low hum, and a chime

class AudioEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private lastHumTime = 0;

  private init(): boolean {
    if (typeof window === "undefined") return false;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return false;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === "suspended") {
        void this.ctx.resume().catch(() => {});
      }
      return true;
    } catch {
      this.ctx = null;
      return false;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(force?: boolean): boolean {
    this.enabled = force !== undefined ? force : !this.enabled;
    return this.enabled;
  }

  public playTick(frequency = 520) {
    if (!this.enabled || !this.init() || !this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, t);

      gain.gain.setValueAtTime(0.03, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch {
      // Ignore Web Audio errors under restricted autoplay policies
    }
  }

  public playIncorrect() {
    if (!this.enabled || !this.init() || !this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.2);

      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.25);
    } catch {
      // Ignore Web Audio errors under restricted autoplay policies
    }
  }

  public playClick() {
    if (!this.enabled || !this.init() || !this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // High frequency, extremely short duration (percussive click)
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch {
      // Ignore Web Audio errors under restricted autoplay policies
    }
  }

  public playHum() {
    if (!this.enabled) return;

    // Throttle hums so they don't overlap too aggressively during fast recursion
    if (Date.now() - this.lastHumTime < 100) return;
    this.lastHumTime = Date.now();

    if (!this.init() || !this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Low, smooth frequency
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, t);

      // Fade in and fade out
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.1);
      gain.gain.linearRampToValueAtTime(0, t + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.3);
    } catch {
      // Ignore Web Audio errors under restricted autoplay policies
    }
  }

  public playChime() {
    if (!this.enabled || !this.init() || !this.ctx) return;

    try {
      const t = this.ctx.currentTime;

      // Play a lovely major chord (e.g. C - E - G)
      const freqs = [523.25, 659.25, 783.99];

      freqs.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t);

        // Stagger the notes slightly
        const startTime = t + i * 0.05;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(startTime);
        osc.stop(startTime + 1.5);
      });
    } catch {
      // Ignore Web Audio errors under restricted autoplay policies
    }
  }
}

export const audioEngine = new AudioEngine();
