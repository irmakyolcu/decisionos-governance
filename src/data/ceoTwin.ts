import type { CEOProfile, DelegationRule, MemoryDecision, TrainingItem } from '@/types/ceoTwin';

export const ceoProfile: CEOProfile = {
  name: 'Irmak Gözübüyük',
  title: 'Founder & CEO',
  company: 'Inner Garden',
  priorities: [
    'Speed over perfection when downside risk is low',
    'Brand trust over short-term revenue',
    'Strategic partnerships over transactional deals',
    'Clear ownership before execution',
  ],
  riskAppetite: [
    { area: 'Product experiments', level: 'High', note: 'Ship fast, learn fast, reversible bets preferred.' },
    { area: 'Partnerships', level: 'Medium', note: 'Explore optionality early, commit only after validation.' },
    { area: 'Legal exposure', level: 'Low', note: 'Never sign without legal review for >€5k or multi-year scope.' },
    { area: 'Financial commitment', level: 'Low', note: 'Any spend over €5k requires CEO sign-off.' },
    { area: 'Reputational risk', level: 'Low', note: 'Brand trust is the strategic moat. Protect it.' },
  ],
  decisionStyle: [
    'Options-first: present 2–3 framed options with tradeoffs',
    'Prefers reversible bets over consensus',
    'Asks for the smallest test that resolves the question',
  ],
  communicationStyle: [
    'Direct and short',
    'Decision-oriented language',
    'Wants a clear recommended next step in every brief',
    'Bullet points over paragraphs',
  ],
  redLines: [
    'No commercial commitment before legal review',
    'No public statements without founder sign-off',
    'No equity, IP or exclusivity in early partnership talks',
    'No hiring without a defined 90-day success metric',
  ],
  delegationRules: [
    'Product experiments under €2k → team decides',
    'Hiring up to mid-level → COO approves, CEO informed',
    'Partnership exploratory calls → team can take them',
    'Financial commitment > €5k → CEO approval required',
    'Anything with legal, brand or PR exposure → CEO approval required',
  ],
  strategicFocus: [
    'Founder-led brand building',
    'Long-term partnerships with aligned values',
    'Defensible product moat through trust',
    'Operational leverage via clear ownership',
  ],
};

export const memoryDecisions: MemoryDecision[] = [
  {
    id: 'm1',
    title: 'Freshmango Accelerator evaluation',
    date: '2025-09-14',
    category: 'Partnership',
    finalDecision: 'Decline equity, keep relationship as advisory.',
    reasoning: 'Program value did not justify equity dilution at this stage. Mentor access can be replicated.',
    acceptedRisks: ['Foregone PR exposure', 'Slower intro to certain VCs'],
    outcome: 'Maintained cap table, kept warm relationship with program lead.',
    lessons: 'Equity is the most expensive currency. Default to no unless it solves a top-3 problem.',
  },
  {
    id: 'm2',
    title: 'VC outreach prioritization',
    date: '2025-10-02',
    category: 'Investor Relations',
    finalDecision: 'Focus on 12 mission-aligned funds, drop generic outbound.',
    reasoning: 'Generic outbound burned founder time with low conversion. Aligned funds had 4x meeting rate.',
    acceptedRisks: ['Smaller top of funnel', 'Slower round close'],
    outcome: 'Round closed in 9 weeks with two lead candidates.',
    lessons: 'Quality of fit beats volume in early-stage fundraising.',
  },
  {
    id: 'm3',
    title: 'School partnership pilot',
    date: '2025-11-21',
    category: 'Partnership',
    finalDecision: 'Run 6-week paid pilot before signing annual contract.',
    reasoning: 'Reversible bet, validates retention before committing operational load.',
    acceptedRisks: ['Slower revenue recognition'],
    outcome: 'Pilot retention 78%, converted to annual contract on better terms.',
    lessons: 'Always insert a paid pilot when partner asks for annual lock-in.',
  },
  {
    id: 'm4',
    title: 'Switch to in-house content production',
    date: '2026-01-08',
    category: 'Strategy',
    finalDecision: 'Bring core editorial in-house, keep video production agency.',
    reasoning: 'Brand voice is core IP. Video has clear deliverables and benefits from agency scale.',
    acceptedRisks: ['Hiring overhead', 'Onboarding ramp'],
    outcome: 'Editorial output up 3x, brand consistency score up.',
    lessons: 'Insource anything that is brand-defining. Outsource anything that is execution-defined.',
  },
  {
    id: 'm5',
    title: 'Refund policy expansion',
    date: '2026-02-19',
    category: 'Legal',
    finalDecision: 'Extend window to 30 days, restrict to first purchase.',
    reasoning: 'Brand trust upside outweighs marginal refund cost. Restriction limits abuse.',
    acceptedRisks: ['Slightly higher refund rate'],
    outcome: 'NPS up 11 points, refund rate +1.2% (within tolerance).',
    lessons: 'Trust gestures often pay back in retention, not the same quarter.',
  },
  {
    id: 'm6',
    title: 'Senior PM hire in Q1',
    date: '2026-03-04',
    category: 'Hiring',
    finalDecision: 'Hire from inside network with paid 2-week trial.',
    reasoning: 'Cultural fit and speed of ramp matter more than brand-name CV at this stage.',
    acceptedRisks: ['Smaller candidate pool'],
    outcome: 'Hire shipped first roadmap in 21 days.',
    lessons: 'For sub-50 team, trust signal beats credential signal.',
  },
];

