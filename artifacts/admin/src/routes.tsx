import React from 'react';
import { Switch, Route, useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { AppLayout } from '@/components/layout/app-layout';
import LoginPage from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import DriveConfig from '@/pages/drive-config';
import Announcements from '@/pages/announcements';
import AiSettings from '@/pages/ai-settings';
import AiKnowledge from '@/pages/ai-knowledge';
import Settings from '@/pages/settings';
import Logs from '@/pages/logs';
import FolderGenerator from '@/pages/folder-generator';
import Resources from '@/pages/resources';

const NotFound = () => <div className="p-8 text-center mt-20 text-xl font-medium text-muted-foreground">404 - Page Not Found</div>;

export function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && location !== '/') {
      setLocation('/');
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated && location !== '/') {
    return null; // Will redirect in effect
  }

  if (location === '/') {
    return <LoginPage />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/drive" component={DriveConfig} />
        <Route path="/resources" component={Resources} />
        <Route path="/announcements" component={Announcements} />
        <Route path="/ai" component={AiSettings} />
        <Route path="/ai-knowledge" component={AiKnowledge} />
        <Route path="/folder-generator" component={FolderGenerator} />
        <Route path="/logs" component={Logs} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}
