import React from 'react';
import { ShieldCheck, Cpu, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { SystemStatus } from '../../types';

interface NavbarProps {
  systemStatus: SystemStatus | null;
  onNavigate: (tab: string) => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({ systemStatus, onNavigate }) => {
  const isAiActive = systemStatus?.ai_inference_available;

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Brand & Platform */}
      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-lg text-white tracking-tight">ProofPay</span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30">AI</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
              v1.0.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Evidence-Gated Payment Fraud Prevention Platform
          </p>
        </div>
      </div>

      {/* Model & Hackathon Badges */}
      <div className="flex items-center space-x-3">
        {/* Nebius x NVIDIA Nemotron Tag */}
        <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1.5">
          <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-medium leading-none">AI Inference</div>
            <div className="text-xs font-mono font-medium text-emerald-300 leading-tight">
              Nebius × NVIDIA Nemotron
            </div>
          </div>
        </div>

        {/* Engine Status Indicator */}
        <div 
          onClick={() => onNavigate('settings')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
            isAiActive
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40'
              : 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-900/40'
          }`}
          title="Click to view engine diagnostics"
        >
          {isAiActive ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Nemotron Online</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Heuristic Mode</span>
            </>
          )}
        </div>

        {/* Create Investigation CTA */}
        <button
          onClick={() => onNavigate('new-investigation')}
          className="flex items-center space-x-2 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white font-medium text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg shadow-md shadow-sky-500/20 transition-all cursor-pointer active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Investigation</span>
        </button>
      </div>
    </header>
  );
};
