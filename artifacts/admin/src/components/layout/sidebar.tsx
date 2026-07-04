import React from 'react';
import { useLocation } from 'wouter';
import {
  LayoutDashboard,
  HardDrive,
  FolderTree,
  Megaphone,
  Bot,
  BrainCircuit,
  FolderPlus,
  ScrollText,
  Settings,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import logoUrl from '@assets/IMG_20260630_182619_1782826967942_1782902308174.png';
import { Link } from 'wouter';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Drive Config', href: '/drive', icon: HardDrive },
  { name: 'Resources', href: '/resources', icon: FolderTree },
  { name: 'Announcements', href: '/announcements', icon: Megaphone },
  { name: 'AI Settings', href: '/ai', icon: Bot },
  { name: 'AI Knowledge', href: '/ai-knowledge', icon: BrainCircuit },
  { name: 'Folder Generator', href: '/folder-generator', icon: FolderPlus },
  { name: 'Logs', href: '/logs', icon: ScrollText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-sidebar-border bg-sidebar-primary/10">
        <img src={logoUrl} alt="O/A Level Resources" className="h-8 w-8 rounded mr-3 object-contain bg-white" />
        <span className="font-semibold text-lg tracking-tight">Admin Console</span>
      </div>
      
      <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        <nav className="flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = location === item.href || location.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors'
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground',
                    'mr-3 h-5 w-5 flex-shrink-0 transition-colors'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex shrink-0 border-t border-sidebar-border p-4">
        <button
          onClick={() => logout()}
          className="group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5 text-sidebar-foreground/60 group-hover:text-destructive-foreground transition-colors" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );
}
