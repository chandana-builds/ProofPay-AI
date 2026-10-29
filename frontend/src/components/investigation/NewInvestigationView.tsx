import React, { useState, useEffect } from 'react';
import {
  FileText,
  Mail,
  Upload,
  Cpu,
  Sparkles,
  AlertCircle,
  Building,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Vendor, SampleScenario } from '../../types';
import { createInvestigation, uploadPdfInvestigation, fetchSampleScenarios, fetchVendors } from '../../services/api';

interface NewInvestigationViewProps {
  onInvestigationCreated: (id: string) => void;
  onCancel: () => void;
}

export const NewInvestigationView: React.FC<NewInvestigationViewProps> = ({
  onInvestigationCreated,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'pdf'>('text');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [scenarios, setScenarios] = useState<SampleScenario[]>([]);
  
  // Form fields
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [emailText, setEmailText] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Manual Overrides Expander
  const [showOverrides, setShowOverrides] = useState<boolean>(false);
  const [claimedVendorName, setClaimedVendorName] = useState<string>('');
  const [claimedAmount, setClaimedAmount] = useState<string>('');
  const [claimedCurrency, setClaimedCurrency] = useState<string>('USD');
  const [claimedBankName, setClaimedBankName] = useState<string>('');
  const [claimedAccountNumber, setClaimedAccountNumber] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchVendors().then(setVendors).catch(console.error);
    fetchSampleScenarios().then(setScenarios).catch(console.error);
  }, []);

  const handleSelectScenario = (scenario: SampleScenario) => {
    setSelectedVendorId(scenario.vendor_id);
    setEmailText(scenario.email_text);
    setRawText(scenario.raw_text);
    setClaimedVendorName(scenario.claimed_vendor_name || '');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (activeTab === 'pdf') {
        if (!pdfFile) {
          throw new Error('Please select a PDF invoice document to upload.');
        }
        const result = await uploadPdfInvestigation(
          pdfFile,
          selectedVendorId || undefined,
          emailText || undefined
        );
        onInvestigationCreated(result.id);
      } else {
        if (!rawText.trim() && !emailText.trim()) {
          throw new Error('Please provide either invoice text or an associated payment request email.');
        }

        const payload = {
          vendor_id: selectedVendorId || undefined,
          raw_text: rawText.trim() || undefined,
          email_text: emailText.trim() || undefined,
          source_type: 'TEXT',
          claimed_vendor_name: claimedVendorName.trim() || undefined,
          claimed_amount: claimedAmount ? parseFloat(claimedAmount) : undefined,
          claimed_currency: claimedCurrency || undefined,
          claimed_bank_name: claimedBankName.trim() || undefined,
          claimed_account_number: claimedAccountNumber.trim() || undefined,
        };

        const result = await createInvestigation(payload);
        onInvestigationCreated(result.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during investigation execution.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <span>New Payment Investigation</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 font-semibold">
            Nemotron Analysis
          </span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Submit invoice contents and email communications. ProofPay AI extracts payment data, verifies vendor records, and applies deterministic fraud policies.
        </p>
      </div>

      {/* Preset Test Scenarios Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Quick-Load Realistic Test Scenarios:</span>
          </div>
          <span className="text-[11px] text-slate-500">1-click populated</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => handleSelectScenario(sc)}
              className="text-left p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 hover:border-sky-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {sc.badge}
                </span>
              </div>
              <div className="text-xs font-medium text-slate-200 group-hover:text-sky-300 line-clamp-1">
                {sc.title}
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                {sc.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-3">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
          <div className="space-y-1">
            <div className="font-semibold">Investigation Submission Error</div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vendor Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            1. Target Vendor Profile Comparison
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">-- Auto-detect from Document or Claimed Name --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.id} - {v.name} ({v.expected_currency})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Select an existing vendor record to compare bank details, or let the engine match automatically.
              </p>
            </div>

            {selectedVendorId && (
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 text-xs space-y-1">
                {(() => {
                  const matched = vendors.find((v) => v.id === selectedVendorId);
                  if (!matched) return null;
                  return (
                    <>
                      <div className="text-slate-300 font-semibold flex items-center space-x-1.5">
                        <Building className="w-3.5 h-3.5 text-sky-400" />
                        <span>{matched.name}</span>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Authorized Domains: <span className="font-mono text-slate-300">{matched.sender_domains.join(', ')}</span>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Verified Depository: <span className="text-slate-300">{matched.verified_bank_name}</span> (Acct: {matched.masked_account_number})
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Submission Tabs */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex border-b border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-slate-800 text-sky-400 border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Paste Text / Synthetic Email (Fast Demo)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pdf')}
              className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
                activeTab === 'pdf'
                  ? 'bg-slate-800 text-sky-400 border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload PDF Invoice Document</span>
            </button>
          </div>

          <div className="p-5 space-y-4">
            {activeTab === 'text' ? (
              <>
                {/* Associated Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-400" />
                    <span>Vendor Email / Payment Request Communication</span>
                  </label>
                  <textarea
                    rows={6}
                    value={emailText}
                    onChange={(e) => setEmailText(e.target.value)}
                    placeholder="From: controller@vendor.com&#10;Subject: Urgent Invoice Payment&#10;Please wire funds to new bank account..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Include headers like From:, Subject:, Date:, and any urgency language.
                  </p>
                </div>

                {/* Raw Invoice Text */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-400" />
                    <span>Invoice Text & Remittance Instructions</span>
                  </label>
                  <textarea
                    rows={6}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="INVOICE #INV-2026-001&#10;Amount: $15,000.00 USD&#10;Bank: Wells Fargo&#10;Account: 1234567890&#10;PO: PO-9921"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Invoice billing table, total amount due, currency, and claimed bank remittance details.
                  </p>
                </div>
              </>
            ) : (
              /* PDF Upload Tab */
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-700 hover:border-sky-500/60 rounded-xl p-8 text-center transition-colors">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <div className="text-sm font-semibold text-slate-200 mb-1">
                    {pdfFile ? pdfFile.name : 'Choose a PDF invoice or drag and drop'}
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    PDF format up to 10MB. The engine will extract text and analyze payment instructions.
                  </p>
                  <label className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors">
                    <span>Select File</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setPdfFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Optional Email accompanying PDF */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Associated Cover Email (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={emailText}
                    onChange={(e) => setEmailText(e.target.value)}
                    placeholder="Paste the cover email that accompanied this PDF attachment..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Manual Overrides Accordion (Optional) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOverrides(!showOverrides)}
            className="w-full p-4 flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:bg-slate-800/40 cursor-pointer"
          >
            <span>Optional: Manual Field Overrides / Pre-fill (Advanced)</span>
            {showOverrides ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showOverrides && (
            <div className="p-5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-950/40">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Claimed Vendor Name</label>
                <input
                  type="text"
                  value={claimedVendorName}
                  onChange={(e) => setClaimedVendorName(e.target.value)}
                  placeholder="e.g. Acme Cloud Services"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Invoice Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={claimedAmount}
                  onChange={(e) => setClaimedAmount(e.target.value)}
                  placeholder="e.g. 48500.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Currency</label>
                <select
                  value={claimedCurrency}
                  onChange={(e) => setClaimedCurrency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Claimed Bank Name</label>
                <input
                  type="text"
                  value={claimedBankName}
                  onChange={(e) => setClaimedBankName(e.target.value)}
                  placeholder="e.g. Wells Fargo NA"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Claimed Account #</label>
                <input
                  type="text"
                  value={claimedAccountNumber}
                  onChange={(e) => setClaimedAccountNumber(e.target.value)}
                  placeholder="e.g. 987654321098"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-lg shadow-lg shadow-sky-500/20 cursor-pointer active:scale-95 transition-all"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Analyzing Evidence via Nemotron...</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4" />
                <span>Run Evidence-Gated Investigation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
