import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { AuthPortal } from './components/Auth/AuthPortal';
import { SuperAdminDashboard } from './components/SuperAdmin/SuperAdminDashboard';
import { WorkerDashboard } from './components/Worker/WorkerDashboard';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = api.getUser();
    const token = api.getToken();
    if (user && token) {
      setCurrentUser(user);
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    api.clearToken();
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Iniciando Style SaaS...
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPortal onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {currentUser.role === 'SUPER_ADMIN' ? (
        <SuperAdminDashboard
          user={currentUser}
          onLogout={handleLogout}
        />
      ) : (
        <WorkerDashboard
          user={currentUser}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};
