import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  FileText,
  BarChart3,
  BookOpen,
  Calendar,
  Settings,
  Upload,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  className?: string;
}

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/' },
  { icon: Upload, label: 'Create Test', href: '/create' },
  { icon: FileText, label: 'My Tests', href: '/tests' },
  { icon: History, label: 'History', href: '/history' },
  { icon: BarChart3, label: 'Analysis', href: '/analysis' },
  { icon: BookOpen, label: 'Mistake Book', href: '/mistakes' },
  { icon: Calendar, label: 'Study Plan', href: '/plan' },
];

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        'flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar',
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-physics">
          <FileText className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-sidebar-foreground">JEE Analyzer</h1>
          <p className="text-xs text-sidebar-foreground/60">Advanced CBT System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link key={item.href} to={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  isActive && 'bg-sidebar-accent text-sidebar-primary font-medium'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <Link to="/settings">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Button>
        </Link>
        <p className="mt-4 text-center text-xs text-sidebar-foreground/40">
          v1.0.0 • Advanced Performance Analysis
        </p>
      </div>
    </aside>
  );
}
