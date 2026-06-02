import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Welcome back, {user?.full_name || user?.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Email:</span>{' '}
              <span className="font-medium">{user?.email}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Role:</span>{' '}
              <span className="font-medium">{user?.roles?.join(', ') || '—'}</span>
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={logout}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
