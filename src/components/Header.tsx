import React from "react";
import { Settings, Shield, Sparkles, PhoneCall } from "lucide-react";

interface HeaderProps {
  isPro: boolean;
  onOpenPro: () => void;
  onOpenSettings: () => void;
  onSimulateCall: () => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  isPro,
  onOpenPro,
  onOpenSettings,
  onSimulateCall,
}) => {
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 sm:px-6 py-2.5 bg-[#070B14]/75 backdrop-blur-2xl border-b border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <img
            alt="SmartCall Logo"
            className="w-8 h-8 rounded-full border border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.4)] object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDu4Jtnd1XoVd487RNjj2uAOzNIBwpGhnwIeR_MUXxOEZYQ7Mbm2AuhCo_ebfXrOZMfft1FCU9DNq9IxO9Ef49ReQGvAx3Ks4HyCUMOd0rgFO5kgBkFJEO2khkXLHMTlxtBWAshuIdAs0BdC3GTT3FOCkqvTZwP0VhRnEhFyBrZ5_y1iE-5W7Qrb5XbJJ0fDrm6cAoBLQjzTpwTrzDdNVBBFfVaEgRRXoED9iVpxR5vCvztgT-K4E1HKA"
            onError={(e) => {
              // Fallback to custom vector badge if remote asset isn't reachable
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">
            SmartCall
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider hidden sm:inline-block px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
            Auto Voice Studio
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Quick Incoming Call Test Simulator Button */}
        <button
          onClick={onSimulateCall}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/35 hover:bg-indigo-500/25 transition-all shadow-[0_0_12px_rgba(99,102,241,0.2)] active:scale-95"
          title="Test Hardware Intercept with simulated call"
        >
          <PhoneCall className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
          <span className="hidden xs:inline">Test Call</span>
        </button>

        {/* PRO badge button */}
        <button
          onClick={onOpenPro}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all active:scale-95 duration-100 ${
            isPro
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              : "text-indigo-400 border border-indigo-500/50 shadow-[0_0_12px_rgba(99,102,241,0.25)] bg-indigo-500/10 hover:bg-indigo-500/20"
          }`}
        >
          {isPro ? "PRO ACTIVE" : "PRO"}
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all p-1.5 rounded-full active:scale-95 duration-100 border border-transparent hover:border-slate-700/50"
          title="Trigger and System Settings"
        >
          <Settings className="w-5 h-5 text-slate-400 hover:text-indigo-400 transition-colors" />
        </button>
      </div>
    </header>
  );
};
