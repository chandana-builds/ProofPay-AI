import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  FileCheck2,
  Building,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Activity,
  Lock,
} from 'lucide-react';
import { DashboardStats } from '../../types';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  onNavigate: (tab: string) => void;
  onSelectInvestigation: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  onNavigate,
  onSelectInvestigation,
}) => {
  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Loading live fraud prevention telemetry...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Reviewed',
      value: stats?.total_investigations ?? 0,
      icon: FileCheck2,
      color: 'text-slate-100',
      bg: 'bg-slate-800/60 border-slate-700',
      description: 'Persistent audit records',
    },
    {
      title: 'Payments on Hold',
      value: stats?.on_hold_count ?? 0,
      icon: ShieldAlert,
      color: 'text-rose-400',
      bg: 'bg-rose-950/20 border-rose-500/30',
      description: 'Critical violations blocked',
    },
    {
      title: 'Verification Required',
      value: stats?.verification_required_count ?? 0,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-950/20 border-amber-500/30',
      description: 'Secondary evidence needed',
    },
    {
      title: 'Eligible for Review',
      value: stats?.eligible_for_review_count ?? 0,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/20 border-emerald-500/30',
      description: 'Evidence gates passed',
    },
  ];

  const categoryNames: Record<string, string> = {
    BANKING_SECURITY: 'Banking Security (Account/Routing)',
    SENDER_AUTHENTICITY: 'Sender Authenticity (BEC/Domain)',
    FINANCIAL_TERMS: 'Financial Terms & PO Matching',
    BEHAVIORAL_URGENCY: 'Behavioral Urgency & Social Pressure',
    IDENTITY_VERIFICATION: 'Vendor Identity Matching',
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Financial Security Operations</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
              Live DB Telemetry
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time monitoring of invoice authenticity, BEC interception, and bank account change verification.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('new-investigation')}
            className="flex items-center space-x-2 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white font-semibold text-sm px-4 py-2.5 rounded-lg shadow-lg shadow-sky-500/20 transition-all cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Investigation</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-xl border ${card.bg} backdrop-blur-sm shadow-sm space-y-3 transition-transform hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {card.title}
                </span>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className={`text-3xl font-extrabold ${card.color} font-mono`}>
                  {card.value}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center space-x-1">
                <span>{card.description}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Analytics & Discrepancies Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Discrepancy Breakdown */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <span>Interception & Discrepancy Distribution</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Breakdown of deterministic rule violations and fraud vectors intercepted by the policy engine.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {stats && Object.keys(stats.discrepancy_categories).length > 0 ? (
              Object.entries(stats.discrepancy_categories).map(([cat, count]) => {
                const totalViolations = Object.values(stats.discrepancy_categories).reduce((a, b) => a + b, 0) || 1;
                const percentage = Math.round((count / totalViolations) * 100);
                const isBank = cat === 'BANKING_SECURITY';
                const isSender = cat === 'SENDER_AUTHENTICITY';
                const barColor = isBank ? 'bg-rose-500' : isSender ? 'bg-amber-500' : 'bg-sky-500';

                return (
                  <div key={cat} className="space-y-1.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">
                        {categoryNames[cat] || cat}
                      </span>
                      <span className="font-mono text-slate-400">
                        {count} violations ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${barColor} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-slate-400 text-sm">
                No policy violations recorded yet. Run a payment investigation to analyze discrepancies.
              </div>
            )}
          </div>
        </div>

        {/* Security Policy Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Evidence-Gated Protocol</span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every invoice is subjected to multi-layered deterministic checks before payment authorization.
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-start space-x-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5"></div>
                <div>
                  <span className="font-semibold text-rose-300">Mandatory Bank Account Lock:</span>
                  <p className="text-[11px] text-slate-400">Changes to depository accounts automatically freeze disbursements.</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5"></div>
                <div>
                  <span className="font-semibold text-amber-300">Domain Spoofing Intercept:</span>
                  <p className="text-[11px] text-slate-400">Detects typosquatted lookalike sender domains.</p>
                </div>
              </div>

              <div className="flex items-start space-x-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5"></div>
                <div>
                  <span className="font-semibold text-emerald-300">Dual-Control Audit Gate:</span>
                  <p className="text-[11px] text-slate-400">All actions logged immutably in SQLite database.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Trusted Vendors on File</span>
              <span className="font-bold text-white font-mono text-sm">{stats?.total_vendors ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Investigations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Recent Payment Investigations</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspected payment requests and their deterministic policy outcomes.
            </p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center space-x-1 cursor-pointer"
          >
            <span>View All History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Investigation ID</th>
                <th className="py-3 px-4">Vendor Name</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Policy Decision</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {stats?.recent_investigations && stats.recent_investigations.length > 0 ? (
                stats.recent_investigations.map((inv) => {
                  const isHold = inv.final_decision === 'PAYMENT_ON_HOLD';
                  const isVerification = inv.final_decision === 'VERIFICATION_REQUIRED';
                  const isEligible = inv.final_decision === 'ELIGIBLE_FOR_REVIEW';

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => onSelectInvestigation(inv.id)}
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-sky-400">
                        {inv.id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        {inv.vendor_name_claimed || 'Unidentified Vendor'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {inv.invoice_number || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                        {inv.invoice_amount
                          ? `$${inv.invoice_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : 'Unspecified'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isHold
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : isVerification
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {isHold && 'Payment on Hold'}
                          {isVerification && 'Verification Required'}
                          {isEligible && 'Eligible for Review'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {inv.human_review_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectInvestigation(inv.id);
                          }}
                          className="text-xs text-sky-400 hover:text-sky-300 font-medium px-2 py-1 rounded bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-all cursor-pointer"
                        >
                          Inspect Evidence
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No investigations logged yet. Click "Create New Investigation" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
