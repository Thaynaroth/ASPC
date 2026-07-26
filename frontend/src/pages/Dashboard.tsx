import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('dashboard.title')}</CardTitle>
              <CardDescription>{t('dashboard.welcome')}, {user?.full_name || user?.email}</CardDescription>
            </div>
            <LanguageSwitcher />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">{t('dashboard.email')}:</span>{' '}
              <span className="font-medium">{user?.email}</span>
            </p>
            <p>
              <span className="text-muted-foreground">{t('dashboard.role')}:</span>{' '}
              <span className="font-medium">{user?.roles?.join(', ') || '—'}</span>
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={logout}>
            {t('dashboard.signOut')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
