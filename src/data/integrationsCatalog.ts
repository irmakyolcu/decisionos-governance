export type IntegrationCategory =
  | 'messaging'
  | 'meetings'
  | 'productivity'
  | 'crm'
  | 'erp'
  | 'hr'
  | 'finance'
  | 'itsm'
  | 'data'
  | 'security'
  | 'custom';

export type CatalogEntry = {
  provider: string;
  display_name: string;
  kind: string;
  description: string;
  category: IntegrationCategory;
};

export const CATALOG: CatalogEntry[] = [
  // Messaging & Collaboration
  { provider: 'slack', display_name: 'Slack', kind: 'connector', category: 'messaging', description: 'Push approval requests and audit notifications to channels.' },
  { provider: 'teams', display_name: 'Microsoft Teams', kind: 'connector', category: 'messaging', description: 'Approval and notification channel for Microsoft 365 orgs.' },
  { provider: 'discord', display_name: 'Discord', kind: 'connector', category: 'messaging', description: 'Route notifications to Discord servers and channels.' },

  // Meetings
  { provider: 'zoom', display_name: 'Zoom', kind: 'connector', category: 'meetings', description: 'Import Zoom meeting recordings and transcripts as decision evidence.' },
  { provider: 'google_meet', display_name: 'Google Meet', kind: 'connector', category: 'meetings', description: 'Pull Meet recordings and captions into decision context.' },
  { provider: 'ms_teams_meetings', display_name: 'Teams Meetings', kind: 'connector', category: 'meetings', description: 'Sync Microsoft Teams meeting transcripts and recordings.' },
  { provider: 'fireflies', display_name: 'Fireflies.ai', kind: 'connector', category: 'meetings', description: 'Auto-import AI meeting notes and action items.' },
  { provider: 'otter', display_name: 'Otter.ai', kind: 'connector', category: 'meetings', description: 'Sync Otter transcripts into structured meeting memory.' },
  { provider: 'fathom', display_name: 'Fathom', kind: 'connector', category: 'meetings', description: 'Import Fathom AI meeting summaries and highlights.' },
  { provider: 'gong', display_name: 'Gong', kind: 'connector', category: 'meetings', description: 'Import revenue-call intelligence into decisions.' },

  // Productivity
  { provider: 'gmail', display_name: 'Gmail', kind: 'connector', category: 'productivity', description: 'Send and receive emails as part of approved actions.' },
  { provider: 'google_calendar', display_name: 'Google Calendar', kind: 'connector', category: 'productivity', description: 'Schedule decision review meetings and reminders.' },
  { provider: 'gdrive', display_name: 'Google Drive', kind: 'connector', category: 'productivity', description: 'Attach evidence files to decisions.' },
  { provider: 'notion', display_name: 'Notion', kind: 'connector', category: 'productivity', description: 'Sync Notion docs into the Company Brain.' },
  { provider: 'confluence', display_name: 'Confluence', kind: 'connector', category: 'productivity', description: 'Ingest Confluence spaces as governed knowledge.' },
  { provider: 'sharepoint', display_name: 'SharePoint', kind: 'connector', category: 'productivity', description: 'Index SharePoint sites, lists, and documents.' },
  { provider: 'onedrive', display_name: 'OneDrive', kind: 'connector', category: 'productivity', description: 'Attach OneDrive files as decision evidence.' },
  { provider: 'dropbox', display_name: 'Dropbox', kind: 'connector', category: 'productivity', description: 'Sync Dropbox folders into the document store.' },
  { provider: 'box', display_name: 'Box', kind: 'connector', category: 'productivity', description: 'Enterprise document sync with retention support.' },
  { provider: 'jira', display_name: 'Jira', kind: 'connector', category: 'productivity', description: 'Create issues from approved action proposals.' },

  // CRM
  { provider: 'salesforce', display_name: 'Salesforce', kind: 'connector', category: 'crm', description: 'Pull deal context and push CRM updates after execution.' },
  { provider: 'hubspot', display_name: 'HubSpot', kind: 'connector', category: 'crm', description: 'Sync customer signals into decision intake.' },
  { provider: 'ms_dynamics_365', display_name: 'Microsoft Dynamics 365', kind: 'connector', category: 'crm', description: 'Sync accounts, opportunities, and cases from Dynamics 365.' },
  { provider: 'zoho_crm', display_name: 'Zoho CRM', kind: 'connector', category: 'crm', description: 'Pipeline and customer signals from Zoho CRM.' },
  { provider: 'pipedrive', display_name: 'Pipedrive', kind: 'connector', category: 'crm', description: 'Deal and activity context from Pipedrive.' },

  // ERP
  { provider: 'sap_s4hana', display_name: 'SAP S/4HANA', kind: 'connector', category: 'erp', description: 'Financials, supply chain, and procurement master data.' },
  { provider: 'sap_ariba', display_name: 'SAP Ariba', kind: 'connector', category: 'erp', description: 'Procurement contracts and supplier risk signals.' },
  { provider: 'oracle_erp_cloud', display_name: 'Oracle ERP Cloud', kind: 'connector', category: 'erp', description: 'GL, AP/AR, and project financials from Oracle Fusion.' },
  { provider: 'oracle_netsuite', display_name: 'Oracle NetSuite', kind: 'connector', category: 'erp', description: 'Financials and operational KPIs from NetSuite.' },
  { provider: 'ms_dynamics_365_fo', display_name: 'Dynamics 365 Finance & Ops', kind: 'connector', category: 'erp', description: 'ERP data from Microsoft Dynamics 365 F&O.' },
  { provider: 'ifs_cloud', display_name: 'IFS Cloud', kind: 'connector', category: 'erp', description: 'Asset, project, and service ERP for industrial orgs.' },
  { provider: 'infor_cloudsuite', display_name: 'Infor CloudSuite', kind: 'connector', category: 'erp', description: 'Industry-specific ERP from Infor.' },
  { provider: 'logo_netsis', display_name: 'Logo Netsis', kind: 'connector', category: 'erp', description: 'Turkish ERP: finance, inventory, and procurement.' },
  { provider: 'mikro_erp', display_name: 'Mikro ERP', kind: 'connector', category: 'erp', description: 'Turkish ERP: sales, purchasing, and accounting.' },

  // HR
  { provider: 'workday', display_name: 'Workday', kind: 'connector', category: 'hr', description: 'Workers, org hierarchy, and time-off from Workday.' },
  { provider: 'sap_successfactors', display_name: 'SAP SuccessFactors', kind: 'connector', category: 'hr', description: 'Employee central and performance data.' },
  { provider: 'bamboohr', display_name: 'BambooHR', kind: 'connector', category: 'hr', description: 'Employee records and org data for SMBs.' },
  { provider: 'rippling', display_name: 'Rippling', kind: 'connector', category: 'hr', description: 'People, payroll, and device context.' },

  // Finance
  { provider: 'quickbooks', display_name: 'QuickBooks', kind: 'connector', category: 'finance', description: 'GL, invoices, and expenses.' },
  { provider: 'xero', display_name: 'Xero', kind: 'connector', category: 'finance', description: 'SMB accounting and cash flow.' },
  { provider: 'stripe', display_name: 'Stripe', kind: 'connector', category: 'finance', description: 'Revenue, subscriptions, and payout signals.' },

  // ITSM
  { provider: 'servicenow', display_name: 'ServiceNow', kind: 'connector', category: 'itsm', description: 'Incidents, changes, and CMDB context.' },
  { provider: 'zendesk', display_name: 'Zendesk', kind: 'connector', category: 'itsm', description: 'Support tickets and CSAT signals.' },
  { provider: 'github', display_name: 'GitHub', kind: 'connector', category: 'itsm', description: 'Repos, PRs, and issue context for engineering decisions.' },
  { provider: 'gitlab', display_name: 'GitLab', kind: 'connector', category: 'itsm', description: 'DevOps pipelines and MR context.' },

  // Data
  { provider: 'snowflake', display_name: 'Snowflake', kind: 'connector', category: 'data', description: 'Query the warehouse for decision KPIs.' },
  { provider: 'bigquery', display_name: 'BigQuery', kind: 'connector', category: 'data', description: 'Analytics warehouse metrics and cohorts.' },
  { provider: 'databricks', display_name: 'Databricks', kind: 'connector', category: 'data', description: 'Lakehouse tables and ML feature outputs.' },
  { provider: 'looker', display_name: 'Looker', kind: 'connector', category: 'data', description: 'Governed dashboards and Explores.' },
  { provider: 'powerbi', display_name: 'Power BI', kind: 'connector', category: 'data', description: 'Enterprise BI reports and datasets.' },
  { provider: 'tableau', display_name: 'Tableau', kind: 'connector', category: 'data', description: 'Dashboards and metric definitions.' },

  // Security
  { provider: 'okta', display_name: 'Okta', kind: 'connector', category: 'security', description: 'SSO, SCIM, and access governance.' },
  { provider: 'azure_ad', display_name: 'Microsoft Entra ID', kind: 'connector', category: 'security', description: 'Enterprise SSO and directory sync (Azure AD).' },

  // Custom
  { provider: 'mcp_custom', display_name: 'Custom MCP Server', kind: 'mcp', category: 'custom', description: 'Connect any Model Context Protocol server endpoint.' },
  { provider: 'webhook_custom', display_name: 'Custom Webhook', kind: 'webhook', category: 'custom', description: 'Send events to a custom HTTPS endpoint.' },
  { provider: 'rest_api_custom', display_name: 'Custom REST API', kind: 'rest', category: 'custom', description: 'Bring any internal system with a REST + API key.' },
];

