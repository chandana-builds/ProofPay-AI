import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  FileText,
  Mail,
  Building,
  CreditCard,
  UserCheck,
  ChevronLeft,
  ArrowRight,
  Cpu,
  Clock,
  Sparkles,
  Lock,
  PhoneCall,
  Globe,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { InvestigationDetail, FindingNature, SeverityType } from '../../types';
import { submitReviewAction } from '../../services/api';

interface InvestigationDetailViewProps {
  investigation: InvestigationDetail;
  onBack: () => void;
  onRefresh: () => void;
}

export const InvestigationDetailView: React.FC<InvestigationDetailViewProps> = ({
  investigation,
  onBack,
  onRefresh,
}) => {
  const [reviewActionType, setReviewActionType] = useState<string>('APPLY_HOLD');
  const [verificationMethod, setVerificationMethod] = useState<string>('OUT_OF_BAND_PHONE_CALL');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>('Senior Compliance Auditor');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [showRawJsonModal, setShowRawJsonModal] = useState<boolean>(false);

  const isHold = investigation.final_decision === 'PAYMENT_ON_HOLD';
  const isVerification = investigation.final_decision === 'VERIFICATION_REQUIRED';
  const isEligible = investigation.final_decision === 'ELIGIBLE_FOR_REVIEW';

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewNotes.trim()) {
      alert('Please provide mandatory auditor review notes for the audit trail.');
      return;
    }

    setSubmittingReview(true);
    setReviewSuccessMsg(null);
    try {
      await submitReviewAction(investigation.id, {
        action_type: reviewActionType,
        verification_method: reviewActionType === 'CONFIRM_INDEPENDENT_VERIFICATION' ? verificationMethod : undefined,
        performed_by: reviewerName,
        notes: reviewNotes,
      });
      setReviewSuccessMsg('Review action recorded into SQLite immutable audit trail.');
      setReviewNotes('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review action.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderNatureBadge = (nature: FindingNature) => {
    switch (nature) {
      case 'VERIFIED_FACT':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Verified Fact
          </span>
        );
      case 'RULE_BASED_DISCREPANCY':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
            Rule-Based Discrepancy
          </span>
        );
      case 'AI_HYPOTHESIS':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
            AI Hypothesis
          </span>
        );
      default:
        return null;
    }
  };

  const renderSeverityBadge = (sev: SeverityType) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600">CRITICAL</span>;
      case 'HIGH':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600">HIGH</span>;
      case 'MEDIUM':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-950 text-yellow-300 border border-yellow-600">MEDIUM</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">INFO</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation & Status */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Investigations</span>
        </button>

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-slate-500">ID: <b className="font-mono text-slate-300">{investigation.id}</b></span>
          <span className="text-slate-500">Model: <b className="font-mono text-teal-400">{investigation.ai_model_used}</b></span>
          <button
            onClick={() => setShowRawJsonModal(true)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI JSON Inspector</span>
          </button>
        </div>
      </div>

      {/* Decision Banner */}
      <div
        className={`p-6 rounded-2xl border ${
          isHold
            ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
            : isVerification
            ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
        } shadow-lg`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div
              className={`p-3 rounded-xl ${
                isHold
                  ? 'bg-rose-500/20 text-rose-400'
                  : isVerification
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {isHold && <ShieldAlert className="w-8 h-8" />}
              {isVerification && <AlertTriangle className="w-8 h-8" />}
              {isEligible && <CheckCircle className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-slate-900/80">
                  Deterministic Policy Outcome
                </span>
                <span className="text-xs font-mono font-medium opacity-80">
                  Severity: {investigation.severity}
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight mt-1">
                {isHold && 'PAYMENT ON MANDATORY ADMINISTRATIVE HOLD'}
                {isVerification && 'SECONDARY VERIFICATION REQUIRED BEFORE APPROVAL'}
                {isEligible && 'ELIGIBLE FOR DUAL-CONTROL REVIEW'}
              </h1>
              <p className="text-sm mt-1.5 opacity-90 max-w-4xl leading-relaxed">
                {investigation.decision_rationale}
              </p>
            </div>
          </div>

          {/* Review Status Pill */}
          <div className="flex flex-col items-start md:items-end justify-center bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Human Review Status
            </span>
            <span
              className={`text-sm font-bold font-mono mt-0.5 ${
                investigation.human_review_status === 'HOLD_CONFIRMED'
                  ? 'text-rose-400'
                  : investigation.human_review_status === 'INDEPENDENTLY_VERIFIED'
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {investigation.human_review_status}
            </span>
            {investigation.human_reviewer && (
              <span className="text-[11px] text-slate-400 mt-1">
                By: {investigation.human_reviewer}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison: Untrusted Request vs Trusted Vendor Record */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Claimed Untrusted Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Submitted Untrusted Claims
              </h2>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Source: {investigation.source_type}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400">Claimed Vendor</span>
              <p className="font-semibold text-slate-200 mt-0.5">{investigation.vendor_name_claimed || 'Unspecified'}</p>
            </div>
            <div>
              <span className="text-slate-400">Invoice Number</span>
              <p className="font-mono text-slate-200 mt-0.5">{investigation.invoice_number || 'N/A'}</p>
            </div>
            <div>
              <span className="text-slate-400">Claimed Amount</span>
              <p className="font-mono text-slate-200 mt-0.5 font-bold">
                {investigation.invoice_amount ? `${investigation.currency} $${investigation.invoice_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Unspecified'}
              </p>
            </div>
            <div>
              <span className="text-slate-400">PO Number</span>
              <p className="font-mono text-slate-200 mt-0.5">{investigation.po_number || 'Missing / Not Referenced'}</p>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400">Sender Email & Domain</span>
              <p className="font-mono text-sky-300 mt-0.5 break-all">
                {investigation.sender_email || 'No email headers provided'}
              </p>
            </div>
            <div className="col-span-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold">Claimed Depository Account</span>
                <span className="text-[10px] text-amber-400">Remittance Instruction</span>
              </div>
              <div className="font-mono text-sm text-slate-100 font-bold">
                {investigation.claimed_bank_name || 'Bank Not Specified'} — {investigation.masked_claimed_account_number || investigation.claimed_account_number || 'No Account Provided'}
              </div>
              {investigation.claimed_routing_number && (
                <div className="text-[11px] font-mono text-slate-400">Routing: {investigation.claimed_routing_number}</div>
              )}
            </div>
          </div>

          {investigation.urgency_detected && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs space-y-1">
              <div className="font-semibold flex items-center space-x-1.5 text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Behavioral Social Engineering Flag:</span>
              </div>
              <p className="text-[11px] leading-relaxed">{investigation.urgency_notes}</p>
            </div>
          )}
        </div>

        {/* Right: Trusted Vendor Record */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Trusted Vendor Profile on File
              </h2>
            </div>
            {investigation.vendor ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Verified Vendor ID: {investigation.vendor.id}
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                No Registered Vendor Match
              </span>
            )}
          </div>

          {investigation.vendor ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Legal Company Name</span>
                <p className="font-semibold text-slate-200 mt-0.5">{investigation.vendor.name}</p>
              </div>
              <div>
                <span className="text-slate-400">Expected Terms</span>
                <p className="font-mono text-slate-200 mt-0.5">{investigation.vendor.expected_payment_terms} ({investigation.vendor.expected_currency})</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Authorized Sender Domains</span>
                <p className="font-mono text-emerald-400 mt-0.5">
                  {investigation.vendor.sender_domains.join(', ')}
                </p>
              </div>
              <div className="col-span-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Verified Remittance Institution</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Gold Standard</span>
                </div>
                <div className="font-mono text-sm text-slate-100 font-bold">
                  {investigation.vendor.verified_bank_name} — {investigation.vendor.masked_account_number}
                </div>
                {investigation.vendor.verified_routing_number && (
                  <div className="text-[11px] font-mono text-slate-400">Routing: {investigation.vendor.verified_routing_number}</div>
                )}
              </div>
              <div className="col-span-2 text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>Verification Status: <b className="text-emerald-400">{investigation.vendor.verification_status}</b></span>
                <span>Last Verified: {new Date(investigation.vendor.last_verified_at || '').toLocaleDateString()}</span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <p>This invoice references a vendor name not currently registered in the trusted database.</p>
              <p className="text-[11px] text-slate-500">Unregistered vendor payments cannot be verified automatically.</p>
            </div>
          )}
        </div>
      </div>

      {/* Deterministic Evidence Findings & Verification Gates */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-sky-400" />
              <span>Evidence Verification Gates & Findings</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic rule evaluations comparing untrusted input against trusted records, supported by verbatim text citations.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {investigation.findings.filter((f) => f.passed).length} Passed / {investigation.findings.length} Evaluated
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {investigation.findings.map((f, idx) => (
            <div key={idx} className="p-5 space-y-2.5 hover:bg-slate-800/20 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  {f.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  )}
                  <span className="font-bold text-sm text-slate-100">{f.title}</span>
                  <span className="font-mono text-[11px] text-slate-400">({f.finding_code})</span>
                </div>

                <div className="flex items-center space-x-2">
                  {renderSeverityBadge(f.severity)}
                  {renderNatureBadge(f.finding_nature)}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pl-7">
                {f.description}
              </p>

              {/* Expected vs Observed comparison if discrepancy */}
              {(f.expected_value || f.observed_value) && (
                <div className="ml-7 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Expected Value:</span>
                    <p className="font-mono text-emerald-400 mt-0.5">{f.expected_value || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Observed Value:</span>
                    <p className="font-mono text-rose-400 mt-0.5">{f.observed_value || 'N/A'}</p>
                  </div>
                </div>
              )}

              {/* Exact Evidence Excerpt / Quote */}
              {f.evidence_excerpt && (
                <div className="ml-7 text-xs bg-slate-950/40 p-2.5 rounded border border-slate-800/60 text-slate-400 font-mono">
                  <span className="text-[10px] uppercase text-slate-400 font-sans block mb-1">Source Evidence Citation:</span>
                  <span className="text-slate-300">"{f.evidence_excerpt}"</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Human Reviewer Operations & Dual-Control Audit Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-white">Dual-Control Human Auditor Action</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Finance team members must certify verification out-of-band before releasing critical holds.
          </p>
        </div>

        {reviewSuccessMsg && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs">
            {reviewSuccessMsg}
          </div>
        )}

        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Auditor Action
              </label>
              <select
                value={reviewActionType}
                onChange={(e) => setReviewActionType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="APPLY_HOLD">Confirm Administrative Hold</option>
                <option value="REQUEST_EVIDENCE">Request Additional Evidence</option>
                <option value="CONFIRM_INDEPENDENT_VERIFICATION">Certify Independent Verification</option>
                <option value="RECORD_NOTE">Append Audit Note Only</option>
                <option value="MARK_REVIEWED">Mark as Reviewed</option>
              </select>
            </div>

            {reviewActionType === 'CONFIRM_INDEPENDENT_VERIFICATION' && (
              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1 flex items-center space-x-1">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Out-of-Band Method</span>
                </label>
                <select
                  value={verificationMethod}
                  onChange={(e) => setVerificationMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-400"
                >
                  <option value="OUT_OF_BAND_PHONE_CALL">Direct Phone Call to Known Contact</option>
                  <option value="PRE_ESTABLISHED_PORTAL">Pre-established Vendor Portal</option>
                  <option value="BANK_DIRECT_CONFIRMATION">Direct Depository Bank Confirmation</option>
                  <option value="EXECUTIVE_COUNSEL_SIGN_OFF">Corporate Counsel Sign-Off</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reviewer Identity
              </label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="e.g. Senior Auditor"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Audit Justification Notes (Mandatory for Compliance)
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Record reason, phone verification details, contact name, or hold justification..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingReview}
              className="flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-md cursor-pointer transition-all"
            >
              {submittingReview ? (
                <span>Recording Audit Trail...</span>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Execute Audit Action</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Audit Trail Timeline */}
        {investigation.review_actions && investigation.review_actions.length > 0 && (
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Investigation Audit Trail
            </h3>
            <div className="space-y-2">
              {investigation.review_actions.map((ra) => (
                <div key={ra.id} className="text-xs bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sky-400">{ra.action_type}</span>
                      {ra.verification_method && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {ra.verification_method}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 mt-1 font-mono text-[11px]">{ra.notes}</p>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    <div>{ra.performed_by}</div>
                    <div className="font-mono">{new Date(ra.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: AI JSON Raw Inspector */}
      {showRawJsonModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-teal-400" />
                <span className="font-bold text-sm text-white">NVIDIA Nemotron Structured Extraction Payload</span>
              </div>
              <button
                onClick={() => setShowRawJsonModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="p-4 overflow-y-auto font-mono text-xs text-emerald-400 bg-slate-950">
              <pre className="whitespace-pre-wrap break-all">
                {investigation.ai_extracted_raw_json
                  ? JSON.stringify(JSON.parse(investigation.ai_extracted_raw_json), null, 2)
                  : '// No raw JSON extracted'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
