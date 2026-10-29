import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  FileText,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { InvestigationSummary, DecisionType } from '../../types';
import { fetchInvestigations } from '../../services/api';

interface InvestigationHistoryViewProps {
  onSelectInvestigation: (id: string) => void;
  onNewInvestigation: () => void;
}

export const InvestigationHistoryView: React.FC<InvestigationHistoryViewProps> = ({
  onSelectInvestigation,
  onNewInvestigation,
}) => {
  const [investigations, setInvestigations] = useState<InvestigationSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDecision, setSelectedDecision] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchInvestigations({
        decision: selectedDecision,
        search: searchTerm || undefined,
      });
      setInvestigations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDecision]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Investigation History & Audit Trail</h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete persistent audit records of all analyzed payment requests and human review actions.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, Vendor, Email, or Invoice #..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
          />
        </form>

        {/* Decision Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Decisions' },
            { id: 'PAYMENT_ON_HOLD', label: 'Holds' },
            { id: 'VERIFICATION_REQUIRED', label: 'Verification Required' },
            { id: 'ELIGIBLE_FOR_REVIEW', label: 'Eligible' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedDecision(tab.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                selectedDecision === tab.id
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Investigation ID</th>
                <th className="py-3 px-4">Vendor Name</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Policy Decision</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Querying persistent SQLite database...</span>
                    </div>
                  </td>
                </tr>
              ) : investigations.length > 0 ? (
                investigations.map((inv) => {
                  const isHold = inv.final_decision === 'PAYMENT_ON_HOLD';
                  const isVerification = inv.final_decision === 'VERIFICATION_REQUIRED';
                  const isEligible = inv.final_decision === 'ELIGIBLE_FOR_REVIEW';

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvestigation(inv.id)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                        {inv.id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        {inv.vendor_name_claimed || 'Unidentified Vendor'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {inv.invoice_number || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                        {inv.invoice_amount
                          ? `$${inv.invoice_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : 'Unspecified'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
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
                        <span className="font-mono text-[10px] text-slate-300">
                          {inv.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-mono text-slate-400">
                          {inv.human_review_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectInvestigation(inv.id);
                          }}
                          className="text-xs text-sky-400 hover:text-sky-300 font-semibold px-2 py-1 rounded bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-all cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 space-y-3">
                    <p>No investigations matched the current filter.</p>
                    <button
                      onClick={onNewInvestigation}
                      className="text-xs text-sky-400 hover:underline cursor-pointer"
                    >
                      Start a new payment investigation &rarr;
                    </button>
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