export const delegationRules: DelegationRule[] = [
  { id: 'd1', condition: 'Legal risk = High', level: 'Needs CEO approval' },
  { id: 'd2', condition: 'Brand or reputational risk = High', level: 'Needs CEO approval' },
  { id: 'd3', condition: 'Financial commitment > €5,000', level: 'Needs CEO approval' },
  { id: 'd4', condition: 'Strategic partnership before commitment', level: 'Needs CEO approval' },
  { id: 'd5', condition: 'Hiring (mid-level and above)', level: 'Needs manager approval' },
  { id: 'd6', condition: 'Product experiment, reversible, < €2,000', level: 'Team can decide' },
  { id: 'd7', condition: 'Exploratory partnership call (no commitment)', level: 'Team can decide' },
  { id: 'd8', condition: 'Active PR crisis or data incident', level: 'Escalate immediately' },
  { id: 'd9', condition: 'Investor-facing public statement', level: 'Needs CEO approval' },
];

export const trainingItems: TrainingItem[] = [
  { id: 't1', kind: 'Strategy doc', title: '2026 Strategic Plan v2', addedAt: '2026-01-12', size: '14 pages' },
  { id: 't2', kind: 'Investor update', title: 'Q1 Investor Letter', addedAt: '2026-04-05', size: '3 pages' },
  { id: 't3', kind: 'Principle', title: 'Founding principles', addedAt: '2025-08-21', size: '1 page' },
  { id: 't4', kind: 'Past decision', title: 'Refund policy memo', addedAt: '2026-02-19', size: '2 pages' },
  { id: 't5', kind: 'Email example', title: 'Partnership decline template', addedAt: '2025-10-30' },
  { id: 't6', kind: 'Meeting note', title: 'Board sync — Mar 2026', addedAt: '2026-03-15', size: '4 pages' },
];

export const sampleIntakeRecommendation = {
  title: 'Partnership offer from a new AI accelerator',
  recommendation: {
    recommendedAction: 'Proceed to exploratory call, but do not commit commercially yet.',
    reasoning:
      "Matches the CEO's pattern: explore optionality quickly, but avoid legal or financial commitments before validation. Equity asks are a red line at this stage.",
    similarPastDecisions: [
      'Freshmango Accelerator evaluation',
      'VC outreach prioritization',
      'School partnership pilot',
    ],
    riskLevel: 'Medium' as const,
    ceoApprovalRequired: true,
    strategicAlignmentScore: 62,
    suggestedNextStep:
      'Ask for terms, references, expected ROI, founder time obligations, and any equity or exclusivity asks.',
    suggestedMessage:
      "Thanks for the intro — happy to take a 30-min exploratory call this week. Before we dive in, could you share program terms, founder time commitment, and any equity or exclusivity expectations? We're early-stage and protective of cap table, so we'd want to align on that upfront.",
    delegationLevel: 'Needs CEO approval' as const,
  },
};
