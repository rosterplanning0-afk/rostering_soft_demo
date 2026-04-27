'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, Menu } from 'lucide-react';

interface NavbarProps {
  userName?: string;
  onMenuClick?: () => void;
}

export default function Navbar({ userName, onMenuClick }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-border z-30 px-4 flex items-center justify-between transition-colors duration-300">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
          aria-label="Toggle Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 bg-primary flex items-center justify-center text-white font-black text-lg rounded-sm shadow-md transition-transform group-hover:scale-105">
            RP
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight hidden sm:block">RosterPro</span>
        </Link>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center px-4 py-1.5 rounded-full bg-slate-50 border border-border">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></div>
          <span className="text-xs font-semibold text-slate-600">Live Services: Normal</span>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-all"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="h-6 w-px bg-border mx-2"></div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-slate-900 leading-tight">{userName || 'Loading...'}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Verified Official</span>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-600 transition-all group"
            title="Sign Out"
          >
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
