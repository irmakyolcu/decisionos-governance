import { Shield, Lock, Database, Users, FileText, Mail } from "lucide-react";

export default function TrustPage() {
  const sections = [
    {
      icon: Lock,
      title: "Access & Authentication",
      body: "DecisionOS requires email or Google sign-in. Sessions are managed by our backend provider, with JWT-based access tokens and automatic refresh. Workspaces are isolated at the database level: members can only see data inside workspaces they belong to.",
    },
    {
      icon: Database,
      title: "Data Isolation & Row-Level Security",
      body: "Every customer-facing table enforces row-level security policies tied to workspace membership and roles (admin, approver, viewer). Cross-workspace reads, writes, and deletes are blocked at the database layer — not only in application code.",
    },
    {
      icon: Shield,
      title: "Platform & Hosting",
      body: "The application runs on Lovable Cloud, which provisions a managed Postgres database, authentication, file storage, and serverless functions. Lovable Cloud capabilities are platform features and are not, on their own, an independent security certification of this application.",
    },
    {
      icon: FileText,
      title: "Data We Collect",
      body: "We store the information you enter into DecisionOS: workspace name, member profiles (display name, optional avatar), decisions, meetings, agenda items, proposals, AI evaluations, and uploaded meeting recordings. We do not sell personal data.",
    },
    {
      icon: Users,
      title: "Subprocessors & Integrations",
      body: "AI recommendations are generated through the Lovable AI Gateway. Meeting recordings are stored in a private bucket and served via short-lived signed URLs. Additional integrations are only enabled when an admin configures them.",
    },
    {
      icon: Mail,
      title: "Security Contact",
      body: "If you believe you have found a security issue, please contact the workspace owner who provisioned your account. They can coordinate with the DecisionOS maintainers and the underlying platform team.",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Trust & Security</h1>
        <p className="page-description">
          This page is maintained by the DecisionOS team to answer common security and privacy
          questions. It describes controls that are enabled today. It is not an independent
          certification and does not constitute legal or compliance advice — contact the workspace
          owner for written terms.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="enterprise-card p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="enterprise-card p-5 mt-4">
        <h3 className="font-semibold text-foreground text-sm mb-2">Shared Responsibility</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Lovable Cloud secures the underlying infrastructure (database, auth service, storage,
          serverless runtime). The DecisionOS application owner is responsible for configuring
          workspace membership, inviting the right people, and reviewing AI-generated
          recommendations before acting on them. Customers remain responsible for the accuracy and
          legality of the decision content they submit.
        </p>
      </div>
    </div>
  );
}
