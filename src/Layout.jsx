import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import {
  Layers,
  Archive,
  Clipboard,
  ArrowRightLeft,
  LogOut,
  Settings as SettingsIcon,
  ChevronDown
} from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "sonner";
import AINotificationButton from '@/components/common/AINotificationButton';


const navItems = [
  { name: 'Materials', icon: Layers },
  { name: 'Stock', icon: Archive },
  { name: 'Kits', icon: Clipboard },
  { name: 'Transfer', icon: ArrowRightLeft },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-[#0f172a] text-white overflow-hidden">
      <style>{`
        :root {
          --primary: #2563eb;
          --primary-hover: #1d4ed8;
          --accent: #f59e0b;
          --accent-hover: #d97706;
          --bg-dark: #0f172a;
          --bg-darker: #020617;
          --bg-card: #1e293b;
          --bg-card-hover: #334155;
          --border-color: #475569;
          --border-light: #64748b;
          --text-primary: #f1f5f9;
          --text-secondary: #cbd5e1;
          --text-muted: #94a3b8;
        }

        .light-theme {
          --primary: #1d4ed8;
          --primary-hover: #1e40af;
          --accent: #d97706;
          --accent-hover: #b45309;
          --bg-dark: #fafafa;
          --bg-darker: #ffffff;
          --bg-card: #ffffff;
          --bg-card-hover: #f4f4f5;
          --border-color: #e4e4e7;
          --border-light: #d4d4d8;
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --text-muted: #64748b;
        }
        
        .light-theme .bg-\\[\\#1a1a1a\\] { background-color: #f8fafc !important; }
        .light-theme .bg-\\[\\#0f172a\\] { background-color: #f8fafc !important; }
        .light-theme .bg-\\[\\#1e1e1e\\] { background-color: #ffffff !important; }
        .light-theme .bg-\\[\\#1e293b\\] { background-color: #f1f5f9 !important; }
        .light-theme .bg-\\[\\#2a2a2a\\] { background-color: #ffffff !important; }
        .light-theme .bg-\\[\\#242424\\] { background-color: #fafafa !important; }
        .light-theme .bg-\\[\\#252525\\] { background-color: #f8f8f8 !important; }
        .light-theme .bg-\\[\\#333\\] { background-color: #f1f5f9 !important; }
        .light-theme .bg-\\[\\#334155\\] { background-color: #e2e8f0 !important; }
        .light-theme .border-\\[\\#333\\] { border-color: #cbd5e1 !important; }
        .light-theme .border-\\[\\#334155\\] { border-color: #cbd5e1 !important; }
        .light-theme .border-\\[\\#444\\] { border-color: #cbd5e1 !important; }
        .light-theme .border-\\[\\#475569\\] { border-color: #cbd5e1 !important; }
        .light-theme .text-white { color: #0f172a !important; }
        .light-theme .text-slate-100 { color: #0f172a !important; }
        .light-theme .text-slate-200 { color: #1e293b !important; }
        .light-theme .text-slate-300 { color: #475569 !important; }
        .light-theme .text-slate-400 { color: #64748b !important; }
        .light-theme .text-slate-500 { color: #94a3b8 !important; }
        .light-theme .text-gray-200 { color: #1e293b !important; }
        .light-theme .text-gray-300 { color: #475569 !important; }
        .light-theme .text-gray-400 { color: #64748b !important; }
        .light-theme .text-gray-500 { color: #94a3b8 !important; }
        .light-theme .bg-slate-800\\/50 { background-color: #f1f5f9 !important; }
        .light-theme .bg-slate-700\\/50 { background-color: #cbd5e1 !important; }
        .light-theme .bg-slate-900\\/40 { background-color: #ffffff !important; }
        .light-theme .bg-slate-900\\/20 { background-color: #f8fafc !important; }
        .light-theme .bg-slate-900\\/50 { background-color: #f1f5f9 !important; }
        .light-theme .border-slate-700 { border-color: #cbd5e1 !important; }
        .light-theme .border-slate-600 { border-color: #cbd5e1 !important; }
        .light-theme .border-slate-700\\/50 { border-color: #e2e8f0 !important; }
        .light-theme .border-slate-800\\/50 { border-color: #e2e8f0 !important; }
        .light-theme nav { background: #ffffff !important; border-bottom: 1px solid #e2e8f0 !important; }
        .light-theme .shadow-lg { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03) !important; }
        .light-theme .shadow-xl { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03) !important; }
        .light-theme .shadow-2xl { box-shadow: 0 15px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02) !important; }
        .light-theme .bg-gradient-to-r.from-slate-800 { background: #f1f5f9 !important; }
        .light-theme thead tr { background: #f1f5f9 !important; }
        [class*="bg-[--primary]"] { color: white !important; }
        .light-theme [class*="bg-[--primary]"] { color: white !important; }
        .light-theme .hover\\:bg-slate-800:hover { background-color: #e2e8f0 !important; }
        .light-theme .hover\\:border-slate-700:hover { border-color: #cbd5e1 !important; }
        .light-theme .bg-blue-500\\/15 { background-color: rgba(59, 130, 246, 0.08) !important; }
        .light-theme .hover\\:bg-blue-500\\/20:hover { background-color: rgba(59, 130, 246, 0.12) !important; }
        .light-theme .bg-slate-800\\/70 { background-color: #e2e8f0 !important; }
        .light-theme .border-slate-700 { border-color: #cbd5e1 !important; }
        .light-theme .text-slate-400 { color: #64748b !important; }
        .light-theme .hover\\:text-white:hover { color: #0f172a !important; }
        .light-theme .hover\\:bg-slate-700\\/50:hover { background-color: #e2e8f0 !important; }
        .light-theme .from-cyan-600 { background: linear-gradient(to right, #06b6d4, #22d3ee) !important; }
        .light-theme .hover\\:from-cyan-500:hover { background: linear-gradient(to right, #22d3ee, #67e8f9) !important; }
        `}</style>

      {/* Navigation Bar */}
      <nav className="bg-[--bg-card] border-b border-[--border-color]">
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.name;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.name)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg",
                    isActive 
                      ? "text-white bg-[--primary]" 
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
            </div>

            <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
            </div>
            {/* Spacer to push user avatar to right on mobile */}
            <div className="flex-1 md:hidden" />

            {/* Mobile: User avatar + hamburger */}
          <div className="md:hidden flex items-center gap-2 ml-auto">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-700/50 transition-colors">
                  <div className="h-7 w-7 rounded-full bg-[--primary] flex items-center justify-center text-xs font-semibold text-white">
                    {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-[--bg-card] border-[--border-color] shadow-xl" align="end">
                  <DropdownMenuLabel className="text-slate-200">
                    <div className="flex flex-col">
                      <span className="font-semibold">{user.full_name || 'User'}</span>
                      <span className="text-xs text-slate-400 font-normal">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#334155]" />
                  <DropdownMenuItem 
                    onClick={() => setSettingsOpen(true)}
                    className="text-slate-300 focus:bg-slate-700/50 focus:text-white cursor-pointer"
                  >
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#334155]" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <AINotificationButton />

            {/* User Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[--primary] flex items-center justify-center text-sm font-semibold text-white">
                      {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-200">{user.full_name || user.email}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-[--bg-card] border-[--border-color] shadow-xl" align="end">
                  <DropdownMenuLabel className="text-slate-200">
                    <div className="flex flex-col">
                      <span className="font-semibold">{user.full_name || 'User'}</span>
                      <span className="text-xs text-slate-400 font-normal">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#334155]" />
                  <DropdownMenuItem 
                    onClick={() => setSettingsOpen(true)}
                    className="text-slate-300 focus:bg-slate-700/50 focus:text-white cursor-pointer"
                  >
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#334155]" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
          <div className="md:hidden bg-[--bg-darker] border-t border-[--border-color] p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.name;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.name)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all w-full",
                    isActive 
                      ? "text-white bg-[--primary]" 
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
          )}
          </nav>

          {/* Page Content */}
          <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-[#1e293b] border-[#334155] text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="space-y-0.5">
                <Label className="text-slate-200 font-medium">Dark Mode</Label>
                <p className="text-xs text-slate-400">Toggle between light and dark theme</p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                className="data-[state=checked]:bg-[--primary]"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>



      {/* Toast Notifications */}
      <Toaster position="bottom-right" richColors expand={true} />
    </div>
  );
}