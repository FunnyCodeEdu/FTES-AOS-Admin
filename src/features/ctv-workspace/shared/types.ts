export interface CtvScope {
  scopeType: string;
  scopeId: string;
  scopeName: string;
  permissions: string[];
  expiresAt: string;
}

export interface CtvTodoItem {
  type: "PENDING_POST" | "PENDING_RESOURCE";
  scopeId: string;
  scopeName: string;
  scopeType: string;
  count: number;
  link: string;
}

export interface CtvKpi {
  resourcesProcessed: number;
  postsModerated: number;
  contributions: { date: string; count: number }[];
  byScope: { scopeType: string; scopeId: string; scopeName: string; count: number }[];
}

export interface OnboardingInvite {
  email: string;
  scopes: { scopeType: string; scopeId: string; scopeName: string }[];
  permissions: string[];
  grantExpiresAt: string;
  invitedByName: string;
  note?: string;
}

export interface OnboardingChecklistItem {
  key: string;
  title: string;
  content?: string;
  required: boolean;
}

export interface OnboardingData {
  invite: OnboardingInvite;
  checklist: OnboardingChecklistItem[];
}
