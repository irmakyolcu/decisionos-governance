import { trainingItems } from '@/data/ceoTwin';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Mail, BookMarked, Briefcase, NotebookPen, MessagesSquare, Sparkles } from 'lucide-react';

const kinds = [
  { key: 'Past decision', icon: <BookMarked className="h-5 w-5" />, desc: 'Add a past CEO decision with reasoning and outcome.' },
  { key: 'CEO note', icon: <NotebookPen className="h-5 w-5" />, desc: 'Voice memos or written notes from the CEO.' },
  { key: 'Strategy doc', icon: <Briefcase className="h-5 w-5" />, desc: 'Strategic plans, OKRs, vision docs.' },
  { key: 'Investor update', icon: <FileText className="h-5 w-5" />, desc: 'Quarterly investor letters and KPI updates.' },
  { key: 'Email example', icon: <Mail className="h-5 w-5" />, desc: 'Sample emails showing the CEO\'s communication style.' },
  { key: 'Meeting note', icon: <MessagesSquare className="h-5 w-5" />, desc: 'Board, exec, or 1:1 meeting notes.' },
  { key: 'Principle', icon: <Sparkles className="h-5 w-5" />, desc: 'Company principles and operating tenets.' },
];

export default function TrainingDataPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Training Data</h1>
        <p className="page-description">Feed the Judgment Layer. The more grounded data it sees, the closer its recommendations match how the CEO actually thinks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kinds.map((k) => (
          <Card key={k.key} className="hover:border-primary/40 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{k.icon}</div>
                <Badge variant="secondary" className="text-[10px]">{trainingItems.filter((t) => t.kind === k.key).length} items</Badge>
              </div>
              <h3 className="font-semibold text-foreground mt-3">{k.key}</h3>
              <p className="text-xs text-muted-foreground mt-1">{k.desc}</p>
              <Button variant="outline" size="sm" className="mt-4 w-full" disabled>
                <Upload className="h-3.5 w-3.5" />Add to memory
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-5 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">Indexed sources</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Sources currently feeding the Judgment Layer.</p>
          </div>
          <div className="divide-y divide-border">
            {trainingItems.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.kind} · added {new Date(t.addedAt).toLocaleDateString()}{t.size ? ` · ${t.size}` : ''}</p>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">Indexed</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
