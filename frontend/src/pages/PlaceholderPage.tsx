import { useTranslation } from 'react-i18next';
import Logo from '@/components/common/Logo';

export default function PlaceholderPage({ title }: { title?: string }) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6 text-center">
        <Logo className="size-16" />
        <div className="space-y-1">
          <h2 className="font-hand text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {t('placeholder.comingSoon')}
          </p>
        </div>
      </div>
    </div>
  );
}
