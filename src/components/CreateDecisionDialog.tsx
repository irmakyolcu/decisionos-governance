import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useDecisions } from '@/hooks/useDecisions';
import { useToast } from '@/hooks/use-toast';
import type { RiskLevel } from '@/types/decision';

export function CreateDecisionDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [budget, setBudget] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('Medium');
  const [submitting, setSubmitting] = useState(false);
  const { createDecision } = useDecisions();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await createDecision({
        title: title.trim(),
        description: description.trim(),
        problemStatement: problemStatement.trim(),
        budget: Number(budget) || 0,
        riskLevel,
        status: 'Under Review',
      });
      toast({ title: 'Karar oluşturuldu', description: title });
      setOpen(false);
      setTitle(''); setDescription(''); setProblemStatement(''); setBudget(''); setRiskLevel('Medium');
    } catch (err: any) {
      toast({ title: 'Oluşturulamadı', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm"><Plus className="h-4 w-4 mr-1" />Yeni Karar</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Yeni Karar Oluştur</DialogTitle>
            <DialogDescription>Karar detaylarını girin. Oluşturulduktan sonra inceleme aşamasında olacak.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Başlık *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Açıklama</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="problem">Problem ifadesi</Label>
              <Textarea id="problem" value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="budget">Bütçe (€)</Label>
                <Input id="budget" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Risk Seviyesi</Label>
                <Select value={riskLevel} onValueChange={(v) => setRiskLevel(v as RiskLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button type="submit" disabled={submitting || !title.trim()}>{submitting ? 'Oluşturuluyor…' : 'Oluştur'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
