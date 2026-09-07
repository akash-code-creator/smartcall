/**
 * Audio helper utilities for SmartCall:
 * - Uncompressed WAV encoding
 * - Synthetic ringtone generation with volume fading
 * - Voice playback and speech synthesis
 */

// Encode Float32Array audio buffer into 16-bit PCM uncompressed WAV blob
export function encodeWAV(samples: Float32Array, sampleRate = 24000): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Helper for writing ASCII characters
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");

  // Format chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // Data chunk
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

// Convert audio blob to Data URL
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Global reference to active utterance to prevent Chromium garbage collection aborts
let activeUtterance: SpeechSynthesisUtterance | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

// Preload and cache browser synthesis voices safely
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    cachedVoices = window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      try {
        cachedVoices = window.speechSynthesis.getVoices();
      } catch {}
    };
  } catch (e) {
    console.warn("SpeechSynthesis voice initialization notice:", e);
  }
}

/**
 * Check if the current browser environment supports the Web Speech Synthesis API
 */
export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

/**
 * Retrieve the best matching female voice from the browser's speech synthesis engine.
 * Inspects system voices across Windows, macOS, iOS, Android, and ChromeOS.
 */
export function getFemaleVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisSupported()) return null;

  try {
    const voices =
      cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();

    if (!voices || voices.length === 0) return null;

    // Prioritized female voice indicators & names
    const femaleVoicePatterns = [
      /female/i,
      /zira/i,
      /samantha/i,
      /victoria/i,
      /karen/i,
      /serena/i,
      /moira/i,
      /fiona/i,
      /tessa/i,
      /veena/i,
      /cynthia/i,
      /lisa/i,
      /helena/i,
      /anna/i,
      /eva/i,
      /olivia/i,
      /amy/i,
      /jenny/i,
      /aria/i,
      /hazel/i,
      /ava/i,
      /allison/i,
      /susan/i,
      /stephanie/i,
      /en-us-x-sfg#female/i,
      /en_us.*female/i,
      /google.*(female|en-us|en_us)/i,
    ];

    // 1. Search English voices with specific female names/tags
    for (const pattern of femaleVoicePatterns) {
      const match = voices.find(
        (v) =>
          (pattern.test(v.name) || pattern.test(v.voiceURI)) &&
          (v.lang.startsWith("en") || !v.lang)
      );
      if (match) return match;
    }

    // 2. Search any language voice with female indicator
    for (const pattern of femaleVoicePatterns) {
      const match = voices.find(
        (v) => pattern.test(v.name) || pattern.test(v.voiceURI)
      );
      if (match) return match;
    }

    // 3. Fallback to standard US/UK English voices
    const englishMatch = voices.find(
      (v) => v.lang === "en-US" || v.lang === "en_US" || v.lang.startsWith("en")
    );
    if (englishMatch) return englishMatch;

    // 4. Default system voice
    return voices.find((v) => v.default) || voices[0] || null;
  } catch (err) {
    console.warn("Could not query browser voices:", err);
    return null;
  }
}

/**
 * Cancel and stop any ongoing browser speech synthesis
 */
export function stopBrowserTTS(): void {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  activeUtterance = null;
}

/**
 * Speak out text immediately using the standard Browser Web Speech Synthesis API (`window.speechSynthesis`)
 * with a female voice. Designed to prevent runtime errors and browser garbage-collection interruptions.
 */
export function speakBrowserTTS(
  text: string,
  options?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
    pitch?: number;
    rate?: number;
  }
): boolean {
  if (!isSpeechSynthesisSupported()) {
    console.warn("Browser Web Speech Synthesis API not available in this window environment.");
    options?.onError?.(new Error("speechSynthesis unavailable"));
    return false;
  }

  try {
    // Cancel any previous queued speech
    window.speechSynthesis.cancel();

    const cleanText =
      text?.trim() ||
      "I am currently driving and will get back to you soon.";

    const utterance = new SpeechSynthesisUtterance(cleanText);
    activeUtterance = utterance;

    // Select female voice
    const femaleVoice = getFemaleVoice();
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    // Tune pitch and rate for an authentic, pleasant female telephone auto-responder
    // Pitch 1.12 delivers a clear feminine vocal register across all OS engines
    utterance.pitch = options?.pitch ?? 1.12;
    utterance.rate = options?.rate ?? 0.98;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      options?.onStart?.();
    };

    utterance.onend = () => {
      activeUtterance = null;
      options?.onEnd?.();
    };

    utterance.onerror = (event: any) => {
      activeUtterance = null;
      // "canceled" or "interrupted" is standard when another utterance begins or audio is stopped
      if (event?.error === "canceled" || event?.error === "interrupted") {
        options?.onEnd?.();
        return;
      }
      console.warn("SpeechSynthesis notification:", event?.error || event);
      options?.onError?.(event);
      options?.onEnd?.();
    };

    // Chromium queue resume protection
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn("speakBrowserTTS runtime error caught safely:", err);
    activeUtterance = null;
    options?.onError?.(err);
    return false;
  }
}

