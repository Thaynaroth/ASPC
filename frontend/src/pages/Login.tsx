import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Logo from '@/components/common/Logo';
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
      <div className="relative hidden w-2/3 flex-col justify-center overflow-hidden bg-gradient-to-br from-amber-700 via-amber-800 to-stone-950 p-12 lg:flex">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative z-10 max-w-md space-y-10">
          <div className="flex items-center gap-3">
            <Logo className="size-11" />
            <div>
              <p className="font-hand text-2xl font-bold tracking-tight text-white">ASPC</p>
              <p className="text-xs font-medium tracking-wide text-amber-200">
                Automation Selling Platform
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="font-hand text-4xl leading-snug font-bold text-white">
              Sell smarter,<br />automated end to end.
            </h1>
            <p className="text-base leading-relaxed text-amber-100/80">
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
                  <p className="text-sm text-amber-100/80">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex w-full flex-col items-center justify-center p-4 py-6 lg:w-1/3">
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
                className="w-full cursor-pointer py-4 text-base font-semibold"
                disabled={submitting}
              >
                {submitting ? t('login.submitting') : t('login.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-3 w-full max-w-sm space-y-1">
          <Button
            type="button"
            variant="ghost"
            className="w-full cursor-pointer text-sm text-muted-foreground"
          >
            {t('login.forgotPassword')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="mt-16 w-full cursor-pointer border-primary/40 py-4 text-base font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
          >
            {t('login.createAccount')}
          </Button>
        </div>
      </div>
    </div>
  );
}
