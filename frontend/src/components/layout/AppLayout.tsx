import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';

export default function AppLayout() {
  return (
    <div className="flex h-dvh gap-4 bg-gray-100 p-4">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto rounded-xl bg-white">
        <Outlet />
      </main>
    </div>
  );
}
