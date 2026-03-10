export type UserRole = 'Employee' | 'Manager' | 'Executive' | 'CEO' | 'Board';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type DecisionStatus = 'Draft' | 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Escalated' | 'Executed';

export type OutcomeStatus = 'Success' | 'Partial Success' | 'Failure' | 'Pending';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
}

export interface AuthorityLimit {
  role: UserRole;
  maxBudget: number;
  maxBudgetDisplay: string;
  riskLevel: RiskLevel;
  approvalScope: string;
}

export interface Comment {
  id: string;
  author: User;
  content: string;
  timestamp: Date;
}

export interface ProCon {
  id: string;
  type: 'pro' | 'con';
  description: string;
  addedBy: User;
  timestamp: Date;
}

export interface AIEvaluation {
  id: string;
  decisionId: string;
  changePercentage: number;
  budgetChange: number;
  timelineChange: number;
  riskChange: number;
  expectedROI: number;
  riskAdjustedROI: number;
  breakEvenMonths: number;
  expectedValue: number;
  summary: string;
  impactBreakdown: {
    component: string;
    change: string;
    impact: string;
  }[];
  evaluatedAt: Date;
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  problemStatement: string;
  optionsConsidered: string[];
  budget: number;
  riskLevel: RiskLevel;
  status: DecisionStatus;
  createdBy: User;
  createdAt: Date;
  pros: ProCon[];
  cons: ProCon[];
  comments: Comment[];
  aiEvaluation?: AIEvaluation;
  approvers: User[];
  approvalTimestamps: { userId: string; timestamp: Date }[];
  meetingId?: string;
  outcomeStatus?: OutcomeStatus;
  successCriteria?: {
    roiTarget: number;
    timelineTarget: string;
    riskTolerance: string;
    complianceRequirements: string[];
  };
}

export interface AgendaItem {
  id: string;
  title: string;
  duration: number; // minutes
  presenter?: User;
  description?: string;
  linkedDecisionId?: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  location: string;
  chairperson: User;
  attendees: User[];
  agenda: AgendaItem[];
  decisions: Decision[];
  isApproved: boolean;
  approvedAt?: Date;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  submittedBy: User;
  submittedAt: Date;
  budget: number;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  department: string;
}
