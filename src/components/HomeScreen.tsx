import React, { useState } from "react";
import {
  Power,
  Volume2,
  Mic,
  FolderOpen,
  CheckCircle2,
  Play,
  Square,
  Sparkles,
  PhoneCall,
  Lock,
  ArrowRight,
} from "lucide-react";
import { AppState, SavedVoiceNote } from "../types";

interface HomeScreenProps {
  state: AppState;
  onToggleActive: () => void;
  onOpenAudioSettings: () => void;
  onOpenTriggerConfig: () => void;
  onOpenPro: () => void;
  onSimulateCall: () => void;
  onSelectSource: (source: "gemini_tts" | "voice_recorder" | "local_upload") => void;
  onPlayActiveAudio: () => void;
  isPlayingAudio: boolean;
  onUpdateScript: (text: string) => void;
  onGenerateAudio: () => Promise<void>;
  isGeneratingAudio: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  state,
  onToggleActive,
  onOpenAudioSettings,
  onOpenTriggerConfig,
  onOpenPro,
  onSimulateCall,
  onSelectSource,
  onPlayActiveAudio,
  isPlayingAudio,
  onUpdateScript,
  onGenerateAudio,
  isGeneratingAudio,
}) => {
  const [isEditingText, setIsEditingText] = useState(false);
  const activeNote = state.savedNotes.find((n) => n.id === state.activeNoteId) || state.savedNotes[0];

  return (
    <main className="pt-20 pb-28 px-4 sm:px-6 flex flex-col gap-6 max-w-xl mx-auto w-full">
      {/* Hero Section: Interactive 3D Power Button & Status */}
      <section className="flex flex-col items-center justify-center py-4 text-center">
        <div
          onClick={onToggleActive}
          className="relative w-44 h-44 sm:w-48 sm:h-48 mb-5 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 select-none group"
          role="button"
          tabIndex={0}
          title={state.isActive ? "Click to disable Driving Mode" : "Click to activate Driving Mode"}
        >
          {/* Outer Glowing Ring */}
          <div
            className={`absolute inset-0 rounded-full border-4 transition-all duration-500 ${
              state.isActive
                ? "border-indigo-500 neon-glow animate-pulse"
                : "border-slate-700/40 shadow-none opacity-60"
            }`}
          />

          {/* 3D Button Core with Frosted Glass Effect */}
          <div
            className={`absolute inset-2 rounded-full glass-panel flex flex-col items-center justify-center transition-all duration-300 ${
              state.isActive
                ? "bg-slate-800/60 shadow-inner shadow-indigo-500/25 border border-indigo-500/40"
                : "bg-slate-900/60 shadow-none border border-slate-700/50"
            }`}
          >
            <Power
              className={`w-14 h-14 sm:w-16 sm:h-16 transition-all duration-300 ${
                state.isActive
                  ? "text-indigo-400 drop-shadow-[0_0_18px_rgba(99,102,241,0.85)]"
                  : "text-slate-600"
              }`}
            />
            <span className="text-[10px] uppercase font-bold tracking-wider mt-1 text-slate-400 group-hover:text-indigo-400 transition-colors">
              {state.isActive ? "Tap to Stop" : "Tap to Arm"}
            </span>
          </div>
        </div>

        <h1
          className={`text-2xl sm:text-3xl font-bold tracking-tight mb-1 transition-all ${
            state.isActive
              ? "text-indigo-300 neon-text-glow"
              : "text-slate-400"
          }`}
        >
          {state.isActive ? "ACTIVE (Driving Mode)" : "STANDBY (Idle Mode)"}
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          {state.isActive
            ? "Ready to auto-reply via Double-Tap"
            : "Hardware button interception is paused"}
        </p>

        {/* Quick Incoming Call Trigger Banner */}
        <div className="mt-4 w-full flex items-center justify-center">
          <button
            onClick={onSimulateCall}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-500/20 via-indigo-500/10 to-transparent border border-indigo-500/40 hover:border-indigo-400 text-white shadow-[0_4px_20px_rgba(99,102,241,0.2)] transition-all active:scale-[0.99] group backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <PhoneCall className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                  Simulate Incoming Call
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-normal">
                    Interactive
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Test Single Power, Double Power, or Vol Down mute
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Response Configuration Section */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
            Response Configuration
          </h2>
          <button
            onClick={onOpenAudioSettings}
            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 transition-colors"
          >
            Manage Studio
          </button>
        </div>

        {/* Card 1: Google AI Aoede Voice (Active Card) */}
        <div
          className={`rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 relative overflow-hidden transition-all duration-300 ${
            state.activeSource === "gemini_tts"
              ? "glass-panel-active"
              : "glass-panel hover:border-slate-600/70 cursor-pointer"
          }`}
          onClick={() => onSelectSource("gemini_tts")}
        >
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <span>Google AI Aoede (Speaker 1)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 font-semibold">
                    Default Engine
                  </span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  Google AI Studio Voice Artist • Offline WAV
                </span>
              </div>
            </div>
            {state.activeSource === "gemini_tts" && (
              <CheckCircle2 className="w-5 h-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            )}
          </div>

          {/* Auto-reply input / preview area */}
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/70 flex flex-col gap-1.5 focus-within:border-indigo-500/60 transition-colors shadow-inner">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Auto-Reply Script</span>
              <span className="text-indigo-400 font-mono">{state.currentScriptText.length} chars</span>
            </div>
            <textarea
              rows={2}
              className="w-full bg-transparent border-none text-slate-100 text-sm focus:ring-0 p-0 resize-none placeholder-slate-500"
              value={state.currentScriptText}
              onChange={(e) => onUpdateScript(e.target.value)}
              placeholder="e.g. I am driving, call you back soon!"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Controls: Generate Audio & Preview Playback */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayActiveAudio();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-xs font-semibold transition-all active:scale-95"
              >
                {isPlayingAudio ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current text-indigo-400" />
                    <span>Stop Preview</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current text-indigo-400" />
                    <span>Listen Preview</span>
                  </>
                )}
              </button>
              <span className="text-[11px] text-slate-400 font-mono">
                {activeNote.filename || "smartcall_native_active.wav"}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateAudio();
              }}
              disabled={isGeneratingAudio}
              className="bg-[#6366F1] hover:brightness-110 text-white font-bold text-xs py-2 px-4 rounded-xl active:scale-95 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.35)] disabled:opacity-50 flex items-center gap-1.5"
            >
              {isGeneratingAudio ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Audio</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 2: In-App Voice Recorder */}
        <div
          onClick={() => {
            onSelectSource("voice_recorder");
            onOpenAudioSettings();
          }}
          className={`rounded-2xl p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-all duration-200 ${
            state.activeSource === "voice_recorder"
              ? "glass-panel-active"
              : "glass-panel hover:bg-slate-800/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-center text-slate-300">
              <Mic className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-medium text-slate-100">
                In-App Voice Recorder
              </h3>
              <p className="text-xs text-slate-400">Record your own voice response</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Animated frequency waveform indicator */}
            <div className="w-16 h-6 flex items-center justify-center gap-1">
              <div className="w-1 h-3 bg-indigo-400 rounded-full animate-pulse" />
              <div className="w-1 h-5 bg-indigo-400 rounded-full animate-pulse delay-75" />
              <div className="w-1 h-2 bg-indigo-400 rounded-full animate-pulse delay-150" />
              <div className="w-1 h-4 bg-indigo-400 rounded-full animate-pulse delay-200" />
              <div className="w-1 h-3 bg-indigo-400 rounded-full animate-pulse delay-300" />
            </div>
            {state.activeSource === "voice_recorder" && (
              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
            )}
          </div>
        </div>

        {/* Card 3: Local MP3/WAV Upload */}
        <div
          onClick={() => {
            onSelectSource("local_upload");
            onOpenAudioSettings();
          }}
          className={`rounded-2xl p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-all duration-200 ${
            state.activeSource === "local_upload"
              ? "glass-panel-active"
              : "glass-panel hover:bg-slate-800/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-center text-slate-300">
              <FolderOpen className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-medium text-slate-100">
                Local MP3/WAV Upload
              </h3>
              <p className="text-xs text-slate-400">Import pre-recorded audio file</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-indigo-400 text-xs font-semibold tracking-wider uppercase hover:underline">
              Choose File
            </span>
            {state.activeSource === "local_upload" && (
              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
            )}
          </div>
        </div>
      </section>

      {/* Bottom Status Widget: Unrestricted Full Testing Mode */}
      <section className="flex flex-col gap-3.5 mt-2">
        <div className="glass-panel bg-slate-800/35 rounded-2xl p-4 sm:p-5 flex items-center justify-between border border-slate-700/60">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Full Testing Mode Active
            </span>
            <span className="text-base font-semibold text-slate-200 mt-0.5">
              Unlimited Voice Generation • All Features Unlocked
            </span>
            <span className="text-xs text-slate-400 mt-0.5">
              Default TTS engine set to Google AI Studio Aoede (Speaker 1). Trial limits removed.
            </span>
          </div>

          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-700/50"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                className="text-emerald-400"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray="100, 100"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-sm font-bold text-emerald-400">
              ∞
            </span>
          </div>
        </div>
      </section>
    </main>
  );
};
