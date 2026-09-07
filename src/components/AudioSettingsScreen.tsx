import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Mic,
  FolderOpen,
  Play,
  Square,
  Save,
  CheckCircle2,
  Trash2,
  Download,
  Clock,
  Radio,
  Volume2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { AppState, SavedVoiceNote, VoiceProfile } from "../types";
import { VOICE_PROFILES } from "../utils/storage";
import { encodeWAV, blobToDataURL, createSyntheticVoiceNote } from "../utils/audio";

interface AudioSettingsScreenProps {
  state: AppState;
  onUpdateScript: (text: string) => void;
  onSelectVoice: (voiceId: string) => void;
  onGenerateAudio: () => Promise<void>;
  isGeneratingAudio: boolean;
  onPlayAudioNote: (note: SavedVoiceNote) => void;
  onStopAudio: () => void;
  onPlayActiveAudio?: () => void;
  isPlayingAudio: boolean;
  playingNoteId: string | null;
  onSetDefaultNote: (noteId: string) => void;
  onSaveNewNote: (note: Omit<SavedVoiceNote, "id" | "createdAt">) => void;
  onDeleteNote: (noteId: string) => void;
}

const PRESET_SCRIPTS = [
  { label: "Driving", text: "I am currently driving and will get back to you soon." },
  { label: "Urgent WhatsApp", text: "Namaste! Main driving kar raha hu, urgent ho toh WhatsApp karein." },
  { label: "Meeting", text: "I am in an important client meeting right now. Please text if urgent." },
  { label: "Sleeping / Off-Hours", text: "I am currently resting and unavailable. Your call has been logged." },
  { label: "Doctor / Busy", text: "I cannot take calls right now. Please leave a brief message on SMS." },
];

