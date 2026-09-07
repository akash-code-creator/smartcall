import React from "react";
import { ActiveTab } from "../types";
import { Home, Mic, Sliders, BarChart3 } from "lucide-react";

interface BottomNavBarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onChangeTab,
}) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "home",
      label: "Home",
      icon: <Home className="w-5 h-5 mb-0.5" />,
    },
    {
      id: "audio",
      label: "Audio",
      icon: <Mic className="w-5 h-5 mb-0.5" />,
    },
    {
      id: "triggers",
      label: "Triggers",
      icon: <Sliders className="w-5 h-5 mb-0.5" />,
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: <BarChart3 className="w-5 h-5 mb-0.5" />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-40 bg-[#070B14]/80 backdrop-blur-2xl border-t border-slate-800/80 shadow-[0_-4px_25px_rgba(0,0,0,0.5)] flex justify-around items-center h-18 px-4 pb-safe">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`flex flex-col items-center justify-center transition-all duration-200 py-1.5 px-3.5 rounded-xl active:scale-95 ${
              isActive
                ? "text-indigo-400 bg-indigo-500/15 border border-indigo-500/35 shadow-[0_0_15px_rgba(99,102,241,0.25)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            {tab.icon}
            <span className="text-[11px] font-medium tracking-wide">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
