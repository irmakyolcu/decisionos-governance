import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export function getBackFallback(pathname: string): string {
  if (pathname === '/trust') return '/landing';
  if (pathname.startsWith('/memory/')) return '/memory';
  if (pathname.startsWith('/audit/')) return '/';
  if (pathname === '/meeting-sources') return '/meetings';
  if (pathname === '/decisions/list') return '/decisions';
  if (pathname === '/api-keys') return '/settings';
  return '/';
}

export function PageBackButton() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Detail views already supply their own contextual back controls.
  const hasOwnBack = /^\/decisions\/(?!list$)[^/]+(?:\/[^/]+)?\/?$/.test(pathname)
    || /^\/integrations\/[^/]+\/?$/.test(pathname);
  if (pathname === '/' || pathname === '/home-legacy' || hasOwnBack) return null;

  const goBack = () => {
    const index = window.history.state?.idx;
    if (typeof index === 'number' && index > 0) {
      navigate(-1);
    } else {
      navigate(getBackFallback(pathname), { replace: true });
    }
  };

  return (
    <div className="mb-4">
      <Button variant="ghost" size="sm" onClick={goBack} className="gap-2 text-muted-foreground" title={t('Back')}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('Back')}
      </Button>
    </div>
  );
}