export const AudioSettingsScreen: React.FC<AudioSettingsScreenProps> = ({
  state,
  onUpdateScript,
  onSelectVoice,
  onGenerateAudio,
  isGeneratingAudio,
  onPlayAudioNote,
  onStopAudio,
  onPlayActiveAudio,
  isPlayingAudio,
  playingNoteId,
  onSetDefaultNote,
  onSaveNewNote,
  onDeleteNote,
}) => {
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle Voice Recording start with robust error handling and browser checks
  const startRecording = async () => {
    setRecordingError(null);
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setRecordingSeconds(0);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Microphone API not supported on this browser or iframe container.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const dataUrl = await blobToDataURL(rawBlob);
        setRecordedAudioBlob(rawBlob);
        setRecordedAudioUrl(dataUrl);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Microphone access status:", err?.name, err?.message);
      const isPermissionIssue =
        err?.name === "NotAllowedError" ||
        err?.message?.toLowerCase().includes("permission") ||
        err?.message?.toLowerCase().includes("dismissed") ||
        err?.message?.toLowerCase().includes("denied");

      setRecordingError(
        isPermissionIssue
          ? "Microphone access was dismissed or denied in browser permissions. Please allow microphone access or generate a studio sample recording below."
          : (err?.message || "Could not access microphone on this device.")
      );
    }
  };

  // Generate sample voice recording as a seamless zero-mic fallback
  const generateSampleVoiceRecording = async () => {
    setRecordingError(null);
    const synth = createSyntheticVoiceNote(
      "Hello, I am driving right now and cannot answer. I will call you back soon!"
    );
    const dataUrl = await blobToDataURL(synth.blob);
    setRecordedAudioBlob(synth.blob);
    setRecordedAudioUrl(dataUrl);
    setRecordingSeconds(Math.round(synth.durationSec));
  };

  // Stop Voice Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Save recorded audio as note
  const saveRecordedNote = () => {
    if (!recordedAudioUrl) return;
    const filename = `smartcall_rec_${Date.now().toString().slice(-4)}.wav`;
    onSaveNewNote({
      title: `Voice Note (${recordingSeconds}s)`,
      filename,
      text: "Custom In-App Voice Recording",
      source: "voice_recorder",
      durationSec: Math.max(1, recordingSeconds),
      audioUrl: recordedAudioUrl,
      isDefault: true,
    });
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setRecordingSeconds(0);
  };

  // Handle local file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const dataUrl = await blobToDataURL(file);
    const sanitizedName = file.name.replace(/\.[^/.]+$/, "") + ".wav";

    onSaveNewNote({
      title: file.name,
      filename: sanitizedName,
      text: `Imported audio: ${file.name}`,
      source: "local_upload",
      durationSec: 3.5,
      audioUrl: dataUrl,
      isDefault: true,
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <main className="pt-20 pb-28 px-4 sm:px-6 flex flex-col gap-6 max-w-xl mx-auto w-full">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
          Audio Settings
        </h1>
        <p className="text-xs sm:text-sm text-white/60">
          Configure offline voice notes for zero-latency hardware triggers.
        </p>
      </div>

      {/* Section 1: Google AI Aoede (Speaker 1) Voice */}
      <section className="glass-panel rounded-2xl p-5 sm:p-6 flex flex-col gap-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <span>Google AI Aoede (Speaker 1)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                  Default Engine
                </span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Official Google AI Studio TTS Voice Model • Offline .WAV
              </span>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
            Studio Model
          </span>
        </div>

        {/* Voice Profile Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            Voice Artist Profile (Aoede Speaker 1 Default)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {VOICE_PROFILES.map((profile) => (
              <button
                key={profile.id}
                onClick={() => onSelectVoice(profile.id)}
                className={`px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all relative ${
                  state.selectedVoice === profile.id
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-[0_0_12px_rgba(99,102,241,0.25)]"
                    : "bg-slate-900/60 text-slate-300 border border-slate-800 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold truncate">{profile.name}</span>
                  {profile.id === "aoede" && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/30 text-indigo-300 shrink-0 font-bold">
                      DEFAULT
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{profile.gender}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            Quick Script Presets
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_SCRIPTS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => onUpdateScript(preset.text)}
                className="px-3 py-1 rounded-full text-xs bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/70 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Script Text Area */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
            Auto-Reply Text Script
          </label>
          <textarea
            rows={3}
            value={state.currentScriptText}
            onChange={(e) => onUpdateScript(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:shadow-[inset_0_0_12px_rgba(99,102,241,0.2)] transition-all resize-none placeholder-slate-500"
            placeholder="I am currently driving and will get back to you soon."
          />
        </div>

        {/* Action Controls: Listen Preview & Generate Audio */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (isPlayingAudio) {
                onStopAudio();
              } else if (onPlayActiveAudio) {
                onPlayActiveAudio();
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/70 text-slate-200 text-xs font-semibold transition-all active:scale-95"
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

          <button
            type="button"
            onClick={onGenerateAudio}
            disabled={isGeneratingAudio}
            className="bg-[#6366F1] hover:brightness-110 text-white font-bold text-xs rounded-xl py-2.5 px-6 neon-glow active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(99,102,241,0.35)] disabled:opacity-50"
          >
            {isGeneratingAudio ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Synthesizing Voice Note...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Audio</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Section 2: In-App Voice Recorder */}
      <section className="glass-panel rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col items-center gap-3 z-10 w-full text-center">
          {/* Circular Glowing Mic Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-24 h-24 rounded-full border flex flex-col items-center justify-center transition-all duration-300 relative ${
              isRecording
                ? "border-rose-500 bg-rose-500/20 shadow-[0_0_25px_rgba(244,63,94,0.7)] animate-pulse"
                : "border-indigo-500/40 bg-slate-900/80 neon-glow hover:scale-105 active:scale-95"
            }`}
          >
            <Mic
              className={`w-8 h-8 transition-colors ${
                isRecording ? "text-rose-400" : "text-indigo-400"
              }`}
            />
            <span className="text-[10px] font-bold mt-1 uppercase text-slate-400">
              {isRecording ? "Tap to Stop" : "Tap to Mic"}
            </span>
          </button>

          {/* Animated Frequency Waveform Bars */}
          <div className="h-10 flex items-end justify-center gap-1.5 my-1">
            <div
              className={`waveform-bar w-1.5 bg-gradient-to-t from-indigo-700 to-indigo-400 rounded-full transition-all ${
                isRecording ? "h-6 animate-pulse" : "h-3 opacity-40"
              }`}
            />
            <div
              className={`waveform-bar w-1.5 bg-gradient-to-t from-indigo-700 to-indigo-400 rounded-full transition-all ${
                isRecording ? "h-9 animate-pulse delay-75" : "h-6 opacity-40"
              }`}
            />
            <div
              className={`waveform-bar w-1.5 bg-gradient-to-t from-indigo-700 to-indigo-400 rounded-full transition-all ${
                isRecording ? "h-5 animate-pulse delay-150" : "h-4 opacity-40"
              }`}
            />
            <div
              className={`waveform-bar w-1.5 bg-gradient-to-t from-indigo-700 to-indigo-400 rounded-full transition-all ${
                isRecording ? "h-10 animate-pulse delay-200" : "h-7 opacity-40"
              }`}
            />
            <div
              className={`waveform-bar w-1.5 bg-gradient-to-t from-indigo-700 to-indigo-400 rounded-full transition-all ${
                isRecording ? "h-4 animate-pulse delay-300" : "h-2 opacity-40"
              }`}
            />
            <div
              className={`waveform-bar w-1.5 bg-gradient-to-t from-indigo-700 to-indigo-400 rounded-full transition-all ${
                isRecording ? "h-8 animate-pulse delay-75" : "h-5 opacity-40"
              }`}
            />
            <div
              className={`waveform-bar w-1.5 bg-gradient-to-t from-indigo-700 to-indigo-400 rounded-full transition-all ${
                isRecording ? "h-5 animate-pulse delay-150" : "h-3 opacity-40"
              }`}
            />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white">
              {isRecording
                ? `Recording Audio (${recordingSeconds}s)...`
                : "Voice Recorder"}
            </h3>
            <p className="text-xs text-slate-400">
              Record a 3-5 second personalized statement
            </p>
          </div>

          {recordingError && (
            <div className="w-full max-w-md flex flex-col gap-2.5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-left backdrop-blur-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-200">
                  <p className="font-semibold text-rose-200 mb-0.5">Microphone Permission Notice</p>
                  <p className="text-rose-300/90 leading-relaxed text-[11px]">{recordingError}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-800/30">
                <button
                  onClick={startRecording}
                  className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800/70 border border-rose-700/60 text-xs font-semibold text-rose-200 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Mic Access</span>
                </button>
                <button
                  onClick={generateSampleVoiceRecording}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/40 hover:bg-indigo-600/60 border border-indigo-500/50 text-xs font-semibold text-indigo-200 transition-colors flex items-center gap-1.5 shadow-[0_0_10px_rgba(99,102,241,0.25)]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Generate Sample Recording</span>
                </button>
              </div>
            </div>
          )}

          {/* Recording Actions */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            {!isRecording && !recordedAudioUrl && (
              <div className="flex items-center gap-2">
                <button
                  onClick={startRecording}
                  className="bg-slate-900/80 border border-indigo-500/50 text-indigo-400 text-xs font-semibold rounded-full py-2 px-6 hover:bg-indigo-500 hover:text-white transition-all shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                >
                  Start Recording
                </button>
                <button
                  onClick={generateSampleVoiceRecording}
                  title="Generate realistic recording without mic permission"
                  className="bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-semibold rounded-full py-2 px-4 hover:bg-slate-700 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Use Sample</span>
                </button>
              </div>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="bg-rose-500 text-white text-xs font-bold rounded-full py-2 px-6 hover:bg-rose-600 transition-all shadow-[0_0_15px_rgba(244,63,94,0.5)]"
              >
                Stop Recording
              </button>
            )}

            {recordedAudioUrl && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const audio = new Audio(recordedAudioUrl);
                    audio.play();
                  }}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 border border-slate-700"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-indigo-400" />
                  <span>Review ({recordingSeconds}s)</span>
                </button>
                <button
                  onClick={saveRecordedNote}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save as Default .WAV</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section 3: Local File Upload */}
      <section
        onClick={() => fileInputRef.current?.click()}
        className="glass-panel rounded-2xl p-6 border border-dashed border-slate-700/80 hover:border-indigo-500/60 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group select-none"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
          <FolderOpen className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 transition-colors" />
        </div>
        <div className="text-center">
          <h3 className="text-sm sm:text-base font-semibold text-white">
            Local File Upload
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload MP3/WAV from phone storage
          </p>
        </div>
        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider group-hover:underline">
          Browse Device Audio
        </span>
      </section>

      {/* Section 4: Saved Response Library */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-indigo-400" />
            Saved Responses Library
          </h3>
          <span className="text-xs text-slate-400 font-mono">/smartcall/responses/</span>
        </div>

        <div className="flex flex-col gap-2.5">
          {state.savedNotes.map((note) => {
            const isPlayingThis = isPlayingAudio && playingNoteId === note.id;
            const isDefault = note.isDefault || note.id === state.activeNoteId;

            return (
              <div
                key={note.id}
                className={`p-4 rounded-2xl flex items-center justify-between gap-3 transition-all ${
                  isDefault
                    ? "glass-panel-active"
                    : "glass-panel hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => {
                      if (isPlayingThis) {
                        onStopAudio();
                      } else {
                        onPlayAudioNote(note);
                      }
                    }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      isPlayingThis
                        ? "bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                        : "bg-slate-800/80 text-slate-200 hover:bg-slate-700 border border-slate-700/60"
                    }`}
                  >
                    {isPlayingThis ? (
                      <Square className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate">
                        {note.title}
                      </span>
                      {isDefault && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shrink-0">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      "{note.text}"
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                      <span>{note.filename}</span>
                      <span>•</span>
                      <span>{note.durationSec}s</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isDefault && (
                    <button
                      onClick={() => onSetDefaultNote(note.id)}
                      className="text-xs text-slate-400 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
                      title="Set as active response"
                    >
                      Set Active
                    </button>
                  )}

                  {note.audioUrl && (
                    <a
                      href={note.audioUrl}
                      download={note.filename}
                      className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
                      title="Download .wav file"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}

                  {state.savedNotes.length > 1 && (
                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};
