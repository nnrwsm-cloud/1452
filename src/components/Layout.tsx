import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { auth, logOut, signIn } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Send, CalendarDays, CloudSun, TrendingUp, User as UserIcon, LogOut, LogIn, Menu, X } from 'lucide-react';

export default function Layout() {
  const [user, setUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const d = now.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });
      const t = now.toLocaleTimeString('zh-CN', { hour12: false });
      setCurrentTime(`${d} ${t}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white h-16 px-4 md:px-6 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="集运巴巴" className="h-10 object-contain" onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }} />
            <div className="hidden flex items-center gap-2">
              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white">
                <Send className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-slate-800 hidden sm:block">集运巴巴 | SaaS工作台</span>
            </div>
          </Link>
        </div>

        {/* Info Bar (Desktop) */}
        <div className="hidden md:flex gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-md">
            <CalendarDays className="w-4 h-4 text-slate-500" />
            <span>{currentTime}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-md">
            <CloudSun className="w-4 h-4 text-slate-500" />
            <span>深圳 晴 26°C</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-md">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <span>USD/CNY: 7.24</span>
          </div>
        </div>

        {/* Auth Area */}
        <div className="flex items-center gap-3">
          {!isHome && (
            <Link to="/" className="hidden sm:flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-800 mr-2">
              返回工作台
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-700 hidden sm:block">{user.displayName || user.email?.split('@')[0]}</span>
              <button onClick={logOut} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="退出登录">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button onClick={signIn} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md text-sm font-medium hover:bg-slate-700 transition-colors shadow-sm">
              <UserIcon className="w-4 h-4" />
              <span className="hidden sm:inline">登录 / 注册</span>
            </button>
          )}
          
          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-slate-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CalendarDays className="w-4 h-4 text-slate-500" /> {currentTime}
          </div>
          {!isHome && (
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="block text-sm font-medium text-slate-800">
              返回工作台首页
            </Link>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}

