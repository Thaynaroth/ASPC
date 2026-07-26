import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import i18n from '@/i18n';

type Language = 'en' | 'km';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get language from URL path or localStorage
    const pathLang = location.pathname.split('/')[1] as Language;
    const validLangs: Language[] = ['en', 'km'];
    const savedLang = localStorage.getItem('language') as Language;
    
    if (validLangs.includes(pathLang)) {
      setLanguageState(pathLang);
      i18n.changeLanguage(pathLang);
      localStorage.setItem('language', pathLang);
    } else if (savedLang && validLangs.includes(savedLang)) {
      setLanguageState(savedLang);
      i18n.changeLanguage(savedLang);
    } else {
      setLanguageState('en');
      i18n.changeLanguage('en');
      localStorage.setItem('language', 'en');
    }
  }, [location.pathname]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    
    // Update URL to reflect new language
    const currentPath = location.pathname;
    const pathParts = currentPath.split('/');
    
    if (validLangs.includes(pathParts[1] as Language)) {
      // Replace existing language in URL
      pathParts[1] = lang;
      navigate(pathParts.join('/'), { replace: true });
    } else {
      // Add language to URL
      navigate(`/${lang}${currentPath}`, { replace: true });
    }
  };

  const validLangs: Language[] = ['en', 'km'];

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}