export const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  messaging: 'Messaging & Collaboration',
  meetings: 'Meetings & Transcription',
  productivity: 'Productivity & Docs',
  crm: 'CRM',
  erp: 'ERP',
  hr: 'HR / HCM',
  finance: 'Finance & Accounting',
  itsm: 'ITSM & DevOps',
  data: 'Data & BI',
  security: 'Identity & Security',
  custom: 'Custom',
};

type CategoryProfile = {
  overview: string;
  useCases: string[];
  // dataFlow: [from, arrow-label, to]
  dataFlow: { source: string; via: string; target: string; note: string }[];
  dataTypes: string[];
  writeBack: string;
  governance: string;
};

export const CATEGORY_PROFILES: Record<IntegrationCategory, CategoryProfile> = {
  messaging: {
    overview:
      'Messaging connectors turn chat platforms into a governed approval and notification surface. DecisionOS posts structured cards, receives approvals inline, and mirrors every action into the audit ledger.',
    useCases: [
      'Route high-authority action proposals to a channel with Approve / Reject buttons.',
      'Broadcast decision outcomes and post-mortems to leadership channels.',
      'Alert on-call owners when an anomaly or policy violation is detected.',
    ],
    dataFlow: [
      { source: 'DecisionOS', via: 'Outbound webhook', target: 'Channel message', note: 'Signed approval card with decision link' },
      { source: 'User click', via: 'Interaction callback', target: 'DecisionOS approvals API', note: 'Signature verified, actor recorded' },
      { source: 'DecisionOS', via: 'Audit trigger', target: 'audit_events ledger', note: 'Append-only, hash-chained' },
    ],
    dataTypes: ['Channel + user IDs', 'Message content (approvals, alerts)', 'Interaction payloads'],
    writeBack: 'Two-way: DecisionOS posts messages; users click approve/reject which mutates decisions.',
    governance: 'No customer PII is written to channels. Only workspace admins can install; scopes are least-privilege (chat:write, commands).',
  },
  meetings: {
    overview:
      'Meeting connectors pull transcripts, recordings, and AI-generated summaries into the Decision Memory, linking spoken context to the decisions that come out of it.',
    useCases: [
      'Attach a Zoom or Teams transcript as evidence on a decision record.',
      'Auto-extract action items and create action proposals for approval.',
      'Search across all past meetings for prior discussion on a topic.',
    ],
    dataFlow: [
      { source: 'Meeting platform', via: 'OAuth + webhook', target: 'Ingestion worker', note: 'On recording ready event' },
      { source: 'Ingestion worker', via: 'Embeddings pipeline', target: 'meeting_recordings + vector index', note: 'PII scrubbed if enabled' },
      { source: 'Decision Room', via: 'Semantic query', target: 'Transcript excerpts as evidence', note: 'Cited in decision memory' },
    ],
    dataTypes: ['Transcripts (text)', 'Recording URLs', 'Participants', 'AI summaries and action items'],
    writeBack: 'One-way ingest by default. Optional write-back to post action-item follow-ups.',
    governance: 'Retention window configurable per workspace. Sensitivity tags block ingest of restricted meetings.',
  },
  productivity: {
    overview:
      'Productivity and document connectors index files, docs, and calendars into the Company Brain so decisions can cite the source of truth instead of copy-pasted snippets.',
    useCases: [
      'Cite a specific SharePoint page or Notion doc as decision evidence.',
      'Auto-schedule a decision review meeting when an approval is granted.',
      'Turn an approved action into a Jira issue with linked context.',
    ],
    dataFlow: [
      { source: 'Doc platform', via: 'OAuth + delta sync', target: 'Document store + embeddings', note: 'Change tokens tracked per source' },
      { source: 'Ask DecisionOS', via: 'RAG retrieval', target: 'Cited answer with source URL', note: 'Row-level ACL enforced' },
      { source: 'Approved action', via: 'Outbound API', target: 'Jira issue / Calendar event', note: 'Only on approval, never speculative' },
    ],
    dataTypes: ['Document text and metadata', 'File attachments', 'Calendar events', 'Ticket/issue records'],
    writeBack: 'Two-way: read for context; write only after human approval of the specific action.',
    governance: 'File-level ACLs from the source are honored. Sensitive folders can be excluded per workspace policy.',
  },
  crm: {
    overview:
      'CRM connectors bring customer, pipeline, and deal signals into the intake stage so revenue decisions are grounded in the current sales reality.',
    useCases: [
      'Enrich a decision intake with the top 10 at-risk accounts this quarter.',
      'Push an approved discount policy update back to opportunity records.',
      'Trigger a decision spac when a deal above threshold enters negotiation.',
    ],
    dataFlow: [
      { source: 'CRM', via: 'API + webhooks', target: 'Structured memory (accounts, opps)', note: 'Nightly full + real-time delta' },
      { source: 'Decision engine', via: 'Signal join', target: 'Decision intake context', note: 'Filtered by role visibility' },
      { source: 'Approved action', via: 'Outbound write', target: 'CRM record update', note: 'Field-level audit logged' },
    ],
    dataTypes: ['Accounts', 'Opportunities', 'Contacts', 'Activities', 'Custom objects'],
    writeBack: 'Two-way. Writes are scoped to fields explicitly enabled per policy.',
    governance: 'Territory and role filters mirror the CRM. Field-level masking available for PII.',
  },
  erp: {
    overview:
      'ERP connectors provide the financial and operational ground truth — GL, procurement, inventory, projects — needed to model the impact of a decision before it is approved.',
    useCases: [
      'Attach live GL balances and open POs as evidence on a capex decision.',
      'Simulate the P&L impact of a pricing change against actuals.',
      'Post an approved journal entry or PO after multi-level approval.',
    ],
    dataFlow: [
      { source: 'ERP', via: 'OData / API / CDC', target: 'Governed data lake', note: 'Read-only replica per workspace' },
      { source: 'Scenario engine', via: 'SQL / semantic model', target: 'Impact projections', note: 'Explained in the decision room' },
      { source: 'Approved action', via: 'Signed ERP API call', target: 'Journal / PO / master data update', note: 'Segregation-of-duties enforced' },
    ],
    dataTypes: ['GL, AP/AR', 'Purchase orders', 'Suppliers', 'Inventory', 'Projects and cost centers'],
    writeBack: 'Two-way. All writes route through the Execution Center with dual approval by default.',
    governance: 'SoD checks against role. Every write is signed and mirrored to the audit ledger.',
  },
  hr: {
    overview:
      'HR/HCM connectors sync the org graph, roles, and headcount signals used by the delegation engine and authority levels.',
    useCases: [
      'Auto-map DecisionOS roles to the live reporting hierarchy.',
      'Model a reorg or headcount plan against current worker data.',
      'Escalate an approval to the correct manager based on Workday reporting line.',
    ],
    dataFlow: [
      { source: 'HCM', via: 'SCIM / API', target: 'org_graph + user_roles', note: 'Managers and cost centers synced' },
      { source: 'Delegation engine', via: 'Role lookup', target: 'Approval routing', note: 'Falls back to next level up' },
      { source: 'Approved action', via: 'Outbound API', target: 'HR record update', note: 'Rare; e.g. cost center reassignment' },
    ],
    dataTypes: ['Workers', 'Manager chain', 'Cost centers', 'Positions', 'Time-off (optional)'],
    writeBack: 'Mostly read-only. Writes limited to non-sensitive attributes.',
    governance: 'PII minimization enforced. Only identifiers required for routing are retained.',
  },
  finance: {
    overview:
      'Finance connectors ground every decision with a dollar impact in the actual books — cash, revenue, expenses — so approvals have real thresholds instead of guesses.',
    useCases: [
      'Enforce a spend policy against real-time cash position.',
      'Attach subscription MRR trends as evidence on a pricing decision.',
      'Post an approved invoice or refund with full audit trail.',
    ],
    dataFlow: [
      { source: 'Finance system', via: 'API sync', target: 'Financial fact tables', note: 'Reconciled daily' },
      { source: 'Policy engine', via: 'Threshold check', target: 'Auto-escalation', note: 'e.g. > cash threshold → CFO approval' },
      { source: 'Approved action', via: 'API write', target: 'Invoice / refund / journal', note: 'Idempotent with client_ref' },
    ],
    dataTypes: ['GL balances', 'Invoices', 'Payments', 'Subscriptions', 'Payouts'],
    writeBack: 'Two-way. Idempotent writes with reconciliation back into the ledger.',
    governance: 'Financial data is workspace-scoped and never leaves the tenant boundary.',
  },
  itsm: {
    overview:
      'ITSM and DevOps connectors close the loop between decisions and the systems that actually execute change — incidents, changes, and code.',
    useCases: [
      'Attach the incident timeline as evidence on a post-decision review.',
      'Open a ServiceNow change request from an approved infrastructure decision.',
      'Reference the PR that implements the approved technical direction.',
    ],
    dataFlow: [
      { source: 'ITSM/DevOps', via: 'API + webhooks', target: 'operational_events', note: 'Incidents, changes, PRs' },
      { source: 'Decision room', via: 'Reference lookup', target: 'Linked evidence chips', note: 'Deep link back to source' },
      { source: 'Approved action', via: 'Outbound API', target: 'Change request / issue / PR comment', note: 'CAB-aware' },
    ],
    dataTypes: ['Incidents', 'Changes', 'Tickets', 'Repos, PRs, issues'],
    writeBack: 'Two-way. Change requests respect CAB rules.',
    governance: 'Scoped tokens per repo/queue. Write scopes explicitly enabled per action type.',
  },
  data: {
    overview:
      'Data & BI connectors let DecisionOS query the warehouse and cite governed metrics — not screenshots — as evidence for every decision.',
    useCases: [
      'Cite the exact Looker metric and query snapshot on a decision.',
      'Materialize a Snowflake KPI into the Decision Twin as a leading indicator.',
      'Run a scenario query against a modeled table live in the Decision Room.',
    ],
    dataFlow: [
      { source: 'Warehouse / BI', via: 'JDBC / API', target: 'Metric registry + snapshots', note: 'Snapshots pinned per decision' },
      { source: 'Decision engine', via: 'Semantic layer', target: 'Governed metric answer', note: 'Row-level policies enforced' },
      { source: 'Twin', via: 'Scheduled refresh', target: 'Leading indicator series', note: 'Trend + threshold alerts' },
    ],
    dataTypes: ['Tables, views', 'Modeled metrics', 'Dashboards', 'Query results'],
    writeBack: 'Read-only.',
    governance: 'Runs under a scoped warehouse role. Every query is logged with the decision it served.',
  },
  security: {
    overview:
      'Identity connectors provide SSO, SCIM provisioning, and directory sync so DecisionOS enforces the same access controls as the rest of the enterprise.',
    useCases: [
      'Sign in with the corporate IdP and inherit group-based roles.',
      'Auto-deprovision access when a worker leaves.',
      'Enforce MFA on high-authority actions via step-up auth.',
    ],
    dataFlow: [
      { source: 'IdP', via: 'SAML / OIDC', target: 'DecisionOS session', note: 'Just-in-time provisioning' },
      { source: 'IdP', via: 'SCIM', target: 'user_roles + workspace_members', note: 'Group → role mapping' },
      { source: 'High-authority action', via: 'Step-up prompt', target: 'IdP MFA challenge', note: 'Result recorded in audit' },
    ],
    dataTypes: ['User profile claims', 'Group memberships', 'MFA assertions'],
    writeBack: 'Read for auth; SCIM writes limited to deprovisioning events.',
    governance: 'No passwords stored. Session tokens are short-lived and rotated.',
  },
  custom: {
    overview:
      'Custom connectors — MCP servers, webhooks, and REST APIs — let you bring internal systems that do not have a native integration into the same governed workflow.',
    useCases: [
      'Expose an internal microservice as a governed tool via MCP.',
      'Fan out approved-action events to a legacy system via signed webhook.',
      'Call a home-grown pricing engine from the Decision Room.',
    ],
    dataFlow: [
      { source: 'Your system', via: 'MCP / REST', target: 'Tool registry', note: 'Schema + auth registered per tool' },
      { source: 'Decision engine', via: 'Tool call', target: 'Your endpoint', note: 'Scoped API key, per-call audit' },
      { source: 'Approved action', via: 'Signed webhook', target: 'Your listener', note: 'HMAC signature, retries with backoff' },
    ],
    dataTypes: ['Whatever you expose in the tool schema.'],
    writeBack: 'Two-way. You control the scopes.',
    governance: 'Each custom endpoint runs under its own API key and appears in the audit ledger like any first-party connector.',
  },
};

export function findEntry(provider: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.provider === provider);
}
