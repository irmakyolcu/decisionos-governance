import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type LicenseInfo = {
  deployment: 'on-premise' | 'cloud';
  license: {
    valid: boolean;
    mode: 'licensed' | 'grace' | 'unlicensed' | 'cloud';
    reason?: string;
    customer?: string;
    seats?: number;
    features: string[];
    expires_at?: string;
    days_remaining?: number;
  };
  ai: { enabled: boolean; on_premise?: boolean; model?: string; error?: string };
  outbound_internet: boolean;
};

/** Reads deployment + license state. Fails open on cloud installs. */
export function useLicense() {
  const [info, setInfo] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke('license-status');
      if (cancelled) return;
      if (error) setInfo(null);
      else setInfo(data as LicenseInfo);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasFeature = (feature: string) =>
    !info || info.license.mode === 'cloud' || info.license.features.includes(feature);

  return { info, loading, hasFeature };
}
