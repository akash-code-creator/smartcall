import React, { useState } from "react";
import {
  HelpCircle,
  Contact,
  Star,
  VolumeX,
  Info,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  Zap,
} from "lucide-react";
import { AppState, HardwareTriggerConfig } from "../types";

interface TriggerConfigScreenProps {
  state: AppState;
  onUpdateConfig: (config: Partial<HardwareTriggerConfig>) => void;
  onSimulateCall: () => void;
}

export const TriggerConfigScreen: React.FC<TriggerConfigScreenProps> = ({
  state,
  onUpdateConfig,
  onSimulateCall,
}) => {
  const { triggerConfig } = state;
  const [tapCount, setTapCount] = useState(0);
  const [tapFeedback, setTapFeedback] = useState<string | null>(null);
  const [lastTapTime, setLastTapTime] = useState<number>(0);

  // Interactive phone back tap tester
  const handlePhoneBackTap = () => {
    const now = Date.now();
    const diff = now - lastTapTime;
    setLastTapTime(now);

    if (diff < triggerConfig.doubleClickThresholdMs && diff > 50) {
      setTapCount((prev) => prev + 1);
      setTapFeedback("⚡ Double-Tap Intercept Detected! AI Auto-Reply Triggered!");
      setTimeout(() => setTapFeedback(null), 3000);
    } else {
      setTapFeedback("Tap registered... tap again quickly to test double-tap");
      setTimeout(() => setTapFeedback(null), 1500);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    let level: "Low" | "Medium" | "High" = "Medium";
    if (val < 35) level = "Low";
    else if (val < 70) level = "Medium";
    else level = "High";

    onUpdateConfig({
      sensitivityValue: val,
      sensitivity: level,
    });
  };

  return (
    <main className="pt-20 pb-28 px-4 sm:px-6 flex flex-col gap-6 max-w-xl mx-auto w-full">
      {/* Page Title */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
            Trigger Configuration
          </h1>
          <button
            onClick={onSimulateCall}
            className="text-xs text-indigo-400 font-semibold flex items-center gap-1 hover:underline hover:text-indigo-300 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Test Triggers</span>
          </button>
        </div>
        <p className="text-xs sm:text-sm text-slate-400">
          Customize how AI answers your calls and hardware button behavior.
        </p>
      </div>

      {/* Double-Tap Gesture Card */}
      <section className="glass-panel-active rounded-2xl p-5 sm:p-6 flex flex-col gap-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none rounded-2xl" />

        <div className="flex justify-between items-start relative z-10">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Double-Tap Gesture
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Activate AI by tapping back of phone.
            </p>
          </div>

          {/* Toggle Switch */}
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={triggerConfig.doubleTapEnabled}
              onChange={(e) =>
                onUpdateConfig({ doubleTapEnabled: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:border-indigo-500 border border-slate-700" />
          </label>
        </div>

        {/* Interactive Illustration Area */}
        <div
          onClick={handlePhoneBackTap}
          className="h-44 sm:h-48 w-full bg-slate-900/60 rounded-2xl flex flex-col items-center justify-center relative z-10 border border-slate-800 my-1 cursor-pointer group hover:bg-slate-900/80 transition-colors"
          title="Click the phone back to test Double-Tap sensitivity"
        >
          {/* Abstract phone back illustration */}
          <div className="w-24 h-36 border-2 border-slate-700 rounded-[20px] relative flex items-center justify-center bg-slate-950 shadow-2xl group-hover:scale-105 transition-transform">
            {/* Camera bump */}
            <div className="absolute top-2.5 left-2.5 w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center border border-slate-700">
              <div className="w-3 h-3 rounded-full bg-black border border-slate-700" />
            </div>

            {/* Tap target indicator */}
            <div className="w-12 h-12 rounded-full border border-indigo-500/50 flex items-center justify-center animate-pulse">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 neon-text-glow shadow-[0_0_10px_#6366F1]" />
            </div>
          </div>

          <span className="text-[10px] text-slate-400 mt-2 font-mono group-hover:text-indigo-400 transition-colors">
            Tap the phone back to test double-tap gesture
          </span>

          {tapFeedback && (
            <div className="absolute bottom-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-fade-in shadow-lg">
              {tapFeedback}
            </div>
          )}
        </div>

        {/* Sensitivity Slider */}
        <div className="relative z-10 mt-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              SENSITIVITY
            </span>
            <span className="text-xs font-mono font-bold text-indigo-400">
              {triggerConfig.sensitivity} ({triggerConfig.sensitivityValue}%)
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={triggerConfig.sensitivityValue}
            onChange={handleSliderChange}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between items-center mt-1.5 text-slate-500 text-[10px] font-semibold tracking-wider uppercase">
            <span>Light Tap</span>
            <span>Firm Double-Tap</span>
          </div>
        </div>
      </section>

      {/* Auto-Response Logic Card */}
      <section className="glass-panel rounded-2xl flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none rounded-2xl opacity-40" />

        <div className="p-4 sm:p-5 border-b border-slate-800/80 relative z-10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            AUTO-RESPONSE LOGIC & FILTERS
          </h3>
        </div>

        {/* Item 1: Only for Contacts */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-800/80 relative z-10 hover:bg-slate-800/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300">
              <Contact className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white block">
                Only for Contacts
              </span>
              <span className="text-xs text-slate-400">
                Ignore unknown numbers and cold calls
              </span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={triggerConfig.onlyForContacts}
              onChange={(e) =>
                onUpdateConfig({ onlyForContacts: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:border-indigo-500 border border-slate-700" />
          </label>
        </div>

        {/* Item 2: Exclude Favorites */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-800/80 relative z-10 hover:bg-slate-800/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-amber-400">
              <Star className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white block">
                Exclude Favorites
              </span>
              <span className="text-xs text-slate-400">
                Always ring through for VIPs and family
              </span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={triggerConfig.excludeFavorites}
              onChange={(e) =>
                onUpdateConfig({ excludeFavorites: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:border-indigo-500 border border-slate-700" />
          </label>
        </div>

        {/* Item 3: Silence Ringtone */}
        <div className="flex justify-between items-center p-4 sm:p-5 relative z-10 hover:bg-slate-800/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300">
              <VolumeX className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white block">
                Silence Ringtone
              </span>
              <span className="text-xs text-slate-400">
                Mute call audio while AI auto-speaks to caller
              </span>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={triggerConfig.silenceRingtone}
              onChange={(e) =>
                onUpdateConfig({ silenceRingtone: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:border-indigo-500 border border-slate-700" />
          </label>
        </div>
      </section>

      {/* Hardware Key Intercept Specifications Card */}
      <section className="glass-panel rounded-2xl p-5 flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Native Hardware Key Intercept Status
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="font-semibold text-slate-100 mb-0.5">1x Power Key</div>
            <div className="text-slate-400 text-[11px]">
              Intercepted & disabled. Normal Android ringtone mute blocked.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
            <div className="font-semibold text-indigo-400 mb-0.5">2x Power Key (&lt;0.5s)</div>
            <div className="text-slate-300 text-[11px]">
              Triggers active .wav auto voice response to incoming call line.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="font-semibold text-slate-100 mb-0.5">Volume Down Key</div>
            <div className="text-slate-400 text-[11px]">
              Smoothly fades incoming ringtone volume to zero.
            </div>
          </div>
        </div>
      </section>

      {/* How it works Info Card */}
      <section className="glass-panel rounded-2xl p-5 flex items-start gap-3.5 border-l-4 border-l-indigo-500 relative overflow-hidden">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-white">How it works</h4>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            When receiving an incoming call, firmly double-tap the back of your
            device or double-press the Power button within 0.5s. SmartCall will
            instantly intercept the call, muting your ringer and initializing
            the AI voice assistant to handle the caller on your behalf without
            taking your eyes off the road.
          </p>
        </div>
      </section>
    </main>
  );
};
