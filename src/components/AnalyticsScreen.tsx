import React, { useState } from "react";
import {
  BarChart3,
  PhoneCall,
  ShieldCheck,
  BatteryCharging,
  Clock,
  Filter,
  CheckCircle,
  VolumeX,
  Volume2,
  Trash2,
  PhoneIncoming,
} from "lucide-react";
import { AppState, CallInterceptLog } from "../types";

interface AnalyticsScreenProps {
  state: AppState;
  onClearLogs: () => void;
  onSimulateCall: () => void;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  state,
  onClearLogs,
  onSimulateCall,
}) => {
  const [filter, setFilter] = useState<"all" | "handled" | "muted">("all");

  const filteredLogs = state.logs.filter((log) => {
    if (filter === "handled") return log.status === "handled";
    if (filter === "muted") return log.status === "muted";
    return true;
  });

  return (
    <main className="pt-20 pb-28 px-4 sm:px-6 flex flex-col gap-6 max-w-xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
            Analytics & Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time telemetry and call interception history.
          </p>
        </div>
        <button
          onClick={onSimulateCall}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/35 hover:bg-indigo-500/25 transition-all shadow-[0_0_12px_rgba(99,102,241,0.2)] active:scale-95"
        >
          + Test Intercept
        </button>
      </div>

      {/* KPI Metric Grid */}
      <section className="grid grid-cols-2 gap-3">
        {/* Metric 1 */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Calls Handled</span>
            <PhoneCall className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
              {state.logs.length + 12}
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
              100% Zero-Latency WAV
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Driving Time Saved</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
              1.8 hrs
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Distraction-free roads
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Distraction Index</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
              98.4%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Safe hardware overrides
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Service Battery</span>
            <BatteryCharging className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
              0.8%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Native event receiver
            </div>
          </div>
        </div>
      </section>

      {/* Call Logs Section */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
            <PhoneIncoming className="w-4 h-4 text-indigo-400" />
            Recent Intercept History
          </h2>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                filter === "all"
                  ? "bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("handled")}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                filter === "handled"
                  ? "bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Auto-Replied
            </button>
            <button
              onClick={() => setFilter("muted")}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                filter === "muted"
                  ? "bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Muted
            </button>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-slate-400 text-xs">
            No incoming calls logged yet. Tap "Test Intercept" above to simulate an incoming call!
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="glass-panel rounded-2xl p-4 flex flex-col gap-2.5 hover:border-slate-700/80 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {log.callerName}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {log.callerNumber}
                    </span>
                    {log.isFavorite && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                        VIP
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {log.timestamp}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Trigger:</span>
                    <span className="text-indigo-400 font-mono font-semibold">
                      {log.triggerUsed}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {log.status === "handled" ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {log.actionTaken}
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1 font-semibold">
                        <VolumeX className="w-3.5 h-3.5" />
                        {log.actionTaken}
                      </span>
                    )}
                  </div>
                </div>

                {log.responseFilename && (
                  <div className="text-[11px] text-slate-400 font-mono bg-slate-900/60 border border-slate-800/80 px-2.5 py-1 rounded-lg">
                    Audio Dispatched: {log.responseFilename} ({log.durationSec}s)
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {state.logs.length > 0 && (
          <button
            onClick={onClearLogs}
            className="self-center mt-2 text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Call History</span>
          </button>
        )}
      </section>
    </main>
  );
};
