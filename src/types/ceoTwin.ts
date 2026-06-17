export type DecisionCategory =
  | 'Strategy' | 'Partnership' | 'Hiring' | 'Finance'
  | 'Product' | 'Legal' | 'Sales' | 'Investor Relations';

export type Urgency = 'Low' | 'Normal' | 'High' | 'Critical';
export type RiskBand = 'Low' | 'Medium' | 'High';
export type DelegationLevel =
  | 'Team can decide'
  | 'Needs manager approval'
  | 'Needs CEO approval'
  | 'Escalate immediately';

export interface CEOProfile {
  name: string;
  title: string;
  company: string;
  priorities: string[];
  riskAppetite: { area: string; level: RiskBand; note: string }[];
  decisionStyle: string[];
  communicationStyle: string[];
  redLines: string[];
  delegationRules: string[];
  strategicFocus: string[];
}

export interface DecisionIntake {
  title: string;
  context: string;
  options: string;
  urgency: Urgency;
  financialImpactEUR: number;
  legalRisk: RiskBand;
  brandRisk: RiskBand;
  strategicRelevance: RiskBand;
  requestedBy: string;
  deadline?: string;
  category: DecisionCategory;
}

export interface AIRecommendation {
  recommendedAction: string;
  reasoning: string;
  similarPastDecisions: string[];
  riskLevel: RiskBand;
  ceoApprovalRequired: boolean;
  strategicAlignmentScore: number; // 0-100
  suggestedNextStep: string;
  suggestedMessage: string;
  delegationLevel: DelegationLevel;
}

export interface MemoryDecision {
  id: string;
  title: string;
  date: string;
  category: DecisionCategory;
  finalDecision: string;
  reasoning: string;
  acceptedRisks: string[];
  outcome: string;
  lessons: string;
}

export interface DelegationRule {
  id: string;
  condition: string;
  level: DelegationLevel;
}

export interface TrainingItem {
  id: string;
  kind: 'Past decision' | 'CEO note' | 'Strategy doc' | 'Investor update' | 'Email example' | 'Meeting note' | 'Principle';
  title: string;
  addedAt: string;
  size?: string;
}
