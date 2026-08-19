import posthog from 'posthog-js';

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

if (!key && import.meta.env.DEV) {
  console.error(
    'VITE_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_KEY is configured',
  );
}

if (key) {
  posthog.init(key, {
    api_host: host ?? 'https://us.i.posthog.com',
    defaults: '2026-05-30',
    capture_pageview: false,
  });
}

export default posthog;
