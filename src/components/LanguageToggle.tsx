import { useLanguage } from '@/contexts/LanguageContext';
import { Languages } from 'lucide-react';

interface Props {
  className?: string;
}

export function LanguageToggle({ className = '' }: Props) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 p-0.5 text-xs ${className}`}
      role="group"
      aria-label="Language selector"
    >
      <Languages className="h-3.5 w-3.5 ml-2 text-muted-foreground" />
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
          lang === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('tr')}
        aria-pressed={lang === 'tr'}
        className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
          lang === 'tr' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        TR
      </button>
    </div>
  );
}
