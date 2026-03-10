import { User, AuthorityLimit, Decision, Meeting, Proposal, AIEvaluation } from '@/types/decision';

export const currentUser: User = {
  id: 'user-1',
  name: 'Alexandra Chen',
  email: 'alexandra.chen@company.com',
  role: 'CEO',
  department: 'Executive',
  avatarUrl: undefined,
};

export const users: User[] = [
  currentUser,
  { id: 'user-2', name: 'Michael Torres', email: 'michael.torres@company.com', role: 'Executive', department: 'Finance' },
  { id: 'user-3', name: 'Sarah Johnson', email: 'sarah.johnson@company.com', role: 'Executive', department: 'Operations' },
  { id: 'user-4', name: 'David Kim', email: 'david.kim@company.com', role: 'Manager', department: 'Engineering' },
  { id: 'user-5', name: 'Emily Watson', email: 'emily.watson@company.com', role: 'Manager', department: 'Marketing' },
  { id: 'user-6', name: 'James Miller', email: 'james.miller@company.com', role: 'Employee', department: 'Engineering' },
  { id: 'user-7', name: 'Board Committee', email: 'board@company.com', role: 'Board', department: 'Board of Directors' },
];

export const authorityLimits: AuthorityLimit[] = [
  { role: 'Employee', maxBudget: 0, maxBudgetDisplay: '€0', riskLevel: 'Low', approvalScope: 'None' },
  { role: 'Manager', maxBudget: 250000, maxBudgetDisplay: '€250k', riskLevel: 'Medium', approvalScope: 'Department' },
  { role: 'Executive', maxBudget: 2000000, maxBudgetDisplay: '€2M', riskLevel: 'High', approvalScope: 'Multi-department' },
  { role: 'CEO', maxBudget: 5000000, maxBudgetDisplay: '€5M', riskLevel: 'High', approvalScope: 'Organization' },
  { role: 'Board', maxBudget: Infinity, maxBudgetDisplay: 'Unlimited', riskLevel: 'Critical', approvalScope: 'Full authority' },
];

const aiEvaluation1: AIEvaluation = {
  id: 'ai-1',
  decisionId: 'dec-1',
  changePercentage: 18,
  budgetChange: -12,
  timelineChange: 6,
  riskChange: -9,
  expectedROI: 32,
  riskAdjustedROI: 24,
  breakEvenMonths: 14,
  expectedValue: 1800000,
  summary: 'This decision shows strong potential for cost optimization with a calculated ROI of 32%. The 6% timeline extension is acceptable given the 12% budget reduction. Risk profile improves by 9 points due to comprehensive mitigation strategies. Recommend proceeding with enhanced monitoring.',
  impactBreakdown: [
    { component: 'Budget', change: '-12%', impact: 'Cost reduction' },
    { component: 'Timeline', change: '+6%', impact: 'Moderate delay' },
    { component: 'Risk', change: '-9 points', impact: 'Improvement' },
    { component: 'Resources', change: '+8%', impact: 'Additional staffing' },
  ],
  evaluatedAt: new Date('2024-01-15'),
};

export const decisions: Decision[] = [
  {
    id: 'dec-1',
    title: 'Cloud Infrastructure Migration',
    description: 'Migrate on-premise infrastructure to AWS cloud services for improved scalability and cost efficiency.',
    problemStatement: 'Current on-premise infrastructure is reaching capacity limits and maintenance costs are increasing by 15% annually.',
    optionsConsidered: ['AWS Migration', 'Azure Migration', 'Hybrid Cloud Approach', 'Infrastructure Expansion'],
    budget: 2500000,
    riskLevel: 'High',
    status: 'Under Review',
    createdBy: users[1],
    createdAt: new Date('2024-01-10'),
    pros: [
      { id: 'pro-1', type: 'pro', description: 'Reduces infrastructure costs by 30% over 3 years', addedBy: users[1], timestamp: new Date('2024-01-11') },
      { id: 'pro-2', type: 'pro', description: 'Enables auto-scaling for peak demand periods', addedBy: users[2], timestamp: new Date('2024-01-12') },
    ],
    cons: [
      { id: 'con-1', type: 'con', description: 'Initial migration requires 6-month timeline', addedBy: users[3], timestamp: new Date('2024-01-11') },
      { id: 'con-2', type: 'con', description: 'Staff retraining required for cloud operations', addedBy: users[4], timestamp: new Date('2024-01-13') },
    ],
    comments: [
      { id: 'com-1', author: users[0], content: 'We need to ensure compliance with data residency requirements.', timestamp: new Date('2024-01-14') },
    ],
    aiEvaluation: aiEvaluation1,
    approvers: [],
    approvalTimestamps: [],
    successCriteria: {
      roiTarget: 25,
      timelineTarget: '6 months',
      riskTolerance: 'Medium',
      complianceRequirements: ['SOC 2', 'GDPR', 'ISO 27001'],
    },
  },
  {
    id: 'dec-2',
    title: 'Strategic Partnership with TechCorp',
    description: 'Enter into a strategic partnership agreement with TechCorp for joint product development.',
    problemStatement: 'Need to accelerate time-to-market for new product lines while sharing R&D costs.',
    optionsConsidered: ['TechCorp Partnership', 'InnovateCo Partnership', 'Internal Development', 'Acquisition'],
    budget: 8000000,
    riskLevel: 'Critical',
    status: 'Escalated',
    createdBy: users[0],
    createdAt: new Date('2024-01-05'),
    pros: [
      { id: 'pro-3', type: 'pro', description: 'Access to TechCorp\'s AI research capabilities', addedBy: users[0], timestamp: new Date('2024-01-06') },
    ],
    cons: [
      { id: 'con-3', type: 'con', description: 'Significant budget commitment exceeds CEO authority', addedBy: users[1], timestamp: new Date('2024-01-07') },
    ],
    comments: [],
    approvers: [],
    approvalTimestamps: [],
    successCriteria: {
      roiTarget: 40,
      timelineTarget: '24 months',
      riskTolerance: 'High',
      complianceRequirements: ['Antitrust Review', 'Board Approval'],
    },
  },
  {
    id: 'dec-3',
    title: 'Marketing Campaign Q2 2024',
    description: 'Launch integrated marketing campaign for new product line across digital and traditional channels.',
    problemStatement: 'New product line needs market visibility to achieve Q2 sales targets.',
    optionsConsidered: ['Full Campaign', 'Digital Only', 'Regional Rollout'],
    budget: 180000,
    riskLevel: 'Low',
    status: 'Approved',
    createdBy: users[4],
    createdAt: new Date('2024-01-08'),
    pros: [
      { id: 'pro-4', type: 'pro', description: 'Expected 25% increase in brand awareness', addedBy: users[4], timestamp: new Date('2024-01-08') },
    ],
    cons: [
      { id: 'con-4', type: 'con', description: 'Competitive market may dilute message impact', addedBy: users[3], timestamp: new Date('2024-01-09') },
    ],
    comments: [],
    approvers: [users[3]],
    approvalTimestamps: [{ userId: 'user-4', timestamp: new Date('2024-01-10') }],
    outcomeStatus: 'Pending',
  },
];

