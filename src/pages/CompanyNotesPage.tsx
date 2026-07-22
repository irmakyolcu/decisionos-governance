import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  StickyNote, Plus, Search, Trash2, Pin, PinOff, Pencil, AlertTriangle,
  Paperclip, FileText, Download, Loader2, X,
} from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

type Note = {
  id: string;
  workspace_id: string;
  created_by: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_pinned: boolean;
  importance: 'low' | 'normal' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
};

const CATEGORIES = ['Genel', 'Strateji', 'Finans', 'Operasyon', 'İK', 'Ürün', 'Hukuk', 'Risk'];
const IMPORTANCE: Note['importance'][] = ['low', 'normal', 'high', 'critical'];

const importanceStyle: Record<Note['importance'], string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-primary/10 text-primary',
  high: 'bg-amber-500/15 text-amber-500',
  critical: 'bg-destructive/15 text-destructive',
};

const importanceLabel: Record<Note['importance'], string> = {
  low: 'Düşük', normal: 'Normal', high: 'Yüksek', critical: 'Kritik',
};

const emptyForm = {
  title: '',
  content: '',
  category: 'Genel',
  tagsInput: '',
  importance: 'normal' as Note['importance'],
  is_pinned: false,
};

export default function CompanyNotesPage() {
  const { workspace } = useWorkspace();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    if (!workspace) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('company_notes')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });
    if (error) toast.error(error.message);
    setNotes((data ?? []) as Note[]);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [workspace?.id]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(n: Note) {
    setEditingId(n.id);
    setForm({
      title: n.title,
      content: n.content,
      category: n.category,
      tagsInput: n.tags.join(', '),
      importance: n.importance,
      is_pinned: n.is_pinned,
    });
    setOpen(true);
  }

  async function save() {
    if (!workspace) return;
    if (!form.title.trim()) return toast.error('Başlık gerekli');
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return toast.error('Oturum bulunamadı');

    const tags = form.tagsInput
      .split(',').map((t) => t.trim()).filter(Boolean);

    if (editingId) {
      const { error } = await supabase.from('company_notes').update({
        title: form.title.trim(),
        content: form.content,
        category: form.category,
        tags,
        importance: form.importance,
        is_pinned: form.is_pinned,
      }).eq('id', editingId);
      if (error) return toast.error(error.message);
      toast.success('Not güncellendi');
    } else {
      const { error } = await supabase.from('company_notes').insert({
        workspace_id: workspace.id,
        created_by: uid,
        title: form.title.trim(),
        content: form.content,
        category: form.category,
        tags,
        importance: form.importance,
        is_pinned: form.is_pinned,
      });
      if (error) return toast.error(error.message);
      toast.success('Not eklendi');
    }
    setOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    load();
  }

  async function togglePin(n: Note) {
    const { error } = await supabase.from('company_notes')
      .update({ is_pinned: !n.is_pinned }).eq('id', n.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Bu notu silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('company_notes').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Not silindi');
    load();
  }

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return notes.filter((n) => {
      if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
      if (!ql) return true;
      return (
        n.title.toLowerCase().includes(ql) ||
        n.content.toLowerCase().includes(ql) ||
        n.tags.some((t) => t.toLowerCase().includes(ql))
      );
    });
  }, [notes, q, categoryFilter]);

  const pinned = filtered.filter((n) => n.is_pinned);
  const rest = filtered.filter((n) => !n.is_pinned);

  return (
    <div className="space-y-6">
      <div className="page-header flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <StickyNote className="h-6 w-6 text-primary" /> Şirket için Önemli Notlar
          </h1>
          <p className="page-description">
            Tüm workspace üyeleriyle paylaşılan kalıcı notlar, uyarılar ve hatırlatmalar.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> Yeni Not
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Notu Düzenle' : 'Yeni Not'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Başlık</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>İçerik</Label>
                <Textarea rows={5} value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Kategori</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Önem</Label>
                  <Select value={form.importance}
                    onValueChange={(v) => setForm({ ...form, importance: v as Note['importance'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {IMPORTANCE.map((i) => <SelectItem key={i} value={i}>{importanceLabel[i]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Etiketler</Label>
                <Input placeholder="Virgülle ayırın: yönetim, q3, acil"
                  value={form.tagsInput}
                  onChange={(e) => setForm({ ...form, tagsInput: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_pinned}
                  onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} />
                Sabitle (Pin)
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
              <Button onClick={save}>Kaydet</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Not, etiket veya içerik ara…" className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm kategoriler</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardContent></Card>

      {loading ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Yükleniyor…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          <StickyNote className="h-6 w-6 mx-auto mb-2 opacity-50" />
          Henüz not eklenmemiş. Yeni bir not oluşturun.
        </CardContent></Card>
      ) : (
        <>
          {pinned.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                <Pin className="h-3 w-3" /> Sabitlenmiş
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pinned.map((n) => (
                  <NoteCard key={n.id} note={n} onPin={togglePin} onEdit={openEdit} onDelete={remove} />
                ))}
              </div>
            </div>
          )}
          {rest.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 mt-4">Diğer notlar</h2>
              )}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {rest.map((n) => (
                  <NoteCard key={n.id} note={n} onPin={togglePin} onEdit={openEdit} onDelete={remove} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NoteCard({
  note, onPin, onEdit, onDelete,
}: {
  note: Note;
  onPin: (n: Note) => void;
  onEdit: (n: Note) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="group">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {note.importance === 'critical' && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
              <h3 className="font-semibold truncate">{note.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1.5">
              <Badge variant="outline" className="text-[10px]">{note.category}</Badge>
              <Badge className={`text-[10px] ${importanceStyle[note.importance]}`} variant="secondary">
                {importanceLabel[note.importance]}
              </Badge>
            </div>
          </div>
          <div className="flex opacity-0 group-hover:opacity-100 transition">
            <Button variant="ghost" size="icon" onClick={() => onPin(note)} title={note.is_pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}>
              {note.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(note)} title="Düzenle">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(note.id)} title="Sil">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {note.content && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{note.content}</p>
        )}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{t}</span>
            ))}
          </div>
        )}
        <div className="text-[11px] text-muted-foreground pt-1 border-t">
          Güncellendi {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true, locale: tr })}
        </div>
      </CardContent>
    </Card>
  );
}
