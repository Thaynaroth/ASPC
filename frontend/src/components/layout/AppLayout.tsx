import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';

export default function AppLayout() {
  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* top bar — spans the full width across sidebar and content */}
      <TopBar />
      <div className="flex min-h-0 flex-1">
        {/* sidebar — flush with the left edge so its content column lines up with page content */}
        <div className="flex h-full shrink-0">
          <AppSidebar />
        </div>
        {/* main surface — flush, full-bleed, higher plane, casts a soft shadow toward the sidebar */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}