// Generate realistic synthetic voice speech audio if offline or fallback
export function createSyntheticVoiceNote(text: string): { blob: Blob; durationSec: number } {
  const sampleRate = 24000;
  const durationSec = Math.max(2.0, Math.min(8.0, text.length * 0.08));
  const totalSamples = Math.floor(sampleRate * durationSec);
  const samples = new Float32Array(totalSamples);

  // Synthesize voice note sound envelope and modulation
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Word rhythm envelope
    const wordRate = 3.5; // ~3.5 syllables per sec
    const syllabicEnvelope = Math.max(0.05, Math.sin(2 * Math.PI * wordRate * t) * 0.5 + 0.5);
    const globalFade = Math.sin((Math.PI * i) / totalSamples);

    // Formant simulation (vocal tract harmonics)
    const f0 = 160 + Math.sin(2 * Math.PI * 1.5 * t) * 15; // pitch inflection
    const osc1 = Math.sin(2 * Math.PI * f0 * t);
    const osc2 = 0.5 * Math.sin(2 * Math.PI * f0 * 2 * t);
    const osc3 = 0.25 * Math.sin(2 * Math.PI * f0 * 3.5 * t);
    const noise = (Math.random() - 0.5) * 0.04;

    samples[i] = (osc1 + osc2 + osc3 + noise) * syllabicEnvelope * globalFade * 0.5;
  }

  const blob = encodeWAV(samples, sampleRate);
  return { blob, durationSec };
}

// Phone Ringtone Synthesizer using Web Audio API
export class RingtonePlayer {
  private ctx: AudioContext | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private intervalId: any = null;

  start() {
    if (this.isPlaying) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);
      this.isPlaying = true;

      // Authentic US/Standard Dual-tone telephone ring: 440Hz + 480Hz
      const ringCycle = () => {
        if (!this.isPlaying || !this.ctx || !this.gainNode) return;
        const now = this.ctx.currentTime;

        // Clean up previous oscillators if any
        if (this.osc1) {
          try { this.osc1.stop(); this.osc1.disconnect(); } catch {}
        }
        if (this.osc2) {
          try { this.osc2.stop(); this.osc2.disconnect(); } catch {}
        }

        this.osc1 = this.ctx.createOscillator();
        this.osc2 = this.ctx.createOscillator();

        this.osc1.type = "sine";
        this.osc2.type = "sine";
        this.osc1.frequency.setValueAtTime(440, now);
        this.osc2.frequency.setValueAtTime(480, now);

        // Ring for 1.8 seconds, then silence for 2.2 seconds (standard cadence)
        const burstGain = this.ctx.createGain();
        burstGain.gain.setValueAtTime(0.3, now);
        burstGain.gain.setValueAtTime(0.3, now + 1.8);
        burstGain.gain.linearRampToValueAtTime(0.001, now + 1.85);

        this.osc1.connect(burstGain);
        this.osc2.connect(burstGain);
        burstGain.connect(this.gainNode);

        this.osc1.start(now);
        this.osc2.start(now);
        this.osc1.stop(now + 1.85);
        this.osc2.stop(now + 1.85);
      };

      ringCycle();
      this.intervalId = setInterval(ringCycle, 4000);
    } catch (e) {
      console.warn("Ringtone synthesizer unavailable:", e);
    }
  }

  // Smoothly mute/fade ringtone volume to zero (for Volume Down button press)
  fadeToMute(durationSec = 0.4) {
    if (!this.ctx || !this.gainNode) return;
    try {
      const now = this.ctx.currentTime;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(0.0001, now + durationSec);
    } catch (e) {
      console.warn("Volume fade error:", e);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.osc1) {
      try { this.osc1.stop(); this.osc1.disconnect(); } catch {}
      this.osc1 = null;
    }
    if (this.osc2) {
      try { this.osc2.stop(); this.osc2.disconnect(); } catch {}
      this.osc2 = null;
    }
    if (this.gainNode && this.ctx) {
      try { this.gainNode.disconnect(); } catch {}
      this.gainNode = null;
    }
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
