import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

interface Props {
  className?: string;
}

export function LanguageToggle({ className = '' }: Props) {
  const { lang, setLang, t } = useLanguage();

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 p-0.5 text-xs ${className}`}
      role="group"
      aria-label={t('Language selector')}
    >
      <Languages className="h-3.5 w-3.5 ml-2 text-muted-foreground" />
      <Button variant="ghost" size="sm"
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={`h-7 px-2.5 py-1 rounded-full font-medium transition-colors ${
          lang === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        EN
      </Button>
      <Button variant="ghost" size="sm"
        type="button"
        onClick={() => setLang('tr')}
        aria-pressed={lang === 'tr'}
        className={`h-7 px-2.5 py-1 rounded-full font-medium transition-colors ${
          lang === 'tr' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        TR
      </Button>
    </div>
  );
}
