import { useTranslation } from 'react-i18next';

export default function PlaceholderPage({ title }: { title?: string }) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-8"
            aria-hidden="true"
          >
            <path d="M12 4 4.5 20h3.1L9 16.5h6l1.4 3.5h3.1L12 4Z" />
            <path d="M10.2 13h3.6L12 8.5 10.2 13Z" />
          </svg>
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {t('placeholder.comingSoon')}
          </p>
        </div>
      </div>
    </div>
  );
}
