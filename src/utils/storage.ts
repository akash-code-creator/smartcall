import { AppState, SavedVoiceNote, VoiceProfile } from "../types";

export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: "aoede",
    name: "Aoede (Speaker 1)",
    voiceName: "Aoede",
    description: "Default Google AI Studio official Voice Artist model",
    gender: "Warm Male",
  },
  {
    id: "kore",
    name: "Google AI Kore",
    voiceName: "Kore",
    description: "Crystal-clear automotive driving response tone",
    gender: "Friendly Female",
  },
  {
    id: "puck",
    name: "Google AI Puck",
    voiceName: "Puck",
    description: "Upbeat, energetic and high intelligibility",
    gender: "Warm Male",
  },
  {
    id: "fenrir",
    name: "Google AI Fenrir",
    voiceName: "Fenrir",
    description: "Deep, authoritative voice for formal meetings",
    gender: "Deep Calm",
  },
  {
    id: "zephyr",
    name: "Google AI Zephyr",
    voiceName: "Zephyr",
    description: "Soothing, gentle voice for night / rest hours",
    gender: "Neutral",
  },
];

export const INITIAL_SAVED_NOTES: SavedVoiceNote[] = [
  {
    id: "note-1",
    title: "Driving Auto-Reply",
    filename: "smartcall_native_active.wav",
    text: "I am driving, call you back soon!",
    source: "gemini_tts",
    durationSec: 2.8,
    audioUrl: "", // Will be generated or synthesized
    createdAt: "Today, 08:30 AM",
    isDefault: true,
    voiceProfile: "aoede",
  },
  {
    id: "note-2",
    title: "Urgent WhatsApp Voice Note",
    filename: "smartcall_driving_whatsapp.wav",
    text: "Namaste! Main driving kar raha hu, urgent ho toh WhatsApp karein.",
    source: "gemini_tts",
    durationSec: 3.4,
    audioUrl: "",
    createdAt: "Yesterday, 06:15 PM",
    isDefault: false,
    voiceProfile: "aoede",
  },
  {
    id: "note-3",
    title: "Executive Meeting",
    filename: "smartcall_meeting_quiet.wav",
    text: "I am in an executive meeting and cannot answer. Please text me.",
    source: "voice_recorder",
    durationSec: 3.1,
    audioUrl: "",
    createdAt: "Sep 4, 11:20 AM",
    isDefault: false,
  },
];

const STORAGE_KEY = "smartcall_app_state_v1";

export function loadSavedState(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        isProUnlocked: true,
        trialUsageCount: 0,
        selectedVoice: parsed.selectedVoice || "aoede",
      };
    }
  } catch (e) {
    console.warn("Could not load stored state:", e);
  }
  return {
    isProUnlocked: true,
    trialUsageCount: 0,
    selectedVoice: "aoede",
  };
}

export function saveState(state: Partial<AppState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Could not save state to localStorage:", e);
  }
}
