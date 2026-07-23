import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Brain, ArrowLeft, Calendar, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Replace with your real calendar link (Calendly, Cal.com, HubSpot, etc.)
const BOOKING_URL = 'https://calendly.com/decisionos/30min';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name').max(100),
  workEmail: z
    .string()
    .trim()
    .email('Please enter a valid work email')
    .max(255)
    .refine(
      (v) => !/@(gmail|yahoo|hotmail|outlook|icloud|proton)\./i.test(v),
      'Please use your work email address',
    ),
  company: z.string().trim().min(1, 'Company is required').max(120),
  role: z.string().trim().min(1, 'Role is required').max(80),
  companySize: z.string().min(1, 'Please select a company size'),
  useCase: z.string().trim().max(1000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

const initial: FormValues = {
  fullName: '',
  workEmail: '',
  company: '',
  role: '',
  companySize: '',
  useCase: '',
};

export default function BookDemoPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormValues;
        if (!fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      // Best-effort persistence; ignore failure so the user can still book.
      await supabase.from('demo_requests' as any).insert({
        full_name: parsed.data.fullName,
        work_email: parsed.data.workEmail,
        company: parsed.data.company,
        role: parsed.data.role,
        company_size: parsed.data.companySize,
        use_case: parsed.data.useCase || null,
      });
    } catch {
      // silent — lead capture table is optional
    }

    setSuccess(true);
    setSubmitting(false);
    toast({ title: 'Thanks!', description: 'Redirecting you to the calendar…' });

    // Redirect to the booking calendar with prefilled details.
    const url = new URL(BOOKING_URL);
    url.searchParams.set('name', parsed.data.fullName);
    url.searchParams.set('email', parsed.data.workEmail);
    url.searchParams.set('a1', parsed.data.company);
    setTimeout(() => {
      window.location.href = url.toString();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">DecisionOS</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-[1.1fr_1fr] gap-12">
        <section>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/60 text-xs text-muted-foreground mb-6">
            <Calendar className="h-3 w-3 text-primary" /> 30-minute personalized demo
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            See DecisionOS in action.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Book a live walkthrough with our team. We&apos;ll show how DecisionOS turns your
            company&apos;s knowledge into governed, auditable AI decisions — tailored to your stack.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              'Live tour of Company Brain, Decision Rooms, and Agent Runtime',
              'Governance, audit trail, and role-based authority walkthrough',
              'Q&A with a solutions engineer — no sales pitch',
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-foreground/90">{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-enterprise">
            {success ? (
              <div className="text-center py-8">
                <div className="mx-auto h-14 w-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-5">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">You&apos;re all set</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Opening the calendar to pick your time…
                </p>
                <a
                  href={BOOKING_URL}
                  className="inline-flex items-center gap-2 mt-6 text-sm text-primary hover:underline"
                >
                  Open manually <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold">Book a demo</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Fill in a few details and we&apos;ll route you to the calendar.
                  </p>
                </div>

                <Field label="Full name" error={errors.fullName} htmlFor="fullName">
                  <Input
                    id="fullName"
                    autoComplete="name"
                    value={values.fullName}
                    onChange={(e) => set('fullName', e.target.value)}
                    placeholder="Jane Doe"
                    maxLength={100}
                  />
                </Field>

                <Field label="Work email" error={errors.workEmail} htmlFor="workEmail">
                  <Input
                    id="workEmail"
                    type="email"
                    autoComplete="email"
                    value={values.workEmail}
                    onChange={(e) => set('workEmail', e.target.value)}
                    placeholder="jane@company.com"
                    maxLength={255}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Company" error={errors.company} htmlFor="company">
                    <Input
                      id="company"
                      autoComplete="organization"
                      value={values.company}
                      onChange={(e) => set('company', e.target.value)}
                      placeholder="Acme Inc."
                      maxLength={120}
                    />
                  </Field>
                  <Field label="Role" error={errors.role} htmlFor="role">
                    <Input
                      id="role"
                      autoComplete="organization-title"
                      value={values.role}
                      onChange={(e) => set('role', e.target.value)}
                      placeholder="Head of Ops"
                      maxLength={80}
                    />
                  </Field>
                </div>

                <Field label="Company size" error={errors.companySize} htmlFor="companySize">
                  <Select value={values.companySize} onValueChange={(v) => set('companySize', v)}>
                    <SelectTrigger id="companySize">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1–10</SelectItem>
                      <SelectItem value="11-50">11–50</SelectItem>
                      <SelectItem value="51-200">51–200</SelectItem>
                      <SelectItem value="201-1000">201–1,000</SelectItem>
                      <SelectItem value="1000+">1,000+</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="What would you like to see? (optional)" error={errors.useCase} htmlFor="useCase">
                  <Textarea
                    id="useCase"
                    value={values.useCase}
                    onChange={(e) => set('useCase', e.target.value)}
                    placeholder="Governed AI decisions across finance & ops…"
                    rows={4}
                    maxLength={1000}
                  />
                </Field>

                <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                  ) : (
                    <>Continue to calendar <Calendar className="h-4 w-4" /></>
                  )}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center">
                  By submitting, you agree to be contacted about your demo request.
                </p>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({
  label, htmlFor, error, children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
