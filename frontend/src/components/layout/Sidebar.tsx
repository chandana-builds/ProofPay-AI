import React from 'react';
import {
  LayoutDashboard,
  FileSearch,
  History,
  Building2,
  Settings as SettingsIcon,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  holdCount?: number;
  verificationCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  holdCount = 0,
  verificationCount = 0,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Security Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'new-investigation',
      label: 'New Investigation',
      icon: FileSearch,
      badge: 'Action',
      badgeClass: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    },
    {
      id: 'history',
      label: 'Investigation History',
      icon: History,
      badge: holdCount > 0 ? `${holdCount} Holds` : null,
      badgeClass: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    },
    {
      id: 'vendors',
      label: 'Vendor Verification DB',
      icon: Building2,
      badge: null,
    },
    {
      id: 'settings',
      label: 'Settings & Nebius Status',
      icon: SettingsIcon,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none">
      <div className="p-4 space-y-6">
        {/* Navigation Section */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Fraud Operations
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.badgeClass}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Security Policy Reminder Box */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-amber-400">
            <ShieldAlert className="w-4 h-4" />
            <span>Dual-Control Policy</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            AI recommendations never override mandatory security hold rules. Bank-account changes require independent out-of-band verification.
          </p>
          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
            <span>Critical Holds: <b className="text-rose-400">{holdCount}</b></span>
            <span>Needs Review: <b className="text-amber-400">{verificationCount}</b></span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Nebius Token Factory</span>
          </span>
          <span className="font-mono text-[11px]">NVIDIA Nemotron</span>
        </div>
      </div>
    </aside>
  );
};
