import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';

function KhmerFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 480" className={className}>
      <rect width="640" height="480" fill="#032EA1" />
      <rect y="160" width="640" height="160" fill="#E00025" />
    </svg>
  );
}

function USFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 480" className={className}>
      <rect width="640" height="480" fill="#B22234" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={i * (480 / 13)} width="640" height={480 / 13} fill="#fff" />
      ))}
      <rect width="260" height={480 * 7 / 13} fill="#3C3B6E" />
    </svg>
  );
}

export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'km' : 'en');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="cursor-pointer gap-2 font-medium"
    >
      {language === 'en' ? (
        <>
          <KhmerFlag className="size-5 rounded-sm" />
          ខ្មែរ
        </>
      ) : (
        <>
          <USFlag className="size-5 rounded-sm" />
          English
        </>
      )}
    </Button>
  );
}
