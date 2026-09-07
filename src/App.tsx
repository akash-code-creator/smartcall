import React, { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { BottomNavBar } from "./components/BottomNavBar";
import { HomeScreen } from "./components/HomeScreen";
import { AudioSettingsScreen } from "./components/AudioSettingsScreen";
import { TriggerConfigScreen } from "./components/TriggerConfigScreen";
import { AnalyticsScreen } from "./components/AnalyticsScreen";
import { IncomingCallSimulatorModal } from "./components/IncomingCallSimulatorModal";
import { IAPModal } from "./components/IAPModal";
import { SettingsModal } from "./components/SettingsModal";
import {
  ActiveTab,
  AppState,
  CallInterceptLog,
  HardwareTriggerConfig,
  SavedVoiceNote,
} from "./types";
import {
  INITIAL_SAVED_NOTES,
  VOICE_PROFILES,
  loadSavedState,
  saveState,
} from "./utils/storage";
import {
  blobToDataURL,
  createSyntheticVoiceNote,
  speakBrowserTTS,
  stopBrowserTTS,
} from "./utils/audio";

const DEFAULT_TRIGGER_CONFIG: HardwareTriggerConfig = {
  doubleTapEnabled: true,
  sensitivity: "High",
  sensitivityValue: 80,
  doubleClickThresholdMs: 500,
  singlePowerIntercepted: true,
  volumeDownMuteEnabled: true,
  onlyForContacts: true,
  excludeFavorites: true,
  silenceRingtone: false,
  fadeDurationMs: 400,
};

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = loadSavedState();
    return {
      isActive: saved.isActive ?? true,
      activeTab: saved.activeTab ?? "home",
      activeSource: saved.activeSource ?? "gemini_tts",
      currentScriptText:
        saved.currentScriptText ?? "I am driving, call you back soon!",
      selectedVoice: saved.selectedVoice ?? "aoede",
      savedNotes: saved.savedNotes?.length ? saved.savedNotes : INITIAL_SAVED_NOTES,
      activeNoteId: saved.activeNoteId ?? "note-1",
      triggerConfig: { ...DEFAULT_TRIGGER_CONFIG, ...(saved.triggerConfig || {}) },
      logs: saved.logs?.length
        ? saved.logs
        : [
            {
              id: "log-1",
              callerName: "Priya Sharma (Mom)",
              callerNumber: "+1 (555) 012-3456",
              isContact: true,
              isFavorite: true,
              timestamp: "Today, 08:14 AM",
              triggerUsed: "Double Power Press",
              actionTaken: "Auto-Replied Voice Note",
              responseFilename: "smartcall_native_active.wav",
              durationSec: 2.8,
              status: "handled",
            },
            {
              id: "log-2",
              callerName: "Delivery Agent",
              callerNumber: "+1 (555) 987-6543",
              isContact: false,
              isFavorite: false,
              timestamp: "Yesterday, 05:42 PM",
              triggerUsed: "Volume Down (Muted)",
              actionTaken: "Ringtone Muted",
              responseFilename: "",
              durationSec: 0,
              status: "muted",
            },
          ],
      trialUsageCount: 0,
      isProUnlocked: true,
      showIAPModal: false,
      showSimulateCallModal: false,
      showSettingsMenu: false,
      showAdMobBanner: false,
    };
  });

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Synchronize state with localStorage
  useEffect(() => {
    saveState({
      isActive: state.isActive,
      activeTab: state.activeTab,
      activeSource: state.activeSource,
      currentScriptText: state.currentScriptText,
      selectedVoice: state.selectedVoice,
      savedNotes: state.savedNotes,
      activeNoteId: state.activeNoteId,
      triggerConfig: state.triggerConfig,
      logs: state.logs,
      trialUsageCount: state.trialUsageCount,
      isProUnlocked: state.isProUnlocked,
    });
  }, [state]);

  // Ensure initial notes have valid audio URLs on first mount
  useEffect(() => {
    const ensureAudioUrls = async () => {
      let changed = false;
      const updatedNotes = await Promise.all(
        state.savedNotes.map(async (note) => {
          if (!note.audioUrl) {
            changed = true;
            const { blob } = createSyntheticVoiceNote(note.text);
            const dataUrl = await blobToDataURL(blob);
            return { ...note, audioUrl: dataUrl };
          }
          return note;
        })
      );

      if (changed) {
        setState((prev) => ({ ...prev, savedNotes: updatedNotes }));
      }
    };

    ensureAudioUrls();
  }, []);

  // Stop currently playing audio or speech synthesis
  const stopAudio = () => {
    stopBrowserTTS();
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    setIsPlayingAudio(false);
    setPlayingNoteId(null);
  };

  // Play a specific voice note (prioritizes Web Speech Synthesis for TTS responses)
  const playAudioNote = (note: SavedVoiceNote) => {
    stopAudio();

    // For TTS voice responses or text-based notes, speak using standard Browser Web Speech Synthesis
    if (note.source === "gemini_tts" || (!note.audioUrl && note.text)) {
      const textToSpeak =
        note.text?.trim() || "I am currently driving and will get back to you soon.";

      setIsPlayingAudio(true);
      setPlayingNoteId(note.id);

      const spoken = speakBrowserTTS(textToSpeak, {
        onStart: () => {
          setIsPlayingAudio(true);
          setPlayingNoteId(note.id);
        },
        onEnd: () => {
          setIsPlayingAudio(false);
          setPlayingNoteId(null);
        },
        onError: () => {
          setIsPlayingAudio(false);
          setPlayingNoteId(null);
        },
      });

      if (spoken) return;
    }

    // For recorded or uploaded audio files, play via HTML5 Audio element
    if (note.audioUrl) {
      try {
        const audio = new Audio(note.audioUrl);
        currentAudioRef.current = audio;
        setIsPlayingAudio(true);
        setPlayingNoteId(note.id);

        audio.onended = () => {
          setIsPlayingAudio(false);
          setPlayingNoteId(null);
          currentAudioRef.current = null;
        };

        audio.onerror = () => {
          // Graceful fallback to speech synthesis if audio playback fails
          if (note.text) {
            speakBrowserTTS(note.text, {
              onEnd: () => {
                setIsPlayingAudio(false);
                setPlayingNoteId(null);
              },
              onError: () => {
                setIsPlayingAudio(false);
                setPlayingNoteId(null);
              },
            });
          } else {
            setIsPlayingAudio(false);
            setPlayingNoteId(null);
            currentAudioRef.current = null;
          }
        };

        audio.play().catch((err) => {
          console.warn("Audio element playback notice, fallback to browser speech:", err);
          if (note.text) {
            speakBrowserTTS(note.text, {
              onEnd: () => {
                setIsPlayingAudio(false);
                setPlayingNoteId(null);
              },
              onError: () => {
                setIsPlayingAudio(false);
                setPlayingNoteId(null);
              },
            });
          } else {
            setIsPlayingAudio(false);
            setPlayingNoteId(null);
          }
        });
      } catch (e) {
        console.warn("Audio initialization notice:", e);
        if (note.text) {
          speakBrowserTTS(note.text, {
            onEnd: () => {
              setIsPlayingAudio(false);
              setPlayingNoteId(null);
            },
            onError: () => {
              setIsPlayingAudio(false);
              setPlayingNoteId(null);
            },
          });
        } else {
          setIsPlayingAudio(false);
          setPlayingNoteId(null);
        }
      }
    } else if (note.text) {
      setIsPlayingAudio(true);
      setPlayingNoteId(note.id);
      speakBrowserTTS(note.text, {
        onEnd: () => {
          setIsPlayingAudio(false);
          setPlayingNoteId(null);
        },
        onError: () => {
          setIsPlayingAudio(false);
          setPlayingNoteId(null);
        },
      });
    }
  };

  // Play currently active voice response or speak the current script text immediately
  const playActiveAudio = () => {
    if (isPlayingAudio) {
      stopAudio();
      return;
    }

    // Immediately speak out the text in the script box with female voice
    const textToSpeak =
      state.currentScriptText.trim() ||
      state.savedNotes.find((n) => n.id === state.activeNoteId)?.text ||
      "I am currently driving and will get back to you soon.";

    setIsPlayingAudio(true);
    setPlayingNoteId(state.activeNoteId);

    const spoken = speakBrowserTTS(textToSpeak, {
      onStart: () => {
        setIsPlayingAudio(true);
        setPlayingNoteId(state.activeNoteId);
      },
      onEnd: () => {
        setIsPlayingAudio(false);
        setPlayingNoteId(null);
      },
      onError: () => {
        setIsPlayingAudio(false);
        setPlayingNoteId(null);
      },
    });

    if (!spoken) {
      const activeNote =
        state.savedNotes.find((n) => n.id === state.activeNoteId) ||
        state.savedNotes[0];
      if (activeNote) {
        playAudioNote(activeNote);
      }
    }
  };

  // Generate Audio: immediately speaks out script text with female voice and saves active note
  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    stopAudio();

    const scriptText =
      state.currentScriptText.trim() ||
      "I am currently driving and will get back to you soon.";
    const selectedVoiceId = state.selectedVoice || "aoede";

    try {
      // Calculate realistic spoken duration (~140-160 words/minute)
      const wordCount = scriptText.split(/\s+/).filter(Boolean).length;
      const durationSec = Math.max(
        2.0,
        Math.min(12.0, Number((wordCount / 2.5).toFixed(1)))
      );

      // Generate local WAV representation so note has a valid audioUrl asset
      const synth = createSyntheticVoiceNote(scriptText);
      const dataUrl = await blobToDataURL(synth.blob);

      // Update or create active note
      const activeFilename = "smartcall_native_active.wav";
      const existingIndex = state.savedNotes.findIndex(
        (n) => n.id === state.activeNoteId || n.filename === activeFilename
      );

      let updatedNotes = [...state.savedNotes];
      let targetId = state.activeNoteId;

      if (existingIndex >= 0) {
        updatedNotes[existingIndex] = {
          ...updatedNotes[existingIndex],
          text: scriptText,
          audioUrl: dataUrl,
          durationSec,
          voiceProfile: selectedVoiceId,
          createdAt: "Just now",
        };
        targetId = updatedNotes[existingIndex].id;
      } else {
        const newNote: SavedVoiceNote = {
          id: `note-${Date.now()}`,
          title: "SmartCall Female Voice Response",
          filename: activeFilename,
          text: scriptText,
          source: "gemini_tts",
          durationSec,
          audioUrl: dataUrl,
          createdAt: "Just now",
          isDefault: true,
          voiceProfile: selectedVoiceId,
        };
        updatedNotes = [newNote, ...updatedNotes];
        targetId = newNote.id;
      }

      setState((prev) => ({
        ...prev,
        savedNotes: updatedNotes,
        activeNoteId: targetId,
        trialUsageCount: 0,
        isProUnlocked: true,
      }));

      // Immediately speak out the text in the script box with standard Browser Web Speech Synthesis (female voice)
      setIsPlayingAudio(true);
      setPlayingNoteId(targetId);

      speakBrowserTTS(scriptText, {
        onStart: () => {
          setIsPlayingAudio(true);
          setPlayingNoteId(targetId);
        },
        onEnd: () => {
          setIsPlayingAudio(false);
          setPlayingNoteId(null);
        },
        onError: () => {
          setIsPlayingAudio(false);
          setPlayingNoteId(null);
        },
      });
    } catch (err) {
      console.warn("Audio generation notice:", err);
      setIsPlayingAudio(false);
      setPlayingNoteId(null);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Set active default note
  const handleSetDefaultNote = (noteId: string) => {
    setState((prev) => ({
      ...prev,
      activeNoteId: noteId,
      savedNotes: prev.savedNotes.map((n) => ({
        ...n,
        isDefault: n.id === noteId,
      })),
    }));
  };

  // Save new note from recorder or file upload
  const handleSaveNewNote = (noteData: Omit<SavedVoiceNote, "id" | "createdAt">) => {
    const newNote: SavedVoiceNote = {
      ...noteData,
      id: `note-${Date.now()}`,
      createdAt: "Just now",
    };

    setState((prev) => {
      const updated = noteData.isDefault
        ? prev.savedNotes.map((n) => ({ ...n, isDefault: false }))
        : prev.savedNotes;

      return {
        ...prev,
        savedNotes: [newNote, ...updated],
        activeNoteId: noteData.isDefault ? newNote.id : prev.activeNoteId,
        activeSource: noteData.source,
      };
    });

    playAudioNote(newNote);
  };

  // Delete note
  const handleDeleteNote = (noteId: string) => {
    setState((prev) => {
      const remaining = prev.savedNotes.filter((n) => n.id !== noteId);
      return {
        ...prev,
        savedNotes: remaining,
        activeNoteId:
          prev.activeNoteId === noteId
            ? remaining[0]?.id || ""
            : prev.activeNoteId,
      };
    });
  };

  // Handle call event from simulator
  const handleCallHandled = (
    trigger: "Double Power Press" | "Double-Tap Gesture" | "Volume Down (Muted)" | "Single Power (Mute Blocked)",
    action: "Auto-Replied Voice Note" | "Ringtone Muted" | "Ringtone Kept Ringing",
    callerName: string,
    callerNumber: string
  ) => {
    const activeNote =
      state.savedNotes.find((n) => n.id === state.activeNoteId) ||
      state.savedNotes[0];

    const newLog: CallInterceptLog = {
      id: `log-${Date.now()}`,
      callerName,
      callerNumber,
      isContact: true,
      isFavorite: false,
      timestamp: "Just now",
      triggerUsed: trigger,
      actionTaken: action,
      responseFilename: action === "Auto-Replied Voice Note" ? activeNote.filename : "",
      durationSec: action === "Auto-Replied Voice Note" ? activeNote.durationSec : 0,
      status: action === "Auto-Replied Voice Note" ? "handled" : action === "Ringtone Muted" ? "muted" : "ignored",
    };

    setState((prev) => ({
      ...prev,
      logs: [newLog, ...prev.logs],
      trialUsageCount: 0,
      isProUnlocked: true,
    }));
  };

  // Reset demo state
  const handleResetData = () => {
    localStorage.removeItem("smartcall_app_state_v1");
    setState((prev) => ({
      ...prev,
      isActive: true,
      currentScriptText: "I am driving, call you back soon!",
      selectedVoice: "aoede",
      savedNotes: INITIAL_SAVED_NOTES,
      activeNoteId: "note-1",
      triggerConfig: DEFAULT_TRIGGER_CONFIG,
      trialUsageCount: 0,
      isProUnlocked: true,
      logs: [],
    }));
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-white relative">
      {/* Frosted Glass Ambient Glowing Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-[#6366F1] rounded-full blur-[140px] opacity-20" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-[#10B981] rounded-full blur-[140px] opacity-15" />
        <div className="absolute top-[40%] right-[15%] w-[30%] h-[30%] bg-[#6366F1] rounded-full blur-[150px] opacity-15" />
      </div>

      {/* Top App Bar */}
      <Header
        isPro={state.isProUnlocked}
        onOpenPro={() => setState((prev) => ({ ...prev, showIAPModal: true }))}
        onOpenSettings={() =>
          setState((prev) => ({ ...prev, showSettingsMenu: true }))
        }
        onSimulateCall={() =>
          setState((prev) => ({ ...prev, showSimulateCallModal: true }))
        }
        activeTab={state.activeTab}
      />

      {/* Main View Router */}
      <div className="flex-1 relative z-10">
        {state.activeTab === "home" && (
          <HomeScreen
            state={state}
            onToggleActive={() =>
              setState((prev) => ({ ...prev, isActive: !prev.isActive }))
            }
            onOpenAudioSettings={() =>
              setState((prev) => ({ ...prev, activeTab: "audio" }))
            }
            onOpenTriggerConfig={() =>
              setState((prev) => ({ ...prev, activeTab: "triggers" }))
            }
            onOpenPro={() =>
              setState((prev) => ({ ...prev, showIAPModal: true }))
            }
            onSimulateCall={() =>
              setState((prev) => ({ ...prev, showSimulateCallModal: true }))
            }
            onSelectSource={(src) =>
              setState((prev) => ({ ...prev, activeSource: src }))
            }
            onPlayActiveAudio={playActiveAudio}
            isPlayingAudio={isPlayingAudio}
            onUpdateScript={(txt) =>
              setState((prev) => ({ ...prev, currentScriptText: txt }))
            }
            onGenerateAudio={handleGenerateAudio}
            isGeneratingAudio={isGeneratingAudio}
          />
        )}

        {state.activeTab === "audio" && (
          <AudioSettingsScreen
            state={state}
            onUpdateScript={(txt) =>
              setState((prev) => ({ ...prev, currentScriptText: txt }))
            }
            onSelectVoice={(vId) =>
              setState((prev) => ({ ...prev, selectedVoice: vId }))
            }
            onGenerateAudio={handleGenerateAudio}
            isGeneratingAudio={isGeneratingAudio}
            onPlayAudioNote={playAudioNote}
            onStopAudio={stopAudio}
            onPlayActiveAudio={playActiveAudio}
            isPlayingAudio={isPlayingAudio}
            playingNoteId={playingNoteId}
            onSetDefaultNote={handleSetDefaultNote}
            onSaveNewNote={handleSaveNewNote}
            onDeleteNote={handleDeleteNote}
          />
        )}

        {state.activeTab === "triggers" && (
          <TriggerConfigScreen
            state={state}
            onUpdateConfig={(cfg) =>
              setState((prev) => ({
                ...prev,
                triggerConfig: { ...prev.triggerConfig, ...cfg },
              }))
            }
            onSimulateCall={() =>
              setState((prev) => ({ ...prev, showSimulateCallModal: true }))
            }
          />
        )}

        {state.activeTab === "analytics" && (
          <AnalyticsScreen
            state={state}
            onClearLogs={() => setState((prev) => ({ ...prev, logs: [] }))}
            onSimulateCall={() =>
              setState((prev) => ({ ...prev, showSimulateCallModal: true }))
            }
          />
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={state.activeTab}
        onChangeTab={(tab) => setState((prev) => ({ ...prev, activeTab: tab }))}
      />

      {/* Modals & Overlays */}
      <IncomingCallSimulatorModal
        isOpen={state.showSimulateCallModal}
        onClose={() =>
          setState((prev) => ({ ...prev, showSimulateCallModal: false }))
        }
        state={state}
        onCallHandled={handleCallHandled}
        onPlayActiveAudio={playActiveAudio}
        onStopAudio={stopAudio}
      />

      <IAPModal
        isOpen={state.showIAPModal}
        onClose={() => setState((prev) => ({ ...prev, showIAPModal: false }))}
        isPro={state.isProUnlocked}
        onUnlockPro={() =>
          setState((prev) => ({ ...prev, isProUnlocked: true }))
        }
      />

      <SettingsModal
        isOpen={state.showSettingsMenu}
        onClose={() =>
          setState((prev) => ({ ...prev, showSettingsMenu: false }))
        }
        state={state}
        onUpdateConfig={(cfg) =>
          setState((prev) => ({
            ...prev,
            triggerConfig: { ...prev.triggerConfig, ...cfg },
          }))
        }
        onResetData={handleResetData}
      />
    </div>
  );
}
