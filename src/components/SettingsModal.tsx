import React from "react";
import {
  Shield,
  Smartphone,
  Cpu,
  RefreshCw,
  X,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { AppState, HardwareTriggerConfig } from "../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateConfig: (config: Partial<HardwareTriggerConfig>) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  state,
  onUpdateConfig,
  onResetData,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">System Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5 overflow-y-auto">
          {/* SoundGuard Shield Badge */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 neon-glow shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                SoundGuard Protection Engine
              </div>
              <div className="text-sm font-semibold text-white mt-0.5">
                v2.4.0 Native Receiver Active
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Persistent background broadcast listener for Power & Volume keys.
              </div>
            </div>
          </div>

          {/* Double Click Threshold Setting */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Double-Click Power Interval Window
            </label>
            <div className="flex items-center justify-between gap-2">
              {[350, 500, 700].map((ms) => (
                <button
                  key={ms}
                  onClick={() => onUpdateConfig({ doubleClickThresholdMs: ms })}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    state.triggerConfig.doubleClickThresholdMs === ms
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                      : "bg-slate-800/60 text-slate-300 border border-slate-700/60 hover:bg-slate-800"
                  }`}
                >
                  {ms}ms {ms === 500 && "(Default)"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Maximum elapsed time between two Power clicks to trigger voice response.
            </p>
          </div>

          {/* Accessibility Service Status */}
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">
                Android Accessibility Service
              </div>
              <div className="text-[11px] text-slate-400">
                Grants foreground event intercept permission
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              ENABLED
            </span>
          </div>

          {/* Reset App State */}
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400">Reset sample voice notes & logs</span>
            <button
              onClick={() => {
                onResetData();
                onClose();
              }}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 p-1.5 rounded hover:bg-rose-950/30 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset State</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
