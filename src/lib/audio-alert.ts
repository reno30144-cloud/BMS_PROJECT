// Web Audio API Synthesizer - Authentic Police Electronic Siren (Sirene Mobil Patroli Polresta Bandar Lampung)
// Menggunakan modulasi AudioParam perangkat keras (LFO Triangle Wave) langsung di audio rendering thread.
// Mencegah jitter/drift, menghasilkan sapuan nada linear yang 100% stabil, berbobot (kenyang),
// dan menirukan karakteristik akustik compression driver horn 100W mobil patroli Polri.

export type SirenMode = 'wail' | 'yelp';

class AlarmAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private currentMode: SirenMode = 'wail';

  // Audio Nodes
  private oscSquare: OscillatorNode | null = null;
  private oscSaw: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGainSquare: GainNode | null = null;
  private lfoGainSaw: GainNode | null = null;
  private hornFilter: BiquadFilterNode | null = null;
  private hornBiteFilter: BiquadFilterNode | null = null;
  private hornHighpass: BiquadFilterNode | null = null;
  private waveshaper: WaveShaperNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;

  // Listeners for UI state reactivity
  private listeners: Set<(state: { isPlaying: boolean; isMuted: boolean; mode: SirenMode }) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.initContext();
        this.resumeIfSuspended();
      };
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
    }
  }

  public subscribe(callback: (state: { isPlaying: boolean; isMuted: boolean; mode: SirenMode }) => void) {
    this.listeners.add(callback);
    callback({ isPlaying: this.isPlaying, isMuted: this.isMuted, mode: this.currentMode });
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    for (const cb of this.listeners) {
      try {
        cb({ isPlaying: this.isPlaying, isMuted: this.isMuted, mode: this.currentMode });
      } catch {}
    }
  }

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.ctx.onstatechange = () => {
          if (this.ctx && this.ctx.state === 'suspended' && this.isPlaying && !this.isMuted) {
            this.ctx.resume().catch(() => {});
          }
        };
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public resumeIfSuspended() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Membuat kurva saturasi analog ter-normalisasi (normalized tanh soft clipping)
   * Menirukan kompresi akustik corong TOA 100W tanpa memotong/mengurangi volume desibel (0 dBFS peak).
   */
  private makeDistortionCurve(amount: number = 2.5): Float32Array {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const k = Math.max(0.1, amount);
    const maxVal = Math.tanh(k);
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = Math.tanh(k * x) / maxVal;
    }
    return curve;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isPlaying) {
      this.stop();
    }
    this.notify();
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getMode(): SirenMode {
    return this.currentMode;
  }

  /**
   * Mengubah mode sirine secara langsung:
   * 'wail' = Sirine nada panjang mengalun (~6.7s siklus, nada wibawa mobil patroli)
   * 'yelp' = Sirine nada cepat memekik (~0.35s siklus, respon taktis darurat)
   */
  public setMode(mode: SirenMode) {
    this.currentMode = mode;
    if (this.isPlaying && this.lfo && this.ctx) {
      const now = this.ctx.currentTime;
      if (mode === 'wail') {
        this.lfo.frequency.cancelScheduledValues(now);
        this.lfo.frequency.setTargetAtTime(0.15, now, 0.05); // ~6.7 detik per siklus wail panjang
      } else {
        this.lfo.frequency.cancelScheduledValues(now);
        this.lfo.frequency.setTargetAtTime(2.8, now, 0.05); // ~0.35 detik per siklus yelp
      }
    }
    this.notify();
  }

  /**
   * Memulai sirine polisi tanggap darurat yang stabil, berwibawa, dan bertenaga
   * Berbunyi keras terus-menerus tanpa jeda sampai dipanggil stop() oleh admin.
   */
  public start(mode: SirenMode = this.currentMode) {
    if (this.isMuted) return;

    this.initContext();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.isPlaying) {
      if (mode !== this.currentMode) {
        this.setMode(mode);
      }
      return;
    }

    try {
      this.isPlaying = true;
      this.currentMode = mode;
      const now = this.ctx.currentTime;

      // 1. Dynamics Compressor / Brickwall Limiter untuk volume maksimal tanpa pecah/distorsi digital
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-2, now);
      this.compressor.knee.setValueAtTime(6, now);
      this.compressor.ratio.setValueAtTime(4.5, now);
      this.compressor.attack.setValueAtTime(0.001, now);
      this.compressor.release.setValueAtTime(0.08, now);

      // 2. Highpass Filter: Membuang getaran liar di bawah 450 Hz agar suara fokus memekik nyaring
      this.hornHighpass = this.ctx.createBiquadFilter();
      this.hornHighpass.type = 'highpass';
      this.hornHighpass.frequency.setValueAtTime(450, now);

      // 3. Resonansi Akustik Corong TOA Polisi Utama (Peaking Bandpass di 1450 Hz, +8.5 dB boost)
      // Karakteristik fisik horn speaker Federal Signal AS124 / Whelen SA314
      this.hornFilter = this.ctx.createBiquadFilter();
      this.hornFilter.type = 'peaking';
      this.hornFilter.frequency.setValueAtTime(1450, now);
      this.hornFilter.Q.setValueAtTime(1.4, now);
      this.hornFilter.gain.setValueAtTime(8.5, now);

      // 4. Acoustic Throat Bite Filter (Peaking di 2600 Hz, +4.5 dB boost)
      // Memberi penetrasi frekuensi tinggi yang sangat keras menembus keramaian ruangan SPKT
      this.hornBiteFilter = this.ctx.createBiquadFilter();
      this.hornBiteFilter.type = 'peaking';
      this.hornBiteFilter.frequency.setValueAtTime(2600, now);
      this.hornBiteFilter.Q.setValueAtTime(1.5, now);
      this.hornBiteFilter.gain.setValueAtTime(4.5, now);

      // 5. Soft Saturation / Waveshaper untuk sentuhan analog horn compression
      this.waveshaper = this.ctx.createWaveShaper();
      this.waveshaper.curve = this.makeDistortionCurve(2.5) as any;
      this.waveshaper.oversample = '2x';

      // 6. Master Gain volume ekstra kencang (1.20) dengan fade-in instan (50ms)
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.1, now);
      this.masterGain.gain.linearRampToValueAtTime(1.20, now + 0.05);

      // 7. LFO (Low Frequency Oscillator) Modulator
      // Menggunakan jenis 'triangle' (segitiga), BUKAN 'sine'.
      // Sirine wail panjang berputar pada 0.15 Hz (~6.7 detik per siklus naik-turun).
      this.lfo = this.ctx.createOscillator();
      this.lfo.type = 'triangle';

      const lfoRate = mode === 'wail' ? 0.15 : 2.8;
      this.lfo.frequency.setValueAtTime(lfoRate, now);

      // Pengatur rentang frekuensi sapuan (Sweep Depth)
      // Nada dasar tengah = 960 Hz, sapuan ±380 Hz -> rentang sapuan: 580 Hz s.d. 1340 Hz
      this.lfoGainSquare = this.ctx.createGain();
      this.lfoGainSquare.gain.setValueAtTime(380, now);

      this.lfoGainSaw = this.ctx.createGain();
      this.lfoGainSaw.gain.setValueAtTime(380, now);

      this.lfo.connect(this.lfoGainSquare);
      this.lfo.connect(this.lfoGainSaw);

      // 8. Oscillator 1: Square Wave (Memberi karakter nyaring, tajam, dan memecah kebisingan khas speaker TOA)
      this.oscSquare = this.ctx.createOscillator();
      this.oscSquare.type = 'square';
      this.oscSquare.frequency.setValueAtTime(960, now);
      this.lfoGainSquare.connect(this.oscSquare.frequency);

      // Gain kontrol untuk osilator square (volume keras & bertenaga tinggi)
      const squareGain = this.ctx.createGain();
      squareGain.gain.setValueAtTime(0.95, now);

      // 9. Oscillator 2: Sawtooth Wave (Memberi isi tubuh nada agar padat, bulat, dan "kenyang")
      this.oscSaw = this.ctx.createOscillator();
      this.oscSaw.type = 'sawtooth';
      this.oscSaw.frequency.setValueAtTime(960, now);
      this.lfoGainSaw.connect(this.oscSaw.frequency);

      const sawGain = this.ctx.createGain();
      sawGain.gain.setValueAtTime(0.85, now);

      // Rangkaian Jalur Audio:
      // (OscSquare * 0.95 + OscSaw * 0.85)
      //   -> HornHighpass (450Hz)
      //   -> HornFilter (1450Hz, +8.5dB)
      //   -> HornBiteFilter (2600Hz, +4.5dB)
      //   -> WaveShaper (Analog Horn Saturation)
      //   -> Compressor (Limiter)
      //   -> MasterGain (1.20)
      //   -> Speakers Destination
      this.oscSquare.connect(squareGain);
      this.oscSaw.connect(sawGain);

      squareGain.connect(this.hornHighpass);
      sawGain.connect(this.hornHighpass);

      this.hornHighpass.connect(this.hornFilter);
      this.hornFilter.connect(this.hornBiteFilter);
      this.hornBiteFilter.connect(this.waveshaper);
      this.waveshaper.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Nyalakan semua osilator serentak
      this.lfo.start(now);
      this.oscSquare.start(now);
      this.oscSaw.start(now);

      this.notify();
    } catch (err) {
      console.warn('Audio alert engine notice:', err);
    }
  }

  /**
   * Menghentikan sirine secara halus tanpa bunyi "pop"
   */
  public stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.notify();

    try {
      if (this.masterGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.12);
      }

      setTimeout(() => {
        if (this.lfo) {
          try {
            this.lfo.stop();
            this.lfo.disconnect();
          } catch {}
          this.lfo = null;
        }

        if (this.oscSquare) {
          try {
            this.oscSquare.stop();
            this.oscSquare.disconnect();
          } catch {}
          this.oscSquare = null;
        }

        if (this.oscSaw) {
          try {
            this.oscSaw.stop();
            this.oscSaw.disconnect();
          } catch {}
          this.oscSaw = null;
        }

        if (this.hornHighpass) {
          try {
            this.hornHighpass.disconnect();
          } catch {}
          this.hornHighpass = null;
        }

        if (this.hornFilter) {
          try {
            this.hornFilter.disconnect();
          } catch {}
          this.hornFilter = null;
        }

        if (this.hornBiteFilter) {
          try {
            this.hornBiteFilter.disconnect();
          } catch {}
          this.hornBiteFilter = null;
        }

        if (this.waveshaper) {
          try {
            this.waveshaper.disconnect();
          } catch {}
          this.waveshaper = null;
        }

        if (this.compressor) {
          try {
            this.compressor.disconnect();
          } catch {}
          this.compressor = null;
        }

        if (this.masterGain) {
          try {
            this.masterGain.disconnect();
          } catch {}
          this.masterGain = null;
        }
      }, 140);
    } catch {}
  }
}

export const alarmAudio = new AlarmAudioEngine();

