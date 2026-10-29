export type DecisionType = 'ELIGIBLE_FOR_REVIEW' | 'PAYMENT_ON_HOLD' | 'VERIFICATION_REQUIRED';
export type SeverityType = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAN' | 'INFO';
export type FindingNature = 'VERIFIED_FACT' | 'RULE_BASED_DISCREPANCY' | 'AI_HYPOTHESIS';
export type HumanReviewStatus = 'PENDING' | 'HOLD_CONFIRMED' | 'INDEPENDENTLY_VERIFIED' | 'EVIDENCE_REQUESTED' | 'REVIEWED';

export interface Vendor {
  id: string;
  name: string;
  sender_domains: string[];
  verified_bank_name: string;
  verified_account_number: string;
  masked_account_number: string;
  verified_routing_number?: string;
  verified_iban?: string;
  expected_currency: string;
  expected_payment_terms: string;
  verification_status: string;
  last_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorAuditLog {
  id: number;
  vendor_id: string;
  action: string;
  changed_fields?: string;
  performed_by: string;
  notes?: string;
  timestamp: string;
}

export interface Finding {
  id?: number;
  finding_code: string;
  category: string;
  severity: SeverityType;
  title: string;
  description: string;
  expected_value?: string;
  observed_value?: string;
  evidence_excerpt?: string;
  finding_nature: FindingNature;
  passed: boolean;
}

export interface ReviewAction {
  id: number;
  investigation_id: string;
  action_type: string;
  verification_method?: string;
  performed_by: string;
  notes?: string;
  timestamp: string;
}

export interface InvestigationSummary {
  id: string;
  created_at: string;
  invoice_number?: string;
  vendor_id?: string;
  vendor_name_claimed?: string;
  sender_email?: string;
  invoice_amount?: number;
  currency?: string;
  final_decision: DecisionType;
  severity: SeverityType;
  human_review_status: HumanReviewStatus;
  ai_inference_status: string;
}

export interface InvestigationDetail {
  id: string;
  created_at: string;
  invoice_number?: string;
  vendor_id?: string;
  vendor_name_claimed?: string;
  sender_email?: string;
  sender_domain?: string;
  invoice_amount?: number;
  currency: string;
  due_date?: string;
  po_number?: string;
  payment_instructions_raw?: string;
  claimed_bank_name?: string;
  claimed_account_number?: string;
  masked_claimed_account_number?: string;
  claimed_routing_number?: string;
  claimed_iban?: string;
  urgency_detected: boolean;
  urgency_notes?: string;
  source_type: string;
  source_filename?: string;
  source_text_excerpt?: string;
  ai_model_used: string;
  ai_inference_status: string;
  ai_extracted_raw_json?: string;
  final_decision: DecisionType;
  severity: SeverityType;
  decision_rationale: string;
  human_review_status: HumanReviewStatus;
  human_reviewer?: string;
  human_review_notes?: string;
  reviewed_at?: string;
  vendor?: Vendor;
  findings: Finding[];
  review_actions: ReviewAction[];
}

export interface DashboardStats {
  total_investigations: number;
  on_hold_count: number;
  verification_required_count: number;
  eligible_for_review_count: number;
  critical_risk_count: number;
  total_vendors: number;
  recent_investigations: InvestigationSummary[];
  discrepancy_categories: Record<string, number>;
  decisions_breakdown: Record<string, number>;
}

export interface SystemStatus {
  backend_status: string;
  database_status: string;
  nebius_connection_status: string;
  nebius_model: string;
  nebius_base_url: string;
  ai_inference_available: boolean;
  diagnostic_message: string;
  total_db_records: Record<string, number>;
}

export interface SampleScenario {
  id: string;
  title: string;
  badge: string;
  vendor_id: string;
  claimed_vendor_name: string;
  description: string;
  email_text: string;
  raw_text: string;
}