export const meetings: Meeting[] = [
  {
    id: 'meet-1',
    title: 'Q1 Board Strategy Review',
    date: new Date('2024-01-20'),
    startTime: '09:00',
    endTime: '12:00',
    duration: 180,
    location: 'Executive Boardroom A',
    chairperson: users[6],
    attendees: [users[0], users[1], users[2], users[6]],
    agenda: [
      { id: 'ag-1', title: 'Q4 Financial Review', duration: 30, presenter: users[1] },
      { id: 'ag-2', title: 'Strategic Partnership Proposals', duration: 45, presenter: users[0], linkedDecisionId: 'dec-2' },
      { id: 'ag-3', title: 'Infrastructure Investment Decision', duration: 45, presenter: users[2], linkedDecisionId: 'dec-1' },
      { id: 'ag-4', title: 'Risk Assessment Update', duration: 30 },
    ],
    decisions: [decisions[1]],
    isApproved: false,
  },
  {
    id: 'meet-2',
    title: 'Executive Committee Meeting',
    date: new Date('2024-01-15'),
    startTime: '14:00',
    endTime: '16:00',
    duration: 120,
    location: 'Video Conference - Teams',
    chairperson: users[0],
    attendees: [users[0], users[1], users[2]],
    agenda: [
      { id: 'ag-5', title: 'Cloud Migration Update', duration: 30, presenter: users[2] },
      { id: 'ag-6', title: 'Budget Reallocation', duration: 30, presenter: users[1] },
    ],
    decisions: [decisions[0]],
    isApproved: true,
    approvedAt: new Date('2024-01-15'),
  },
];

export const proposals: Proposal[] = [
  {
    id: 'prop-1',
    title: 'Employee Training Program Expansion',
    description: 'Expand professional development programs to include cloud certification and leadership training.',
    submittedBy: users[3],
    submittedAt: new Date('2024-01-18'),
    budget: 150000,
    status: 'Under Review',
    department: 'Engineering',
  },
  {
    id: 'prop-2',
    title: 'New CRM Implementation',
    description: 'Replace legacy CRM system with Salesforce for improved customer relationship management.',
    submittedBy: users[4],
    submittedAt: new Date('2024-01-16'),
    budget: 320000,
    status: 'Submitted',
    department: 'Marketing',
  },
  {
    id: 'prop-3',
    title: 'Office Space Renovation',
    description: 'Renovate 3rd floor to create collaborative workspace and meeting areas.',
    submittedBy: users[5],
    submittedAt: new Date('2024-01-14'),
    budget: 450000,
    status: 'Approved',
    department: 'Operations',
  },
];

export const dashboardMetrics = {
  totalDecisions: 47,
  pendingApprovals: 8,
  successRate: 78,
  failureRate: 12,
  avgROI: 24,
  escalatedDecisions: 3,
  decisionsThisMonth: 12,
  budgetUtilized: 4200000,
  budgetAllocated: 6000000,
};

export const analyticsData = {
  decisionsByMonth: [
    { month: 'Jan', decisions: 8, approved: 6, rejected: 2 },
    { month: 'Feb', decisions: 12, approved: 10, rejected: 2 },
    { month: 'Mar', decisions: 10, approved: 8, rejected: 2 },
    { month: 'Apr', decisions: 15, approved: 12, rejected: 3 },
    { month: 'May', decisions: 11, approved: 9, rejected: 2 },
    { month: 'Jun', decisions: 14, approved: 11, rejected: 3 },
  ],
  outcomeDistribution: [
    { name: 'Success', value: 65, color: 'hsl(142, 76%, 36%)' },
    { name: 'Partial Success', value: 20, color: 'hsl(38, 92%, 50%)' },
    { name: 'Failure', value: 10, color: 'hsl(0, 72%, 51%)' },
    { name: 'Pending', value: 5, color: 'hsl(215, 15%, 47%)' },
  ],
  escalationsByRole: [
    { role: 'Manager', escalated: 12 },
    { role: 'Executive', escalated: 8 },
    { role: 'CEO', escalated: 3 },
  ],
  topDecisionMakers: [
    { name: 'Alexandra Chen', decisions: 24, successRate: 85 },
    { name: 'Michael Torres', decisions: 18, successRate: 78 },
    { name: 'Sarah Johnson', decisions: 15, successRate: 82 },
  ],
};
