import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { languageNames, locales, translate } from './core';
import type { Language } from './core';

interface I18nValue {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (text: string) => string;
}
const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('pt');
  const value = useMemo(() => ({ language, locale: locales[language], setLanguage, t: (text: string) => translate(text, language) }), [language]);
  useEffect(() => {
    document.documentElement.lang = locales[language];
    document.title = `${translate('SIMULADOR 5 × 2', language)} | Schnorr`;
  }, [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('LanguageProvider is required.');
  return context;
}

export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();
  return <label className="language-selector"><span className="visually-hidden">{t('Idioma')}</span><select data-testid="language-selector" aria-label={t('Idioma')} value={language} onChange={event => {
    const next = event.target.value;
    if (next === 'pt' || next === 'es' || next === 'en') setLanguage(next);
  }}>{Object.entries(languageNames).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>;
}
