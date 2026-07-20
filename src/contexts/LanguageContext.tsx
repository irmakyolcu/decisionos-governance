import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Lang = 'en' | 'tr';

type Dict = Record<string, { en: string; tr: string }>;

const dict: Dict = {
  'nav.signin': { en: 'Sign in', tr: 'Giriş Yap' },
  'nav.getStarted': { en: 'Get started', tr: 'Başla' },

  // Hero
  'hero.badge': { en: 'The Company Brain Platform', tr: 'Şirket Beyni Platformu' },
  'hero.title': {
    en: 'The Intelligence Layer for Every Company.',
    tr: 'Her Şirket İçin Zekâ Katmanı.',
  },
  'hero.subtitle': {
    en: 'DecisionOS builds a living Company Brain that learns from every decision, every conversation, every meeting and every business outcome.',
    tr: 'DecisionOS; her karardan, her konuşmadan, her toplantıdan ve her iş sonucundan öğrenen yaşayan bir Şirket Beyni inşa eder.',
  },
  'hero.cta': { en: 'Build Your Company Brain', tr: 'Şirket Beyninizi Oluşturun' },
  'hero.demo': { en: 'Watch Demo', tr: 'Demoyu İzle' },
  'demo.desc': { en: 'A 60-second walkthrough of the Company Brain, AI Chief of Staff, and Decision Memory.', tr: 'Şirket Beyni, AI Chief of Staff ve Karar Hafızası için 60 saniyelik hızlı tur.' },
  'demo.title': { en: 'Interactive demo coming soon', tr: 'Etkileşimli demo çok yakında' },
  'demo.body': { en: 'Meanwhile, create a free workspace and explore DecisionOS with sample data in under a minute.', tr: 'Şimdilik ücretsiz bir çalışma alanı oluşturun ve örnek verilerle DecisionOS\'u bir dakikadan kısa sürede keşfedin.' },
  'demo.try': { en: 'Try it now', tr: 'Hemen dene' },
  'demo.close': { en: 'Close', tr: 'Kapat' },
  'demo.f1': { en: 'Unified Company Brain across all your tools', tr: 'Tüm araçlarınız için birleşik Şirket Beyni' },
  'demo.f2': { en: 'Governed AI with human approvals & audit', tr: 'İnsan onaylı, denetlenebilir AI yönetimi' },
  'demo.f3': { en: 'Decision Memory that learns from outcomes', tr: 'Sonuçlardan öğrenen Karar Hafızası' },

  // Problem
  'problem.tag': { en: '01 — The Problem', tr: '01 — Sorun' },
  'problem.title': {
    en: "Companies store information. They don't preserve intelligence.",
    tr: 'Şirketler bilgi depolar. Ama zekâyı korumaz.',
  },
  'problem.body1': {
    en: 'Critical decisions disappear every day — buried in threads, lost in inboxes, forgotten in meetings.',
    tr: 'Kritik kararlar her gün kayboluyor — konuların derinliklerinde, gelen kutularında, toplantı notlarında.',
  },
  'problem.body2': {
    en: 'When employees leave, their judgment leaves with them.',
    tr: 'Çalışanlar ayrıldığında, muhakemeleri de onlarla birlikte gider.',
  },

  // Brain
  'brain.tag': { en: '02 — Company Brain', tr: '02 — Şirket Beyni' },
  'brain.title': { en: 'Every decision makes your company smarter.', tr: 'Her karar, şirketinizi daha akıllı yapar.' },
  'brain.body': {
    en: 'DecisionOS does not store documents. It understands context, stakeholders, trade-offs, goals, previous decisions, business history, and outcomes.',
    tr: 'DecisionOS belge depolamaz. Bağlamı, paydaşları, ödünleşimleri, hedefleri, önceki kararları, iş tarihini ve sonuçları anlar.',
  },
  'brain.inputs': { en: 'Enterprise Systems', tr: 'Kurumsal Sistemler' },
  'brain.core': { en: 'DecisionOS Company Brain', tr: 'DecisionOS Şirket Beyni' },
  'brain.consumers': { en: 'Executives · Employees · AI Agents', tr: 'Yöneticiler · Çalışanlar · AI Ajanları' },
  'brain.outputs': { en: 'Outputs', tr: 'Çıktılar' },
  'brain.in.emails': { en: 'Emails', tr: 'E-postalar' },
  'brain.in.meetings': { en: 'Meetings', tr: 'Toplantılar' },
  'brain.in.slack': { en: 'Slack', tr: 'Slack' },
  'brain.in.crm': { en: 'CRM', tr: 'CRM' },
  'brain.in.calendar': { en: 'Calendar', tr: 'Takvim' },
  'brain.in.erp': { en: 'ERP', tr: 'ERP' },
  'brain.out.execs': { en: 'Executives', tr: 'Yöneticiler' },
  'brain.out.employees': { en: 'Employees', tr: 'Çalışanlar' },
  'brain.out.agents': { en: 'AI Agents', tr: 'AI Ajanları' },

  // Chief of Staff
  'cos.tag': { en: '03 — AI Chief of Staff', tr: '03 — AI Genel Sekreter' },
  'cos.title': { en: 'An AI Chief of Staff for every executive.', tr: 'Her yönetici için bir AI Genel Sekreter.' },
  'cos.body': {
    en: 'The intelligence briefing your leadership team wishes they had every morning.',
    tr: 'Yönetim ekibinizin her sabah sahip olmayı dilediği zekâ brifingi.',
  },
  'cos.brief': { en: 'Decision Brief', tr: 'Karar Brifingi' },
  'cos.brief.body': { en: 'Q4 budget reallocation across three business units', tr: 'Üç iş biriminde Q4 bütçe yeniden dağılımı' },
  'cos.action': { en: 'Recommended Action', tr: 'Önerilen Aksiyon' },
  'cos.action.body': { en: 'Shift 12% from Ops to Growth. Confidence 84%.', tr: 'Operasyondan Büyümeye %12 aktarım. Güven %84.' },
  'cos.risk': { en: 'Risk Analysis', tr: 'Risk Analizi' },
  'cos.risk.body': { en: '2 medium risks flagged in customer retention and vendor concentration.', tr: 'Müşteri elde tutma ve tedarikçi yoğunluğunda 2 orta düzey risk.' },
  'cos.similar': { en: 'Similar Past Decisions', tr: 'Benzer Geçmiş Kararlar' },
  'cos.similar.body': { en: '3 comparable reallocations from 2023–2025 — average uplift +9%.', tr: '2023–2025 arasında 3 benzer aktarım — ortalama etki +%9.' },
  'cos.stake': { en: 'Stakeholder Impact', tr: 'Paydaş Etkisi' },
  'cos.stake.body': { en: 'Impacts 4 teams · 12 owners · 2 external partners.', tr: '4 ekibi · 12 sorumluyu · 2 dış partneri etkiler.' },
  'cos.conf': { en: 'Confidence Score', tr: 'Güven Skoru' },
  'cos.conf.body': { en: 'Model + evidence weighting: 0.84 / 1.00', tr: 'Model + kanıt ağırlığı: 0.84 / 1.00' },

  // Decision Memory
  'mem.tag': { en: '04 — Decision Memory', tr: '04 — Karar Hafızası' },
  'mem.title': { en: 'Your organization should never forget.', tr: 'Şirketiniz asla unutmamalı.' },
  'mem.body': {
    en: 'Every outcome — good or bad — improves the next recommendation.',
    tr: 'Her sonuç — iyi ya da kötü — bir sonraki öneriyi iyileştirir.',
  },
  'mem.d1': { en: 'Market Expansion', tr: 'Pazar Genişlemesi' },
  'mem.d1.out': { en: 'Result: +18% Revenue', tr: 'Sonuç: +%18 Gelir' },
  'mem.d2': { en: 'Hiring Strategy', tr: 'İşe Alım Stratejisi' },
  'mem.d2.out': { en: 'Outcome: Reduced turnover', tr: 'Sonuç: Personel devri düştü' },
  'mem.d3': { en: 'Pricing Decision', tr: 'Fiyatlandırma Kararı' },
  'mem.d3.out': { en: 'Outcome: Conversion +22%', tr: 'Sonuç: Dönüşüm +%22' },

  // Agents
  'agents.tag': { en: '05 — Multi-Agent Future', tr: '05 — Çoklu Ajan Geleceği' },
  'agents.title': { en: 'One Company Brain. Unlimited AI Agents.', tr: 'Tek Şirket Beyni. Sınırsız AI Ajanı.' },
  'agents.body': {
    en: 'DecisionOS becomes the intelligence layer coordinating every enterprise AI agent — grounded in the same context, memory and policies.',
    tr: 'DecisionOS; her kurumsal AI ajanını koordine eden zekâ katmanı olur — aynı bağlam, hafıza ve politikalar üzerine kurulu.',
  },
  'agents.sales': { en: 'Sales Agent', tr: 'Satış Ajanı' },
  'agents.finance': { en: 'Finance Agent', tr: 'Finans Ajanı' },
  'agents.marketing': { en: 'Marketing Agent', tr: 'Pazarlama Ajanı' },
  'agents.hr': { en: 'HR Agent', tr: 'İK Ajanı' },
  'agents.legal': { en: 'Legal Agent', tr: 'Hukuk Ajanı' },
  'agents.ops': { en: 'Operations Agent', tr: 'Operasyon Ajanı' },

  // Why
  'why.tag': { en: '06 — Why DecisionOS', tr: '06 — Neden DecisionOS' },
  'why.title': { en: 'A new category. Not another assistant.', tr: 'Yeni bir kategori. Başka bir asistan değil.' },
  'why.others': { en: 'Others', tr: 'Diğerleri' },
  'why.us': { en: 'DecisionOS', tr: 'DecisionOS' },
  'why.o1': { en: 'AI Chat', tr: 'AI Sohbet' },
  'why.o2': { en: 'Search', tr: 'Arama' },
  'why.o3': { en: 'Documents', tr: 'Belgeler' },
  'why.o4': { en: 'Knowledge base', tr: 'Bilgi tabanı' },
  'why.o5': { en: 'Single user', tr: 'Tek kullanıcı' },
  'why.u1': { en: 'Organizational Intelligence', tr: 'Kurumsal Zekâ' },
  'why.u2': { en: 'Decision Memory', tr: 'Karar Hafızası' },
  'why.u3': { en: 'Context Awareness', tr: 'Bağlam Farkındalığı' },
  'why.u4': { en: 'Recommendations', tr: 'Öneriler' },
  'why.u5': { en: 'Company-wide Intelligence', tr: 'Şirket Çapında Zekâ' },

  // Why now
  'now.tag': { en: '07 — Why Now', tr: '07 — Neden Şimdi' },
  'now.title': { en: 'Three forces converging into one layer.', tr: 'Tek bir katmanda birleşen üç güç.' },
  'now.c1': { en: 'Generative AI', tr: 'Üretken AI' },
  'now.c1.body': { en: 'Models are finally capable of reasoning across enterprise context.', tr: 'Modeller nihayet kurumsal bağlamda muhakeme edebiliyor.' },
  'now.c2': { en: 'Enterprise AI Adoption', tr: 'Kurumsal AI Benimseme' },
  'now.c2.body': { en: 'Every function is buying AI. None of it shares memory.', tr: 'Her fonksiyon AI satın alıyor. Hiçbiri hafıza paylaşmıyor.' },
  'now.c3': { en: 'AI Agents', tr: 'AI Ajanları' },
  'now.c3.body': { en: 'Agents need a shared brain to act safely on behalf of the company.', tr: 'Ajanların şirket adına güvenle hareket etmesi için ortak bir beyne ihtiyacı var.' },

  // Vision
  'vision.tag': { en: '08 — Vision', tr: '08 — Vizyon' },
  'vision.l1': { en: 'Every company has CRM.', tr: 'Her şirketin bir CRM’i var.' },
  'vision.l2': { en: 'Every company has ERP.', tr: 'Her şirketin bir ERP’si var.' },
  'vision.l3': { en: 'The next enterprise platform is Company Intelligence.', tr: 'Bir sonraki kurumsal platform, Şirket Zekâsıdır.' },

  // Final CTA
  'cta.title': {
    en: 'Build the brain your company will rely on for the next decade.',
    tr: 'Şirketinizin önümüzdeki on yıl güveneceği beyni inşa edin.',
  },
  'cta.button': { en: 'Build Your Company Brain', tr: 'Şirket Beyninizi Oluşturun' },
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
