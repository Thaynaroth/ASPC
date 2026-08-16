import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';

export default function AppLayout() {
  return (
    <div className="flex h-dvh bg-background">
      {/* floating sidebar — lower plane, keeps its breathing room */}
      <div className="flex h-full shrink-0 p-4">
        <AppSidebar />
      </div>
      {/* main surface — flush, full-bleed, higher plane, casts a soft shadow toward the sidebar */}
      <main className="min-w-0 flex-1 overflow-y-auto ">
        <Outlet />
      </main>
    </div>
  );
}
