import { useLessons } from '@/hooks/useLessons';
import { useLanguage } from '@/contexts/LanguageContext';
import { RecordLinks } from '@/components/RecordLinks';
import { Card } from '@/components/ui/card';
export default function LessonDecisionLinksPage(){const {t}=useLanguage();const {rows,loading,error}=useLessons();return <div className="space-y-6"><h1 className="page-title">{t('Lessons ↔ Decisions')}</h1>{loading&&<p>{t('Loading…')}</p>}{error&&<p role="alert" className="text-destructive">{error}</p>}{!loading&&!rows.length&&<p>{t('No lessons match. Add some in Lessons Learned first.')}</p>}{rows.map(l=><Card key={l.id} className="p-5 space-y-3"><h2 className="font-semibold">{l.title}</h2><p>{l.recommendation}</p><RecordLinks kind="lesson" id={l.id}/></Card>)}</div>;}
