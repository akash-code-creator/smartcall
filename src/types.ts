export type ActiveTab = "home" | "audio" | "triggers" | "analytics";

export type ResponseSource = "gemini_tts" | "voice_recorder" | "local_upload";

export interface VoiceProfile {
  id: string;
  name: string;
  voiceName: string;
  description: string;
  gender: "Neutral" | "Warm Male" | "Deep Calm" | "Friendly Female";
}

export interface SavedVoiceNote {
  id: string;
  title: string;
  filename: string;
  text: string;
  source: ResponseSource;
  durationSec: number;
  audioUrl: string; // Base64 data URI or blob URL
  createdAt: string;
  isDefault: boolean;
  voiceProfile?: string;
}

export interface HardwareTriggerConfig {
  doubleTapEnabled: boolean;
  sensitivity: "Low" | "Medium" | "High";
  sensitivityValue: number; // 1 - 100
  doubleClickThresholdMs: number; // default 500ms
  singlePowerIntercepted: boolean; // block mute
  volumeDownMuteEnabled: boolean; // smooth mute
  onlyForContacts: boolean;
  excludeFavorites: boolean;
  silenceRingtone: boolean;
  fadeDurationMs: number;
}

export interface CallInterceptLog {
  id: string;
  callerName: string;
  callerNumber: string;
  isContact: boolean;
  isFavorite: boolean;
  timestamp: string;
  triggerUsed: "Double Power Press" | "Double-Tap Gesture" | "Volume Down (Muted)" | "Single Power (Mute Blocked)" | "Manual Trigger";
  actionTaken: "Auto-Replied Voice Note" | "Ringtone Muted" | "Ringtone Kept Ringing" | "Call Declined";
  responseFilename: string;
  durationSec: number;
  status: "handled" | "muted" | "ignored";
  scriptSummary?: string;
}

export interface AppState {
  isActive: boolean; // Driving Mode Active / Standby
  activeTab: ActiveTab;
  activeSource: ResponseSource;
  currentScriptText: string;
  selectedVoice: string;
  savedNotes: SavedVoiceNote[];
  activeNoteId: string;
  triggerConfig: HardwareTriggerConfig;
  logs: CallInterceptLog[];
  trialUsageCount: number; // e.g. 1 out of 3 used
  isProUnlocked: boolean;
  showIAPModal: boolean;
  showSimulateCallModal: boolean;
  showSettingsMenu: boolean;
  showAdMobBanner: boolean;
}
