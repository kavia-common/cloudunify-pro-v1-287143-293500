export type Provider = 'aws' | 'azure' | 'gcp';
export type Role = 'admin' | 'user' | 'viewer';

export interface ErrorResponse {
  error_code?: string;
  message: string;
  details?: Record<string, unknown>;
}

// PUBLIC_INTERFACE
export interface LoginRequest {
  /** Email address used to sign in */
  email: string;
  /** Password */
  password: string;
}

// PUBLIC_INTERFACE
export interface LoginResponse {
  /** Short-lived access token (JWT) */
  access_token: string;
  /** Long-lived refresh token (JWT or opaque) */
  refresh_token: string;
  /** Token type, e.g., "bearer" */
  token_type: string;
}

// PUBLIC_INTERFACE
export interface Resource {
  id: string;
  resource_id: string;
  resource_type: string;
  provider: Provider;
  region: string;
  state: string;
  tags: Record<string, string>;
  cost_daily: number;
  cost_monthly: number;
  created_at: string;
}

// PUBLIC_INTERFACE
export interface ResourceListResponse {
  items: Resource[];
  total: number;
  page: number;
  size: number;
}

// PUBLIC_INTERFACE
export interface CostSummary {
  total_cost: number;
  by_provider: Record<string, number>;
  by_region: Record<string, number>;
  period: string;
}

// PUBLIC_INTERFACE
export interface Recommendation {
  id: string;
  resource_id: string;
  recommendation_type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  potential_savings_monthly: number;
  description: string;
  action_items: string[];
  created_at: string;
}

// PUBLIC_INTERFACE
export interface AutomationRule {
  id: string;
  name: string;
  rule_type: string;
  is_enabled: boolean;
  match_criteria: Record<string, unknown>;
  action_type: string;
  cron_schedule: string;
  created_at: string;
}

// PUBLIC_INTERFACE
export interface AutomationRuleCreate {
  /** Name for the rule */
  name: string;
  /** Rule classification/type (e.g., "schedule_stop") */
  rule_type: string;
  /** Whether the rule is initially enabled */
  is_enabled: boolean;
  /** Criteria used to match resources (JSON object) */
  match_criteria: Record<string, unknown>;
  /** Action performed when rule triggers */
  action_type: string;
  /** Cron-like schedule string (e.g., "0 2 * * *") */
  cron_schedule: string;
}

/** Bulk upload types used by resources and costs uploaders */

// PUBLIC_INTERFACE
export interface BulkUploadRowError {
  /** 1-based row number (including header row in the original file) */
  rowNumber: number;
  /** Human-readable error messages for the row */
  errors: string[];
}

// PUBLIC_INTERFACE
export interface BulkUploadResponse {
  /** Number of new records inserted by the server */
  inserted: number;
  /** Number of existing records updated by the server */
  updated: number;
  /** Number of rows rejected by the server */
  invalid: number;
  /** Optional row-level errors returned by the server */
  errors?: BulkUploadRowError[];
  /** Optional message from server */
  message?: string;
}

// PUBLIC_INTERFACE
export interface BulkUploadRequest<T = unknown> {
  /** Organization scope for the ingest operation */
  organization_id: string;
  /** Optional cloud account identifier */
  account_id?: string;
  /** Valid rows to be uploaded */
  rows: T[];
}
