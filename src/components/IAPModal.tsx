import React, { useState } from "react";
import {
  Check,
  Sparkles,
  ShieldCheck,
  Zap,
  Lock,
  X,
  Star,
  Award,
} from "lucide-react";

interface IAPModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPro: boolean;
  onUnlockPro: () => void;
}

export const IAPModal: React.FC<IAPModalProps> = ({
  isOpen,
  onClose,
  isPro,
  onUnlockPro,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePurchase = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSuccess(true);
      onUnlockPro();
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    }, 1200);
  };

  const perks = [
    {
      title: "Unlimited AI Voice Responses",
      description: "Generate and export endless studio-grade .wav notes with zero trial caps.",
    },
    {
      title: "All Google AI Voice Artists",
      description: "Access Aoede, Speaker 1, Kore, Puck, Fenrir, and Zephyr voice engines.",
    },
    {
      title: "100% Ad-Free Experience",
      description: "Permanently removes all AdMob banners and promotional overlays.",
    },
    {
      title: "VIP Contacts & Whitelist Rules",
      description: "Custom auto-reply triggers based on incoming phone numbers.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/70 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.2)] overflow-hidden flex flex-col">
        {/* Glowing top line */}
        <div className="w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />

        <div className="p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 neon-glow">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
                  Google Play In-App Purchase
                </div>
                <h3 className="text-xl font-bold text-white">
                  SmartCall Lifetime PRO
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pricing Banner */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400">One-Time Payment</span>
              <div className="text-2xl font-bold text-white flex items-baseline gap-1.5">
                <span>$4.99</span>
                <span className="text-xs text-indigo-400 font-semibold">
                  / Lifetime Access
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold">
              Save 80%
            </span>
          </div>

          {/* Features List */}
          <div className="flex flex-col gap-3">
            {perks.map((perk, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-500/40">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    {perk.title}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {perk.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          {isPro ? (
            <div className="py-3.5 px-4 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-center font-bold text-sm flex flex-col items-center gap-1">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                Lifetime PRO Unlocked — Full Testing Access
              </span>
              <span className="text-xs font-normal text-emerald-300/80">
                All features, unlimited responses & Aoede (Speaker 1) engine active with no trial limits.
              </span>
            </div>
          ) : (
            <button
              onClick={handlePurchase}
              disabled={isProcessing || success}
              className="w-full py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-[0.99] transition-all neon-glow shadow-[0_0_25px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Google Play Token...</span>
                </>
              ) : success ? (
                <span>🎉 Lifetime PRO Unlocked!</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Unlock Lifetime Access ($4.99)</span>
                </>
              )}
            </button>
          )}

          <div className="text-center text-[11px] text-slate-500">
            Backed by Google Play 100% Satisfaction Guarantee. Family Library eligible.
          </div>
        </div>
      </div>
    </div>
  );
};
