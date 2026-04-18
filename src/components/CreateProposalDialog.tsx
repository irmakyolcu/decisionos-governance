import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useProposals } from '@/hooks/useProposals';
import { useToast } from '@/hooks/use-toast';

export function CreateProposalDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [department, setDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { createProposal } = useProposals();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await createProposal({
        title: title.trim(),
        description: description.trim(),
        budget: Number(budget) || 0,
        department: department.trim(),
      });
      toast({ title: 'Öneri sunuldu', description: title });
      setOpen(false);
      setTitle(''); setDescription(''); setBudget(''); setDepartment('');
    } catch (err: any) {
      toast({ title: 'Sunulamadı', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm"><Plus className="h-4 w-4 mr-1" />Yeni Öneri</Button>}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Yeni Öneri Sun</DialogTitle>
            <DialogDescription>Önerinizin detaylarını girin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="p-title">Başlık *</Label>
              <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-desc">Açıklama</Label>
              <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="p-budget">Bütçe (€)</Label>
                <Input id="p-budget" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-dept">Departman</Label>
                <Input id="p-dept" value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button type="submit" disabled={submitting || !title.trim()}>{submitting ? 'Sunuluyor…' : 'Sun'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
