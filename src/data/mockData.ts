import { AuthorityLimit } from '@/types/decision';

// Static authority reference data (not stored in DB — referenced by Authority page and limit checks)
export const authorityLimits: AuthorityLimit[] = [
  { role: 'Employee', maxBudget: 0, maxBudgetDisplay: '€0', riskLevel: 'Low', approvalScope: 'None' },
  { role: 'Manager', maxBudget: 250000, maxBudgetDisplay: '€250k', riskLevel: 'Medium', approvalScope: 'Department' },
  { role: 'Executive', maxBudget: 2000000, maxBudgetDisplay: '€2M', riskLevel: 'High', approvalScope: 'Multi-department' },
  { role: 'CEO', maxBudget: 5000000, maxBudgetDisplay: '€5M', riskLevel: 'High', approvalScope: 'Organization' },
  { role: 'Board', maxBudget: Infinity, maxBudgetDisplay: 'Unlimited', riskLevel: 'Critical', approvalScope: 'Full authority' },
];
