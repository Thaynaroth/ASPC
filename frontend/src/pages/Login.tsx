import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Bot, ShoppingCart, LineChart } from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: 'AI Agent',
    description: 'Automates sales conversations and follow-ups around the clock',
  },
  {
    icon: ShoppingCart,
    title: 'Order & Customer Hub',
    description: 'Manage orders, promotions and customers from one place',
  },
  {
    icon: LineChart,
    title: 'Real-time Analytics',
    description: 'Track performance with unified dashboards and reports',
  },
];

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate(`/${lang || 'en'}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh">
      {/* Left side - brand showcase */}
      <div className="relative hidden w-2/3 flex-col justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-950 p-12 lg:flex">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative z-10 max-w-md space-y-10">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/25 backdrop-blur">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-7"
                aria-hidden="true"
              >
                <path d="M12 4 4.5 20h3.1L9 16.5h6l1.4 3.5h3.1L12 4Z" />
                <path d="M10.2 13h3.6L12 8.5 10.2 13Z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-extrabold tracking-tight text-white">ASPC</p>
              <p className="text-xs font-medium tracking-wide text-indigo-200">
                Automation Selling Platform
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-white">
              Sell smarter,<br />automated end to end.
            </h1>
            <p className="text-base leading-relaxed text-indigo-200">
              Everything you need to run your online store — AI agents, orders,
              promotions and analytics — in one platform.
            </p>
          </div>

          <ul className="space-y-5">
            {features.map((feature) => (
              <li key={feature.title} className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                  <feature.icon className="size-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="text-sm text-indigo-200">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right side - form */}
      <div className="relative flex w-full items-center justify-center p-4 lg:w-1/3">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        <Card className="w-full max-w-sm shadow-xl">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">{t('login.title')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('login.description')}
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('login.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@aspc.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('login.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full cursor-pointer"
                disabled={submitting}
              >
                {submitting ? t('login.submitting') : t('login.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
