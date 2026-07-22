import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Lang = 'en' | 'tr';

type Dict = Record<string, { en: string; tr: string }>;

const dict: Dict = {
  'nav.signin': { en: 'Sign in', tr: 'Giriş Yap' },
  'nav.getStarted': { en: 'Book a Demo', tr: 'Demo Al' },

  // Hero — AI OS positioning
  'hero.badge': { en: 'AI Operating System for Companies', tr: 'Şirketler için AI İşletim Sistemi' },
  'hero.title': {
    en: 'AI Operating System for Companies',
    tr: 'Şirketler için AI İşletim Sistemi',
  },
  'hero.subtitle': {
    en: 'DecisionOS transforms fragmented enterprise knowledge into trusted organizational intelligence — enabling both employees and AI agents to remember, reason, govern, and act.',
    tr: 'DecisionOS; parçalı kurumsal bilgiyi güvenilir organizasyonel zekâya dönüştürür — çalışanların ve AI ajanlarının hatırlamasını, akıl yürütmesini, yönetmesini ve harekete geçmesini sağlar.',
  },
  'hero.cta': { en: 'Book a Demo', tr: 'Demo Al' },
  'hero.demo': { en: 'See How It Works', tr: 'Nasıl Çalıştığını Gör' },

  // Demo modal
  'demo.desc': { en: 'A 60-second walkthrough of the Enterprise AI Stack.', tr: 'Kurumsal AI Yığını için 60 saniyelik hızlı tur.' },
  'demo.title': { en: 'Interactive demo coming soon', tr: 'Etkileşimli demo çok yakında' },
  'demo.body': { en: 'Meanwhile, create a free workspace and explore DecisionOS with sample data in under a minute.', tr: 'Şimdilik ücretsiz bir çalışma alanı oluşturun ve örnek verilerle DecisionOS\'u bir dakikadan kısa sürede keşfedin.' },
  'demo.try': { en: 'Try it now', tr: 'Hemen dene' },
  'demo.close': { en: 'Close', tr: 'Kapat' },
  'demo.f1': { en: 'Unified enterprise memory across every tool', tr: 'Tüm araçlarınız için birleşik kurumsal hafıza' },
  'demo.f2': { en: 'Governed AI with human approvals & audit', tr: 'İnsan onaylı, denetlenebilir AI yönetimi' },
  'demo.f3': { en: 'Multi-agent runtime with shared context', tr: 'Ortak bağlamlı çoklu ajan çalışma zamanı' },
  'demo.header': { en: 'DecisionOS — Product Demo', tr: 'DecisionOS — Ürün Demosu' },

  // Enterprise AI Stack
  'stack.tag': { en: 'The Enterprise AI Stack', tr: 'Kurumsal AI Yığını' },
  'stack.title': { en: 'Four layers. One operating system.', tr: 'Dört katman. Tek işletim sistemi.' },
  'stack.body': {
    en: 'DecisionOS is the foundational infrastructure for enterprise AI — not another app, but the operating layer every employee and agent runs on.',
    tr: 'DecisionOS; kurumsal AI için temel altyapıdır — başka bir uygulama değil, her çalışanın ve ajanın üzerinde çalıştığı işletim katmanıdır.',
  },

  // Layer 1 — Company Brain
  'l1.name': { en: 'Company Brain', tr: 'Şirket Beyni' },
  'l1.desc': {
    en: 'Connects enterprise knowledge from Gmail, Outlook, Slack, Teams, Google Drive, Microsoft 365, Notion, Confluence, CRM, ERP, GitHub, meetings and documents into a continuously evolving organizational memory.',
    tr: 'Gmail, Outlook, Slack, Teams, Google Drive, Microsoft 365, Notion, Confluence, CRM, ERP, GitHub, toplantılar ve belgelerdeki kurumsal bilgiyi sürekli gelişen bir organizasyonel hafızaya bağlar.',
  },

  // Layer 2 — Decision Intelligence
  'l2.name': { en: 'Decision Intelligence', tr: 'Karar Zekâsı' },
  'l2.desc': {
    en: 'Understands historical decisions, reasoning, outcomes, context and organizational knowledge.',
    tr: 'Geçmiş kararları, muhakemeyi, sonuçları, bağlamı ve organizasyonel bilgiyi anlar.',
  },
  'l2.f1': { en: 'Similar decisions', tr: 'Benzer kararlar' },
  'l2.f2': { en: 'Risk detection', tr: 'Risk tespiti' },
  'l2.f3': { en: 'Missing information', tr: 'Eksik bilgi' },
  'l2.f4': { en: 'Explainable recommendations', tr: 'Açıklanabilir öneriler' },
  'l2.f5': { en: 'Lessons from previous outcomes', tr: 'Önceki sonuçlardan dersler' },

  // Layer 3 — Trust & Governance
  'l3.name': { en: 'Trust & Governance', tr: 'Güven & Yönetişim' },
  'l3.desc': {
    en: 'The trust layer enterprise AI requires — identity, permissions, policies, approvals, audit and provenance built in.',
    tr: 'Kurumsal AI\'nın ihtiyaç duyduğu güven katmanı — kimlik, izinler, politikalar, onaylar, denetim ve köken kayıt altında.',
  },
  'l3.c1': { en: 'Agent Identity', tr: 'Ajan Kimliği' },
  'l3.c2': { en: 'Permissions', tr: 'İzinler' },
  'l3.c3': { en: 'Policy Engine', tr: 'Politika Motoru' },
  'l3.c4': { en: 'Human Approval', tr: 'İnsan Onayı' },
  'l3.c5': { en: 'Audit Trail', tr: 'Denetim İzi' },
  'l3.c6': { en: 'Decision Provenance', tr: 'Karar Kökeni' },
  'l3.c7': { en: 'Compliance', tr: 'Uyumluluk' },
  'l3.c8': { en: 'Explainability', tr: 'Açıklanabilirlik' },
  'l3.c9': { en: 'Risk Monitoring', tr: 'Risk İzleme' },
  'l3.c10': { en: 'Shared Organizational Memory', tr: 'Ortak Organizasyonel Hafıza' },

  // Layer 4 — Multi-Agent Runtime
  'l4.name': { en: 'Multi-Agent Runtime', tr: 'Çoklu Ajan Çalışma Zamanı' },
  'l4.desc': {
    en: 'Specialized AI agents collaborate on the same trusted organizational intelligence. Instead of isolated copilots, every agent shares the same memory, policies and decision context.',
    tr: 'Uzmanlaşmış AI ajanları aynı güvenilir organizasyonel zekâ üzerinde işbirliği yapar. İzole yardımcılar yerine, her ajan aynı hafızayı, politikaları ve karar bağlamını paylaşır.',
  },
  'l4.ceo': { en: 'CEO Agent', tr: 'CEO Ajanı' },
  'l4.finance': { en: 'Finance Agent', tr: 'Finans Ajanı' },
  'l4.sales': { en: 'Sales Agent', tr: 'Satış Ajanı' },
  'l4.legal': { en: 'Legal Agent', tr: 'Hukuk Ajanı' },
  'l4.hr': { en: 'HR Agent', tr: 'İK Ajanı' },
  'l4.ops': { en: 'Operations Agent', tr: 'Operasyon Ajanı' },

  // Why DecisionOS — Remember / Reason / Govern / Act
  'why.tag': { en: 'Why DecisionOS', tr: 'Neden DecisionOS' },
  'why.title': { en: 'Remember. Reason. Govern. Act.', tr: 'Hatırla. Muhakeme Et. Yönet. Harekete Geç.' },
  'why.remember': { en: 'Remember', tr: 'Hatırla' },
  'why.remember.sub': { en: 'Enterprise Memory', tr: 'Kurumsal Hafıza' },
  'why.reason': { en: 'Reason', tr: 'Muhakeme Et' },
  'why.reason.sub': { en: 'Decision Intelligence', tr: 'Karar Zekâsı' },
  'why.govern': { en: 'Govern', tr: 'Yönet' },
  'why.govern.sub': { en: 'Trust & Compliance', tr: 'Güven & Uyum' },
  'why.act': { en: 'Act', tr: 'Harekete Geç' },
  'why.act.sub': { en: 'Multi-Agent Collaboration', tr: 'Çoklu Ajan İşbirliği' },

  // Competitor positioning
  'cmp.tag': { en: 'A New Category', tr: 'Yeni Bir Kategori' },
  'cmp.title': { en: 'Traditional AI vs. an AI Operating System.', tr: 'Geleneksel AI ile AI İşletim Sistemi.' },
  'cmp.trad': { en: 'Traditional AI', tr: 'Geleneksel AI' },
  'cmp.us': { en: 'DecisionOS', tr: 'DecisionOS' },
  'cmp.t1': { en: 'Searches documents', tr: 'Belgelerde arama yapar' },
  'cmp.t2': { en: 'Answers questions', tr: 'Sorulara cevap verir' },
  'cmp.t3': { en: 'Works in isolation', tr: 'İzole çalışır' },
  'cmp.t4': { en: 'No governance', tr: 'Yönetişim yok' },
  'cmp.t5': { en: 'No shared memory', tr: 'Ortak hafıza yok' },
  'cmp.u1': { en: 'Shared enterprise memory', tr: 'Ortak kurumsal hafıza' },
  'cmp.u2': { en: 'Decision intelligence', tr: 'Karar zekâsı' },
  'cmp.u3': { en: 'Trust & governance', tr: 'Güven & yönetişim' },
  'cmp.u4': { en: 'Multi-agent collaboration', tr: 'Çoklu ajan işbirliği' },
  'cmp.u5': { en: 'Continuous organizational learning', tr: 'Sürekli organizasyonel öğrenme' },

  // Enterprise value
  'ent.tag': { en: 'Enterprise Value', tr: 'Kurumsal Değer' },
  'ent.title': { en: 'Built for the Enterprise AI Era.', tr: 'Kurumsal AI Çağı için inşa edildi.' },
  'ent.emp': { en: 'Employees', tr: 'Çalışanlar' },
  'ent.emp.body': { en: 'Work with complete organizational context.', tr: 'Tam organizasyonel bağlamla çalışır.' },
  'ent.mgr': { en: 'Managers', tr: 'Yöneticiler' },
  'ent.mgr.body': { en: 'Make explainable, auditable decisions.', tr: 'Açıklanabilir ve denetlenebilir kararlar alır.' },
  'ent.ai': { en: 'AI Agents', tr: 'AI Ajanları' },
  'ent.ai.body': { en: 'Operate safely with trusted memory, permissions and governance.', tr: 'Güvenilir hafıza, izin ve yönetişim ile güvenle çalışır.' },

  // Final CTA
  'cta.title': {
    en: 'The AI Operating System every company will run on.',
    tr: 'Her şirketin üzerinde çalışacağı AI İşletim Sistemi.',
  },
  'cta.button': { en: 'Book a Demo', tr: 'Demo Al' },

  // Footer
  'footer.message': {
    en: 'DecisionOS is building the AI Operating System for Companies — the infrastructure layer that enables trusted organizational intelligence for employees and AI agents.',
    tr: 'DecisionOS, Şirketler için AI İşletim Sistemi\'ni inşa ediyor — çalışanlar ve AI ajanları için güvenilir organizasyonel zekâyı mümkün kılan altyapı katmanı.',
  },
  'footer.tagline': { en: 'AI Operating System for Companies', tr: 'Şirketler için AI İşletim Sistemi' },

  // Source labels used elsewhere
  'src.meetings': { en: 'Meetings', tr: 'Toplantılar' },
  'src.docs': { en: 'Docs', tr: 'Belgeler' },
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<Ctx | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
    return (stored === 'en' || stored === 'tr') ? stored : 'tr';
  });

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const t = (key: string) => dict[key]?.[lang] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
