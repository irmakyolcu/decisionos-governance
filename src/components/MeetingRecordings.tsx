import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Upload, FileAudio, Trash2, Loader2, Play, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Recording {
  id: string;
  meeting_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  notes: string | null;
}

interface MeetingRecordingsProps {
  meetingId: string;
}

export function MeetingRecordings({ meetingId }: MeetingRecordingsProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecordings();
  }, [meetingId]);

  const fetchRecordings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('meeting_recordings')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching recordings:', error);
    } else {
      setRecordings(data || []);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast({ title: 'Dosya çok büyük', description: 'Maksimum 20MB yüklenebilir.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    const filePath = `${meetingId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('meeting-recordings')
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: 'Yükleme hatası', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from('meeting_recordings')
      .insert({
        meeting_id: meetingId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || 'audio/mpeg',
      });

    if (dbError) {
      toast({ title: 'Kayıt hatası', description: dbError.message, variant: 'destructive' });
    } else {
      toast({ title: 'Kayıt yüklendi', description: `${file.name} başarıyla yüklendi.` });
      fetchRecordings();
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (recording: Recording) => {
    const { error: storageError } = await supabase.storage
      .from('meeting-recordings')
      .remove([recording.file_path]);

    if (storageError) {
      toast({ title: 'Silme hatası', description: storageError.message, variant: 'destructive' });
      return;
    }

    await supabase.from('meeting_recordings').delete().eq('id', recording.id);
    toast({ title: 'Kayıt silindi' });
    fetchRecordings();
  };

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from('meeting-recordings').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="enterprise-card">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-sm">Toplantı Kayıtları</h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span className="ml-1">{uploading ? 'Yükleniyor…' : 'Kayıt Yükle'}</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : recordings.length === 0 ? (
        <div className="p-6 text-center">
          <FileAudio className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Bu toplantı için henüz kayıt yüklenmedi.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {recordings.map((rec) => (
            <div key={rec.id} className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileAudio className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{rec.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(rec.file_size)} · {new Date(rec.uploaded_at).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  asChild
                >
                  <a href={getPublicUrl(rec.file_path)} target="_blank" rel="noopener noreferrer">
                    <Play className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  asChild
                >
                  <a href={getPublicUrl(rec.file_path)} download={rec.file_name}>
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(rec)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
