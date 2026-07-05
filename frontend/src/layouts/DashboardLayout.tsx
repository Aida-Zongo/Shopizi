import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import AiAssistantWidget from '../components/AiAssistantWidget';

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="bg-background font-body-md text-text-main">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <Header onMenuToggle={() => setIsSidebarOpen(true)} />
      <main className="ml-0 md:ml-64 pt-16 min-h-screen">
        <div className="max-w-container-max mx-auto p-gutter">
          {isSidebarOpen && (
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
          )}
          <Outlet />
        </div>
      </main>
      {/* AI Shopping Assistant - visible for merchants too */}
      <AiAssistantWidget />
    </div>
  );
}

