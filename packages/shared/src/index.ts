// Shared types used by both frontend and backend

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// Org
export type OrgLevel = 'SYSTEM' | 'HOSPITAL' | 'DEPARTMENT' | 'UNIT';

// Surveys
export type SurveyStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export type SurveyType = 'PULSE' | 'ANNUAL' | 'ONBOARDING' | 'EXIT' | 'AD_HOC' | 'VALIDATION';
export type QuestionType = 'LIKERT_5' | 'LIKERT_10' | 'NPS' | 'YES_NO' | 'MULTIPLE_CHOICE' | 'OPEN_TEXT' | 'RATING';

// Issues
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'RESOLVED' | 'CLOSED';
export type IssueSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IssuePriority = 'P1' | 'P2' | 'P3' | 'P4';

// Tasks
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

// Escalations
export type EscalationStatus = 'PENDING' | 'NOTIFIED' | 'ACKNOWLEDGED' | 'RESOLVED';

// Speak Up
export type CaseStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';

// Auth
export type SystemRole =
  | 'SUPER_ADMIN'
  | 'SYSTEM_SVP'
  | 'HOSPITAL_VP'
  | 'DEPARTMENT_DIRECTOR'
  | 'UNIT_MANAGER'
  | 'EMPLOYEE'
  | 'HR_ANALYST'
  | 'READ_ONLY';
