import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Lang = 'en' | 'tr';

type Dict = Record<string, { en: string; tr: string }>;

const dict: Dict = {
  'nav.signin': { en: 'Sign in', tr: 'Giriş Yap' },
  'nav.getStarted': { en: 'Get started', tr: 'Başla' },
  'hero.badge': { en: 'Permission-aware Company Brain', tr: 'İzin Farkında Şirket Beyni' },
  'hero.title': {
    en: 'Turn every company interaction into organizational intelligence.',
    tr: 'Her şirket etkileşimini kurumsal zekâya dönüştürün.',
  },
  'hero.subtitle': {
    en: 'DecisionOS transforms your emails, meetings, documents, decisions, and workflows into a living Company Brain for employees and AI agents.',
    tr: 'DecisionOS; e-postalarınızı, toplantılarınızı, belgelerinizi, kararlarınızı ve iş akışlarınızı çalışanlar ve AI ajanları için yaşayan bir Şirket Beynine dönüştürür.',
  },
  'hero.cta': { en: 'Build Your Company Brain', tr: 'Şirket Beyninizi Oluşturun' },
  'hero.demo': { en: 'View Product Demo', tr: 'Ürün Demosunu İzle' },
  'problem.tag': { en: 'The Problem', tr: 'Sorun' },
  'problem.title': { en: "Your company's memory is scattered.", tr: 'Şirketinizin hafızası dağınık.' },
  'problem.body': {
    en: "Critical decisions live in Slack threads. Client promises hide in email. Processes exist only in one person's head. When they leave, the knowledge leaves with them.",
    tr: 'Kritik kararlar Slack konularında yaşar. Müşteri sözleri e-postalarda saklıdır. Süreçler yalnızca bir kişinin aklındadır. O kişi ayrıldığında bilgi de onunla birlikte gider.',
  },
  'src.emails': { en: 'Emails', tr: 'E-postalar' },
  'src.meetings': { en: 'Meetings', tr: 'Toplantılar' },
  'src.documents': { en: 'Documents', tr: 'Belgeler' },
  'src.crm': { en: 'CRM', tr: 'CRM' },
  'src.slack': { en: 'Slack', tr: 'Slack' },
  'src.memory': { en: 'Employee memory', tr: 'Çalışan hafızası' },
  'features.title': { en: 'How DecisionOS works', tr: 'DecisionOS nasıl çalışır' },
  'f.decisionMemory': { en: 'Decision Memory', tr: 'Karar Hafızası' },
  'f.decisionMemoryBody': {
    en: 'Every decision structured with reasoning, evidence, approvers, and outcomes.',
    tr: 'Her karar; gerekçe, kanıt, onaylayanlar ve sonuçlarla birlikte yapılandırılır.',
  },
  'f.permBrain': { en: 'Permission-Aware Brain', tr: 'İzin Farkında Beyin' },
  'f.permBrainBody': {
    en: 'Answers respect roles, departments, projects, and confidentiality — automatically.',
    tr: 'Cevaplar; rolleri, departmanları, projeleri ve gizliliği otomatik olarak dikkate alır.',
  },
  'f.skills': { en: 'Company Skills for AI Agents', tr: 'AI Ajanları için Şirket Yetenekleri' },
  'f.skillsBody': {
    en: 'Machine-readable operating instructions so agents work the way your company works.',
    tr: 'Ajanların şirketinizin çalışma biçimine uygun çalışması için makine okunur işletim talimatları.',
  },
  'f.client': { en: 'Client & Project Intelligence', tr: 'Müşteri ve Proje Zekâsı' },
  'f.clientBody': {
    en: 'Promises, risks, and commitments surfaced before they become problems.',
    tr: 'Sözler, riskler ve taahhütler sorun haline gelmeden önce gün yüzüne çıkar.',
  },
  'f.ask': { en: 'Ask DecisionOS', tr: 'DecisionOS’a Sor' },
  'f.askBody': {
    en: 'Source-cited answers about any decision, client, process, or policy.',
    tr: 'Herhangi bir karar, müşteri, süreç veya politika hakkında kaynak referanslı cevaplar.',
  },
  'f.expertise': { en: 'Expertise Map', tr: 'Uzmanlık Haritası' },
  'f.expertiseBody': {
    en: 'See who owns what — and where knowledge concentration puts you at risk.',
    tr: 'Kimin neyi sahiplendiğini ve bilgi yoğunluğunun sizi nerede riske attığını görün.',
  },
  'quote': {
    en: 'Every employee leaves knowledge behind. Every meeting creates context. Every decision contains intelligence.',
    tr: 'Her çalışan bilgi bırakır. Her toplantı bağlam oluşturur. Her karar zekâ içerir.',
  },
  'quote.highlight': {
    en: 'DecisionOS makes sure your company never loses it.',
    tr: 'DecisionOS, şirketinizin bunu asla kaybetmemesini sağlar.',
  },
  'cta.title': { en: 'Ready to build your Company Brain?', tr: 'Şirket Beyninizi kurmaya hazır mısınız?' },
  'cta.body': {
    en: 'Start capturing decisions, promises, and knowledge in minutes.',
    tr: 'Kararları, sözleri ve bilgileri dakikalar içinde kayıt altına almaya başlayın.',
  },
  'cta.button': { en: 'Get started free', tr: 'Ücretsiz Başla' },
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
