import { useDecisions } from '@/hooks/useDecisions';
import { Brain, TrendingUp, DollarSign, Clock, AlertTriangle, Target } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';

export default function AIEvaluationPage() {
  const { decisions, loading } = useDecisions();
  const evaluated = decisions.filter(d => d.aiEvaluation);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && evaluated.length > 0) setSelectedId(evaluated[0].id);
  }, [evaluated, selectedId]);

  const decision = evaluated.find(d => d.id === selectedId) ?? evaluated[0];

  if (loading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;

  if (!decision) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">AI Evaluation</h1>
          <p className="page-description">AI-powered decision analysis.</p>
        </div>
        <div className="enterprise-card p-12 text-center">
          <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Henüz AI değerlendirmesi olan karar yok.</p>
        </div>
      </div>
    );
  }

  const ai = decision.aiEvaluation!;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">AI Evaluation</h1>
        <p className="page-description">AI-powered decision analysis. AI assists but does not make final decisions.</p>
      </div>

      {evaluated.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {evaluated.map(d => (
            <button key={d.id} onClick={() => setSelectedId(d.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${decision.id === d.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
              {d.title}
            </button>
          ))}
        </div>
      )}

      <div className="enterprise-card p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Evaluating: {decision.title}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{decision.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Decision Change" value={`${ai.changePercentage}%`} subtitle="vs baseline" icon={<TrendingUp className="h-5 w-5 text-primary" />} />
        <MetricCard title="Budget Change" value={`${ai.budgetChange}%`} icon={<DollarSign className="h-5 w-5 text-success" />} trend={{ value: Math.abs(ai.budgetChange), positive: ai.budgetChange < 0 }} />
        <MetricCard title="Timeline Change" value={`+${ai.timelineChange}%`} icon={<Clock className="h-5 w-5 text-warning" />} />
        <MetricCard title="Risk Change" value={`${ai.riskChange} pts`} icon={<AlertTriangle className="h-5 w-5 text-success" />} trend={{ value: Math.abs(ai.riskChange), positive: ai.riskChange < 0 }} />
      </div>

      <div className="enterprise-card mb-6 overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Impact Breakdown</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Component</th><th>Change</th><th>Impact</th></tr>
          </thead>
          <tbody>
            {ai.impactBreakdown.map((row, i) => (
              <tr key={i}>
                <td className="font-medium text-foreground">{row.component}</td>
                <td>
                  <span className={`font-mono text-sm ${row.change.startsWith('-') ? 'text-success' : row.change.startsWith('+') ? 'text-warning' : 'text-foreground'}`}>
                    {row.change}
                  </span>
                </td>
                <td className="text-muted-foreground capitalize">{row.impact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="enterprise-card p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> AI Impact Calculator
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Expected ROI</span>
              <span className="font-semibold text-success">{ai.expectedROI}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Risk-Adjusted ROI</span>
              <span className="font-semibold text-foreground">{ai.riskAdjustedROI}%</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Break-Even Timeline</span>
              <span className="font-semibold text-foreground">{ai.breakEvenMonths} months</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Expected Value</span>
              <span className="font-semibold text-primary">€{ai.expectedValue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="enterprise-card p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" /> AI Analysis Summary
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{ai.summary}</p>
          <div className="mt-4 p-3 bg-info/10 rounded-lg">
            <p className="text-xs text-info font-medium">⚠ AI recommendations are advisory only. Final decisions require human authority approval.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
