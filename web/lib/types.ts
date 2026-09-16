export type Category =
  | "bug"
  | "feature_request"
  | "complaint"
  | "praise"
  | "question"
  | "spam";

export type Severity = "critical" | "high" | "medium" | "low";

export type DecisionStatus = "approved" | "rejected" | "needs_info";

export type Evidence = {
  issue_key?: string;
  source: string;
  user_id: string;
  rating: number | null;
  created_at: string;
  text: string;
  reason?: string | null;
};

export type Issue = {
  issue_key: string;
  issue_title: string;
  category: Category | string;
  feature_area: string;
  severity: Severity | string;
  users_affected: number;
  mentions: number;
  sources: number;
  first_seen: string;
  last_seen: string;
  mentions_last_14d: number;
};

export type Decision = {
  issue_key: string;
  status: DecisionStatus;
  priority: string | null;
  owner: string | null;
  note: string | null;
  decided_at: string;
};

export type IssueWithDecision = Issue & { decision: Decision | null };
