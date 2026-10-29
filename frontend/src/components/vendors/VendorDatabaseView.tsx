import React, { useState, useEffect } from 'react';
import {
  Building2,
  PlusCircle,
  History,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Edit2,
  CheckCircle2,
  X,
  CreditCard,
  Globe,
} from 'lucide-react';
import { Vendor, VendorAuditLog } from '../../types';
import { fetchVendors, createVendor, updateVendor, fetchVendorAuditLogs } from '../../services/api';

export const VendorDatabaseView: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedVendorForEdit, setSelectedVendorForEdit] = useState<Vendor | null>(null);
  const [selectedVendorForAudit, setSelectedVendorForAudit] = useState<Vendor | null>(null);
  const [auditLogs, setAuditLogs] = useState<VendorAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  // Form states - Create
  const [newVendorId, setNewVendorId] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newDomains, setNewDomains] = useState<string>('');
  const [newBankName, setNewBankName] = useState<string>('');
  const [newAccountNumber, setNewAccountNumber] = useState<string>('');
  const [newRoutingNumber, setNewRoutingNumber] = useState<string>('');
  const [newCurrency, setNewCurrency] = useState<string>('USD');
  const [newPaymentTerms, setNewPaymentTerms] = useState<string>('Net 30');

  // Form states - Edit
  const [editName, setEditName] = useState<string>('');
  const [editDomains, setEditDomains] = useState<string>('');
  const [editBankName, setEditBankName] = useState<string>('');
  const [editAccountNumber, setEditAccountNumber] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');

  const loadVendors = async () => {
    setLoading(true);
    try {
      const data = await fetchVendors();
      setVendors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const handleOpenAudit = async (vendor: Vendor) => {
    setSelectedVendorForAudit(vendor);
    setLoadingAudit(true);
    try {
      const logs = await fetchVendorAuditLogs(vendor.id);
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleOpenEdit = (vendor: Vendor) => {
    setSelectedVendorForEdit(vendor);
    setEditName(vendor.name);
    setEditDomains(vendor.sender_domains.join(', '));
    setEditBankName(vendor.verified_bank_name);
    setEditAccountNumber(vendor.verified_account_number);
    setEditReason('');
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorId.trim() || !newName.trim() || !newAccountNumber.trim()) {
      alert('Please fill out all required vendor fields.');
      return;
    }

    try {
      const domainsList = newDomains
        .split(',')
        .map((d) => d.trim().toLowerCase().replace('@', ''))
        .filter(Boolean);

      await createVendor({
        id: newVendorId.trim(),
        name: newName.trim(),
        sender_domains: domainsList,
        verified_bank_name: newBankName.trim() || 'Depository Bank',
        verified_account_number: newAccountNumber.trim(),
        verified_routing_number: newRoutingNumber.trim() || undefined,
        expected_currency: newCurrency,
        expected_payment_terms: newPaymentTerms,
        verification_status: 'VERIFIED',
      });

      setShowCreateModal(false);
      resetCreateForm();
      loadVendors();
    } catch (err: any) {
      alert(err.message || 'Failed to create vendor.');
    }
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorForEdit) return;
    if (!editReason.trim()) {
      alert('A compliance audit reason is strictly mandatory when updating vendor records.');
      return;
    }

    try {
      const domainsList = editDomains
        .split(',')
        .map((d) => d.trim().toLowerCase().replace('@', ''))
        .filter(Boolean);

      await updateVendor(selectedVendorForEdit.id, {
        name: editName.trim(),
        sender_domains: domainsList,
        verified_bank_name: editBankName.trim(),
        verified_account_number: editAccountNumber.trim(),
        reason_for_change: editReason.trim(),
      });

      setSelectedVendorForEdit(null);
      loadVendors();
    } catch (err: any) {
      alert(err.message || 'Failed to update vendor record.');
    }
  };

  const resetCreateForm = () => {
    setNewVendorId('');
    setNewName('');
    setNewDomains('');
    setNewBankName('');
    setNewAccountNumber('');
    setNewRoutingNumber('');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Vendor Verification Database</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 font-semibold">
              Trusted Truth Authority
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Certified repository of verified depository accounts and authorized email sender domains. AI reports cannot bypass these records.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-lg shadow-md cursor-pointer transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register Test Vendor</span>
        </button>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {vendors.map((v) => (
          <div
            key={v.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-all shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                    {v.id}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {v.verification_status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1.5">{v.name}</h3>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleOpenAudit(v)}
                  title="View Audit Logs"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
                >
                  <History className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenEdit(v)}
                  title="Edit Vendor"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Authorized Domains */}
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                  Authorized Sender Domains:
                </span>
                <div className="flex flex-wrap gap-1">
                  {v.sender_domains.map((d, i) => (
                    <span
                      key={i}
                      className="font-mono text-[11px] text-teal-300 bg-teal-950/50 px-2 py-0.5 rounded border border-teal-500/30"
                    >
                      @{d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Verified Banking */}
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">
                    Verified Depository Account:
                  </span>
                  <Lock className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="font-mono text-slate-200 font-bold">
                  {v.verified_bank_name} — {v.masked_account_number}
                </div>
                {v.verified_routing_number && (
                  <div className="text-[11px] font-mono text-slate-400">
                    Routing: {v.verified_routing_number}
                  </div>
                )}
              </div>

              {/* Terms and Dates */}
              <div className="flex items-center justify-between text-slate-400 pt-1 text-[11px]">
                <span>
                  Terms: <b className="text-slate-300">{v.expected_payment_terms}</b> ({v.expected_currency})
                </span>
                <span>
                  Last Verified: {new Date(v.last_verified_at || '').toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create Vendor */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Register New Verified Vendor Profile</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Vendor ID (Unique)</label>
                  <input
                    type="text"
                    required
                    value={newVendorId}
                    onChange={(e) => setNewVendorId(e.target.value)}
                    placeholder="e.g. VND-2001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Legal Company Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Pacific Logistics Corp"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Authorized Sender Domains (Comma separated)
                </label>
                <input
                  type="text"
                  required
                  value={newDomains}
                  onChange={(e) => setNewDomains(e.target.value)}
                  placeholder="e.g. pacificlogistics.com, billing.pacific.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Depository Bank Name</label>
                  <input
                    type="text"
                    required
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder="e.g. Bank of America"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={newAccountNumber}
                    onChange={(e) => setNewAccountNumber(e.target.value)}
                    placeholder="e.g. 88392019482"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Routing Number</label>
                  <input
                    type="text"
                    value={newRoutingNumber}
                    onChange={(e) => setNewRoutingNumber(e.target.value)}
                    placeholder="e.g. 121000248"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Currency</label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Terms</label>
                  <input
                    type="text"
                    value={newPaymentTerms}
                    onChange={(e) => setNewPaymentTerms(e.target.value)}
                    placeholder="Net 30"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 bg-slate-800 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-bold shadow-md cursor-pointer"
                >
                  Save Vendor Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Vendor with Sensitive Bank Account Modification Protection */}
      {selectedVendorForEdit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                Edit Vendor Profile: {selectedVendorForEdit.id}
              </h3>
              <button onClick={() => setSelectedVendorForEdit(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SENSITIVE OPERATION WARNING */}
            <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
              <div>
                <span className="font-bold">Sensitive Banking Operation:</span>
                <p className="mt-0.5 text-[11px] text-amber-200/90 leading-relaxed">
                  Modifying bank accounts will trigger an automatic compliance audit log and shift vendor status to PENDING_AUDIT until re-certified.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateVendor} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Company Legal Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Authorized Sender Domains</label>
                <input
                  type="text"
                  value={editDomains}
                  onChange={(e) => setEditDomains(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Depository Bank</label>
                  <input
                    type="text"
                    value={editBankName}
                    onChange={(e) => setEditBankName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Account Number</label>
                  <input
                    type="text"
                    value={editAccountNumber}
                    onChange={(e) => setEditAccountNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-amber-300 font-semibold mb-1">
                  * Mandatory Reason for Record Modification (Audit Trail)
                </label>
                <textarea
                  rows={2}
                  required
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Annual bank switch verified via corporate treasury mandate."
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-lg p-2 text-slate-200 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedVendorForEdit(null)}
                  className="px-4 py-2 rounded-lg text-slate-400 bg-slate-800 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-md cursor-pointer"
                >
                  Commit Changes to Audit Trail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer / Modal: View Vendor Audit History */}
      {selectedVendorForAudit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">
                  Audit History: {selectedVendorForAudit.name} ({selectedVendorForAudit.id})
                </h3>
                <p className="text-xs text-slate-400">Immutable ledger of vendor configuration modifications</p>
              </div>
              <button onClick={() => setSelectedVendorForAudit(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
              {loadingAudit ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading audit trail...</div>
              ) : auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-sky-400">{log.action}</span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-300">
                      Performed by: <b className="text-slate-200">{log.performed_by}</b>
                    </div>
                    {log.notes && (
                      <p className="text-slate-400 font-mono text-[11px] bg-slate-900 p-2 rounded">
                        {log.notes}
                      </p>
                    )}
                    {log.changed_fields && (
                      <div className="font-mono text-[10px] text-teal-400 bg-slate-900/60 p-2 rounded break-all">
                        {log.changed_fields}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No historical audit entries for this vendor.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
