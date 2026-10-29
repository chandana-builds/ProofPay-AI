import {
  DashboardStats,
  InvestigationDetail,
  InvestigationSummary,
  SampleScenario,
  SystemStatus,
  Vendor,
  VendorAuditLog,
} from '../types';

const API_BASE = '/api';

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error(`Failed to load dashboard statistics: ${res.statusText}`);
  return res.json();
}

export async function fetchInvestigations(params?: {
  decision?: string;
  vendor_id?: string;
  search?: string;
}): Promise<InvestigationSummary[]> {
  const query = new URLSearchParams();
  if (params?.decision && params.decision !== 'ALL') query.append('decision', params.decision);
  if (params?.vendor_id && params.vendor_id !== 'ALL') query.append('vendor_id', params.vendor_id);
  if (params?.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE}/investigations?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch investigations: ${res.statusText}`);
  return res.json();
}

export async function fetchInvestigation(id: string): Promise<InvestigationDetail> {
  const res = await fetch(`${API_BASE}/investigations/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Failed to fetch investigation ${id}: ${res.statusText}`);
  return res.json();
}

export async function createInvestigation(payload: {
  vendor_id?: string;
  raw_text?: string;
  email_text?: string;
  source_type?: string;
  claimed_vendor_name?: string;
  claimed_amount?: number;
  claimed_currency?: string;
  claimed_bank_name?: string;
  claimed_account_number?: string;
}): Promise<InvestigationDetail> {
  const res = await fetch(`${API_BASE}/investigations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to create investigation: ${res.statusText}`);
  }
  return res.json();
}

export async function uploadPdfInvestigation(
  file: File,
  vendorId?: string,
  emailText?: string
): Promise<InvestigationDetail> {
  const formData = new FormData();
  formData.append('file', file);
  if (vendorId) formData.append('vendor_id', vendorId);
  if (emailText) formData.append('email_text', emailText);

  const res = await fetch(`${API_BASE}/investigations/upload-pdf`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to process PDF: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSampleScenarios(): Promise<SampleScenario[]> {
  const res = await fetch(`${API_BASE}/investigations/scenarios`);
  if (!res.ok) throw new Error(`Failed to load scenarios: ${res.statusText}`);
  return res.json();
}

export async function fetchVendors(): Promise<Vendor[]> {
  const res = await fetch(`${API_BASE}/vendors`);
  if (!res.ok) throw new Error(`Failed to load vendors: ${res.statusText}`);
  return res.json();
}

export async function fetchVendor(id: string): Promise<Vendor> {
  const res = await fetch(`${API_BASE}/vendors/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Failed to load vendor ${id}: ${res.statusText}`);
  return res.json();
}

export async function fetchVendorAuditLogs(id: string): Promise<VendorAuditLog[]> {
  const res = await fetch(`${API_BASE}/vendors/${encodeURIComponent(id)}/audit-logs`);
  if (!res.ok) throw new Error(`Failed to load audit logs: ${res.statusText}`);
  return res.json();
}

export async function createVendor(payload: Partial<Vendor>): Promise<Vendor> {
  const res = await fetch(`${API_BASE}/vendors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create vendor: ${res.statusText}`);
  }
  return res.json();
}

export async function updateVendor(
  id: string,
  payload: Partial<Vendor> & { reason_for_change: string }
): Promise<Vendor> {
  const res = await fetch(`${API_BASE}/vendors/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update vendor: ${res.statusText}`);
  }
  return res.json();
}

export async function submitReviewAction(
  investigationId: string,
  payload: {
    action_type: string;
    verification_method?: string;
    performed_by: string;
    notes: string;
  }
): Promise<InvestigationDetail> {
  const res = await fetch(`${API_BASE}/investigations/${encodeURIComponent(investigationId)}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to submit review action: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  const res = await fetch(`${API_BASE}/settings/status`);
  if (!res.ok) throw new Error(`Failed to load system status: ${res.statusText}`);
  return res.json();
}

export async function testNebiusConnection(): Promise<{
  available: boolean;
  message: string;
  model: string;
  base_url: string;
}> {
  const res = await fetch(`${API_BASE}/settings/test-connection`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Connection test failed: ${res.statusText}`);
  return res.json();
}
