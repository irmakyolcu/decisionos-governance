import { useEffect, useState } from 'react';
import { Plug, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type Integration = {
  id: string;
  provider: string;
  display_name: string;
  kind: string;
  status: 'connected' | 'disconnected' | 'error';
  last_synced_at: string | null;
  config: Record<string, unknown>;
};

type CatalogEntry = { provider: string; display_name: string; kind: string; description: string; category: 'messaging' | 'meetings' | 'productivity' | 'crm' | 'erp' | 'hr' | 'finance' | 'itsm' | 'data' | 'security' | 'custom' };

const CATALOG: CatalogEntry[] = [
  // Messaging & Collaboration
  { provider: 'slack', display_name: 'Slack', kind: 'connector', category: 'messaging', description: 'Push approval requests and audit notifications to channels.' },
  { provider: 'teams', display_name: 'Microsoft Teams', kind: 'connector', category: 'messaging', description: 'Approval and notification channel for Microsoft 365 orgs.' },
  { provider: 'discord', display_name: 'Discord', kind: 'connector', category: 'messaging', description: 'Route notifications to Discord servers and channels.' },

  // Meetings & Transcription
  { provider: 'zoom', display_name: 'Zoom', kind: 'connector', category: 'meetings', description: 'Import Zoom meeting recordings and transcripts as decision evidence.' },
  { provider: 'google_meet', display_name: 'Google Meet', kind: 'connector', category: 'meetings', description: 'Pull Meet recordings and captions into decision context.' },
  { provider: 'ms_teams_meetings', display_name: 'Teams Meetings', kind: 'connector', category: 'meetings', description: 'Sync Microsoft Teams meeting transcripts and recordings.' },
  { provider: 'fireflies', display_name: 'Fireflies.ai', kind: 'connector', category: 'meetings', description: 'Auto-import AI meeting notes and action items.' },
  { provider: 'otter', display_name: 'Otter.ai', kind: 'connector', category: 'meetings', description: 'Sync Otter transcripts into structured meeting memory.' },
  { provider: 'fathom', display_name: 'Fathom', kind: 'connector', category: 'meetings', description: 'Import Fathom AI meeting summaries and highlights.' },
  { provider: 'gong', display_name: 'Gong', kind: 'connector', category: 'meetings', description: 'Import revenue-call intelligence into decisions.' },

  // Productivity & Docs
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

  // HR / HCM
  { provider: 'workday', display_name: 'Workday', kind: 'connector', category: 'hr', description: 'Workers, org hierarchy, and time-off from Workday.' },
  { provider: 'sap_successfactors', display_name: 'SAP SuccessFactors', kind: 'connector', category: 'hr', description: 'Employee central and performance data.' },
  { provider: 'bamboohr', display_name: 'BambooHR', kind: 'connector', category: 'hr', description: 'Employee records and org data for SMBs.' },
  { provider: 'rippling', display_name: 'Rippling', kind: 'connector', category: 'hr', description: 'People, payroll, and device context.' },

  // Finance / Accounting
  { provider: 'quickbooks', display_name: 'QuickBooks', kind: 'connector', category: 'finance', description: 'GL, invoices, and expenses.' },
  { provider: 'xero', display_name: 'Xero', kind: 'connector', category: 'finance', description: 'SMB accounting and cash flow.' },
  { provider: 'stripe', display_name: 'Stripe', kind: 'connector', category: 'finance', description: 'Revenue, subscriptions, and payout signals.' },

  // ITSM / DevOps
  { provider: 'servicenow', display_name: 'ServiceNow', kind: 'connector', category: 'itsm', description: 'Incidents, changes, and CMDB context.' },
  { provider: 'zendesk', display_name: 'Zendesk', kind: 'connector', category: 'itsm', description: 'Support tickets and CSAT signals.' },
  { provider: 'github', display_name: 'GitHub', kind: 'connector', category: 'itsm', description: 'Repos, PRs, and issue context for engineering decisions.' },
  { provider: 'gitlab', display_name: 'GitLab', kind: 'connector', category: 'itsm', description: 'DevOps pipelines and MR context.' },

  // Data / BI
  { provider: 'snowflake', display_name: 'Snowflake', kind: 'connector', category: 'data', description: 'Query the warehouse for decision KPIs.' },
  { provider: 'bigquery', display_name: 'BigQuery', kind: 'connector', category: 'data', description: 'Analytics warehouse metrics and cohorts.' },
  { provider: 'databricks', display_name: 'Databricks', kind: 'connector', category: 'data', description: 'Lakehouse tables and ML feature outputs.' },
  { provider: 'looker', display_name: 'Looker', kind: 'connector', category: 'data', description: 'Governed dashboards and Explores.' },
  { provider: 'powerbi', display_name: 'Power BI', kind: 'connector', category: 'data', description: 'Enterprise BI reports and datasets.' },
  { provider: 'tableau', display_name: 'Tableau', kind: 'connector', category: 'data', description: 'Dashboards and metric definitions.' },

  // Identity / Security
  { provider: 'okta', display_name: 'Okta', kind: 'connector', category: 'security', description: 'SSO, SCIM, and access governance.' },
  { provider: 'azure_ad', display_name: 'Microsoft Entra ID', kind: 'connector', category: 'security', description: 'Enterprise SSO and directory sync (Azure AD).' },

  // Custom
  { provider: 'mcp_custom', display_name: 'Custom MCP Server', kind: 'mcp', category: 'custom', description: 'Connect any Model Context Protocol server endpoint.' },
  { provider: 'webhook_custom', display_name: 'Custom Webhook', kind: 'webhook', category: 'custom', description: 'Send events to a custom HTTPS endpoint.' },
  { provider: 'rest_api_custom', display_name: 'Custom REST API', kind: 'rest', category: 'custom', description: 'Bring any internal system with a REST + API key.' },
];

const CATEGORY_LABELS: Record<CatalogEntry['category'], string> = {
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

export default function IntegrationsPage() {
  const { workspace, role } = useWorkspace();
  const { user } = useAuth();
  const isAdmin = role === 'admin';
  const [items, setItems] = useState<Integration[]>([]);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!workspace) return;
    setLoading(true);
    const { data } = await supabase
      .from('integrations')
      .select('*')
      .eq('workspace_id', workspace.id);
    setItems((data ?? []) as Integration[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id]);

  const byProvider = (p: string) => items.find((i) => i.provider === p);

  const connect = async (entry: typeof CATALOG[number]) => {
    if (!workspace || !user || !isAdmin) return;
    setBusyProvider(entry.provider);
    try {
      const existing = byProvider(entry.provider);
      const payload = {
        workspace_id: workspace.id,
        provider: entry.provider,
        display_name: entry.display_name,
        kind: entry.kind,
        status: 'connected' as const,
        last_synced_at: new Date().toISOString(),
        config: { simulated: true, connected_by: user.id },
        created_by: user.id,
      };
      if (existing) {
        await supabase.from('integrations').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('integrations').insert(payload);
      }
      toast.success(`${entry.display_name} connected (simulated)`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Connect failed');
    } finally {
      setBusyProvider(null);
    }
  };

  const disconnect = async (entry: typeof CATALOG[number]) => {
    const existing = byProvider(entry.provider);
    if (!existing || !isAdmin) return;
    setBusyProvider(entry.provider);
    await supabase.from('integrations').update({ status: 'disconnected' }).eq('id', existing.id);
    toast.success(`${entry.display_name} disconnected`);
    setBusyProvider(null);
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Plug className="h-6 w-6 text-primary" /> Integrations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect external systems used by the Execution Engine. Phase 3 connections are simulated — real OAuth and MCP wiring is enabled per provider on request.
        </p>
        {!isAdmin && (
          <p className="text-xs text-warning mt-2">Workspace admins manage integrations.</p>
        )}
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : (
        <div className="space-y-8">
          {(Object.keys(CATEGORY_LABELS) as CatalogEntry['category'][]).map((cat) => {
            const entries = CATALOG.filter((e) => e.category === cat);
            if (!entries.length) return null;
            return (
              <div key={cat}>
                <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide mb-3">{CATEGORY_LABELS[cat]}</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {entries.map((entry) => {
                    const existing = byProvider(entry.provider);
                    const connected = existing?.status === 'connected';
                    return (
                      <Card key={entry.provider}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{entry.display_name}</CardTitle>
                              <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>
                            </div>
                            <Badge variant="outline" className={connected ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}>
                              {connected ? <><Check className="h-3 w-3 mr-1" />Connected</> : <><X className="h-3 w-3 mr-1" />Not connected</>}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              {existing?.last_synced_at ? `Last synced ${new Date(existing.last_synced_at).toLocaleString()}` : 'Never synced'}
                            </div>
                            <div className="flex gap-2">
                              {connected ? (
                                <>
                                  <Button size="sm" variant="outline" disabled={!isAdmin || busyProvider === entry.provider} onClick={() => connect(entry)} className="gap-1">
                                    {busyProvider === entry.provider ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                    Sync
                                  </Button>
                                  <Button size="sm" variant="ghost" disabled={!isAdmin} onClick={() => disconnect(entry)}>Disconnect</Button>
                                </>
                              ) : (
                                <Button size="sm" disabled={!isAdmin || busyProvider === entry.provider} onClick={() => connect(entry)} className="gap-1">
                                  {busyProvider === entry.provider && <Loader2 className="h-3 w-3 animate-spin" />}
                                  Connect
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
