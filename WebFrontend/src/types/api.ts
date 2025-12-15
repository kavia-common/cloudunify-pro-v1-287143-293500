export type Provider = 'aws' | 'azure' | 'gcp';

export interface ErrorResponse {
  error_code?: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

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

export interface ResourceListResponse {
  items: Resource[];
  total: number;
  page: number;
  size: number;
}

export interface CostSummary {
  total_cost: number;
  by_provider: Record<string, number>;
  by_region: Record<string, number>;
  period: string;
}

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
