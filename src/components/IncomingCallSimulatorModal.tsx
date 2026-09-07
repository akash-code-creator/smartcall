import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Power,
  Shield,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Radio,
} from "lucide-react";
import { AppState, SavedVoiceNote } from "../types";
import { RingtonePlayer } from "../utils/audio";

interface IncomingCallSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onCallHandled: (
    trigger: "Double Power Press" | "Double-Tap Gesture" | "Volume Down (Muted)" | "Single Power (Mute Blocked)",
    action: "Auto-Replied Voice Note" | "Ringtone Muted" | "Ringtone Kept Ringing",
    callerName: string,
    callerNumber: string
  ) => void;
  onPlayActiveAudio: () => void;
  onStopAudio?: () => void;
}

export const IncomingCallSimulatorModal: React.FC<IncomingCallSimulatorModalProps> = ({
  isOpen,
  onClose,
  state,
  onCallHandled,
  onPlayActiveAudio,
  onStopAudio,
}) => {
  const [callState, setCallState] = useState<"ringing" | "answering_ai" | "call_ended">("ringing");
  const [powerClicks, setPowerClicks] = useState(0);
  const [lastPowerClickTime, setLastPowerClickTime] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>("Incoming call ringing...");
  const [statusType, setStatusType] = useState<"info" | "warning" | "success">("info");
  const [isRingtoneMuted, setIsRingtoneMuted] = useState(false);
  const [speechTimer, setSpeechTimer] = useState(0);

  const ringtonePlayerRef = useRef<RingtonePlayer | null>(null);
  const speechIntervalRef = useRef<any>(null);

  const activeNote = state.savedNotes.find((n) => n.id === state.activeNoteId) || state.savedNotes[0];
  const callerName = "Rahul Verma (Office)";
  const callerNumber = "+1 (555) 019-2834";

  // Start ringtone when modal opens
  useEffect(() => {
    if (isOpen) {
      setCallState("ringing");
      setPowerClicks(0);
      setIsRingtoneMuted(false);
      setStatusMessage("Incoming call ringing... Test hardware buttons on the phone frame or keyboard keys!");
      setStatusType("info");

      const player = new RingtonePlayer();
      ringtonePlayerRef.current = player;
      player.start();
    } else {
      if (ringtonePlayerRef.current) {
        ringtonePlayerRef.current.stop();
        ringtonePlayerRef.current = null;
      }
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
      }
      onStopAudio?.();
    }

    return () => {
      if (ringtonePlayerRef.current) {
        ringtonePlayerRef.current.stop();
        ringtonePlayerRef.current = null;
      }
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
      }
      onStopAudio?.();
    };
  }, [isOpen]);

  // Keyboard shortcut listener: P for Power, V for Vol Down
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "p" || e.key === "P") {
        handlePowerButtonPress();
      } else if (e.key === "v" || e.key === "V" || e.key === "ArrowDown") {
        handleVolumeDownPress();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, lastPowerClickTime, callState]);

  // Handle Power Button Click (Android Native Intercept logic)
  const handlePowerButtonPress = () => {
    if (callState !== "ringing") return;

    const now = Date.now();
    const interval = now - lastPowerClickTime;
    setLastPowerClickTime(now);

    // Double press check (<500ms default)
    if (interval < state.triggerConfig.doubleClickThresholdMs && interval > 60) {
      // 2x Power Click! Primary automated voice response triggered
      triggerAutoVoiceResponse("Double Power Press");
    } else {
      // 1x Power Click: Intercepted & disabled! Mute blocked!
      setPowerClicks((prev) => prev + 1);
      setStatusType("warning");
      setStatusMessage(
        "🛡️ Single Power Press Intercepted! Default Android ringtone mute is BLOCKED by SmartCall service. Ringtone continues playing."
      );
      onCallHandled(
        "Single Power (Mute Blocked)",
        "Ringtone Kept Ringing",
        callerName,
        callerNumber
      );
    }
  };

  // Handle Volume Down Button Press (Smoothly mute ringtone)
  const handleVolumeDownPress = () => {
    if (callState !== "ringing") return;

    setIsRingtoneMuted(true);
    if (ringtonePlayerRef.current) {
      ringtonePlayerRef.current.fadeToMute(0.4);
    }
    setStatusType("info");
    setStatusMessage("🔇 Volume Down Pressed: Ringtone volume smoothly muted to 0dB (SmartCall smooth-mute replacement).");
    onCallHandled(
      "Volume Down (Muted)",
      "Ringtone Muted",
      callerName,
      callerNumber
    );
  };

  // Trigger automated voice response
  const triggerAutoVoiceResponse = (triggerType: "Double Power Press" | "Double-Tap Gesture") => {
    if (callState !== "ringing") return;

    // Stop ringtone
    if (ringtonePlayerRef.current) {
      ringtonePlayerRef.current.stop();
    }

    setCallState("answering_ai");
    setStatusType("success");
    setStatusMessage(
      `⚡ ${triggerType} Detected! Connecting voice line & broadcasting: "${activeNote.filename}"`
    );

    // Play the voice response audio aloud
    onPlayActiveAudio();

    // Start speech countdown
    let count = 0;
    const totalDuration = Math.ceil(activeNote.durationSec || 3.5);
    setSpeechTimer(totalDuration);

    speechIntervalRef.current = setInterval(() => {
      count += 1;
      setSpeechTimer((prev) => Math.max(0, prev - 1));

      if (count >= totalDuration) {
        clearInterval(speechIntervalRef.current);
        setCallState("call_ended");
        setStatusMessage("✅ Voice note completed! Call gracefully terminated and logged.");
        onCallHandled(
          triggerType,
          "Auto-Replied Voice Note",
          callerName,
          callerNumber
        );
      }
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top bar with close */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
            <span className="text-xs font-bold text-indigo-400 tracking-wide uppercase">
              SmartCall Hardware Intercept Simulator
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Device Frame Simulation */}
        <div className="p-4 sm:p-5 flex flex-col items-center gap-4 overflow-y-auto">
          {/* Status Message Banner */}
          <div
            className={`w-full p-3 rounded-xl text-xs font-medium border flex items-start gap-2.5 leading-relaxed transition-all ${
              statusType === "warning"
                ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                : statusType === "success"
                ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-400"
                : "bg-indigo-950/40 border-indigo-500/40 text-indigo-300"
            }`}
          >
            {statusType === "warning" && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />}
            {statusType === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />}
            {statusType === "info" && <Shield className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />}
            <div>{statusMessage}</div>
          </div>

          {/* Phone Canvas with Hardware Buttons on the sides */}
          <div className="relative w-72 sm:w-80 rounded-[36px] bg-slate-950 border-4 border-slate-800 shadow-2xl p-4 flex flex-col items-center justify-between min-h-[380px] overflow-hidden">
            {/* Top Speaker / Camera punch hole */}
            <div className="w-20 h-4 bg-black rounded-full flex items-center justify-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-8 h-1 rounded-full bg-slate-700" />
            </div>

            {/* Left Hardware Buttons: Volume Up & Volume Down */}
            <div className="absolute -left-3.5 top-20 flex flex-col gap-3 z-20">
              <button
                onClick={() => {
                  if (ringtonePlayerRef.current) {
                    ringtonePlayerRef.current.start();
                    setIsRingtoneMuted(false);
                    setStatusMessage("🔊 Volume Up: Ringtone restored.");
                  }
                }}
                className="w-4 h-10 rounded-l-md bg-slate-800 hover:bg-indigo-500 text-[8px] font-bold text-slate-300 hover:text-white flex items-center justify-center shadow-lg transition-colors border-y border-l border-slate-700"
                title="Hardware Volume Up button"
              >
                +
              </button>
              <button
                onClick={handleVolumeDownPress}
                className="w-4 h-12 rounded-l-md bg-slate-800 hover:bg-amber-400 text-[8px] font-bold text-slate-300 hover:text-black flex items-center justify-center shadow-lg transition-colors border-y border-l border-slate-700"
                title="Hardware Volume Down button: Smoothly mute ringtone"
              >
                Vol-
              </button>
            </div>

            {/* Right Hardware Button: POWER BUTTON */}
            <div className="absolute -right-3.5 top-24 z-20">
              <button
                onClick={handlePowerButtonPress}
                className="w-4 h-14 rounded-r-md bg-gradient-to-r from-slate-800 to-indigo-500 text-[8px] font-bold text-white flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.6)] hover:scale-110 active:scale-95 transition-all border-y border-r border-indigo-400"
                title="Hardware Power Button: Click 1x for mute block, 2x for auto-reply"
              >
                <Power className="w-3 h-3 text-white fill-current" />
              </button>
            </div>

            {/* Phone Screen Display */}
            {callState === "ringing" && (
              <div className="w-full flex flex-col items-center justify-center text-center my-auto gap-3 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 border-2 border-indigo-500 flex items-center justify-center text-indigo-400 neon-glow animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                  <Phone className="w-8 h-8 animate-bounce" />
                </div>

                <div>
                  <div className="text-xs uppercase font-semibold tracking-wider text-indigo-400">
                    Incoming Call
                  </div>
                  <h3 className="text-xl font-bold text-white mt-0.5">
                    {callerName}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">
                    {callerNumber}
                  </div>
                </div>

                {isRingtoneMuted && (
                  <div className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/40 flex items-center gap-1">
                    <VolumeX className="w-3 h-3" />
                    <span>Ringtone Muted (Vol Down)</span>
                  </div>
                )}

                {/* Double tap back gesture test directly on phone screen */}
                <button
                  onClick={() => triggerAutoVoiceResponse("Double-Tap Gesture")}
                  className="mt-2 text-[10px] text-slate-400 bg-slate-900/80 hover:bg-indigo-500/20 hover:text-indigo-300 px-3 py-1 rounded-full border border-slate-800 transition-colors"
                >
                  Or Tap Here (Simulate Phone Back Double-Tap)
                </button>
              </div>
            )}

            {callState === "answering_ai" && (
              <div className="w-full flex flex-col items-center justify-center text-center my-auto gap-3 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                  <Sparkles className="w-8 h-8 animate-spin" />
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                    SmartCall Auto-Responding ({speechTimer}s)
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Line Connected: Speaker 1 Voice
                  </h3>
                </div>

                {/* Live speech wave */}
                <div className="h-6 flex items-end gap-1 my-1">
                  <div className="w-1.5 h-3 bg-indigo-400 rounded-full animate-pulse" />
                  <div className="w-1.5 h-6 bg-indigo-400 rounded-full animate-pulse delay-75" />
                  <div className="w-1.5 h-4 bg-indigo-400 rounded-full animate-pulse delay-150" />
                  <div className="w-1.5 h-5 bg-indigo-400 rounded-full animate-pulse delay-200" />
                  <div className="w-1.5 h-3 bg-indigo-400 rounded-full animate-pulse delay-300" />
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-200 italic max-w-[220px]">
                  "{activeNote.text}"
                </div>
              </div>
            )}

            {callState === "call_ended" && (
              <div className="w-full flex flex-col items-center justify-center text-center my-auto gap-3 animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-800">
                  <PhoneOff className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Call Terminated</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Auto-response delivered successfully to caller.
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="mt-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                >
                  Back to Dashboard
                </button>
              </div>
            )}

            {/* Bottom Actions inside Phone Screen */}
            <div className="w-full flex items-center justify-around pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  if (ringtonePlayerRef.current) ringtonePlayerRef.current.stop();
                  setCallState("call_ended");
                  onCallHandled(
                    "Manual Trigger",
                    "Call Declined",
                    callerName,
                    callerNumber
                  );
                }}
                className="w-11 h-11 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg active:scale-95"
                title="Decline Call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>

              <button
                onClick={() => triggerAutoVoiceResponse("Double Power Press")}
                className="w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg neon-glow active:scale-95"
                title="Trigger SmartCall Auto Voice"
              >
                <Sparkles className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>

          {/* Interactive hardware test buttons strip */}
          <div className="w-full flex flex-col gap-2 pt-2 border-t border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Hardware Button Trigger Controls:
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePowerButtonPress}
                className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 hover:border-indigo-400 text-left text-xs transition-all active:scale-95"
              >
                <div className="font-bold text-indigo-300 flex items-center gap-1">
                  <Power className="w-3.5 h-3.5" />
                  <span>Press Power Button</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  1 click = Mute Blocked
                  <br />
                  2 clicks &lt;0.5s = Auto-Reply!
                </div>
              </button>

              <button
                onClick={handleVolumeDownPress}
                className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-left text-xs transition-all active:scale-95"
              >
                <div className="font-bold text-white flex items-center gap-1">
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Press Volume Down</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Smoothly mutes ringtone to 0dB without disconnecting.
                </div>
              </button>
            </div>

            <div className="text-[10px] text-center text-slate-500 font-mono">
              Keyboard shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">P</kbd> for Power, <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">V</kbd> for Vol Down
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
