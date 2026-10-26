import { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, LogOut, User, TrendingUp, Shield, RefreshCw, Bell } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Layout = ({ children, currentPage, onNavigate }: LayoutProps) => {
  const { profile, isAdmin, signOut, refreshProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    console.log('Before refresh - isAdmin:', isAdmin);
    console.log('Before refresh - profile:', profile);
    await refreshProfile();
    console.log('After refresh - isAdmin:', isAdmin);
    console.log('After refresh - profile:', profile);
    setTimeout(() => setRefreshing(false), 1000);
  };

  console.log('Layout render - isAdmin:', isAdmin);
  console.log('Layout render - profile:', profile);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: Shield }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      <aside
        className={`bg-white/90 backdrop-blur-sm border-r border-slate-200/50 shadow-xl transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0 md:w-20'
        } flex-shrink-0`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-slate-200/50 flex items-center justify-between">
            {sidebarOpen ? (
              <div className="flex items-center gap-2">
                <img
                  src="/1_Daily_Logo_SVG.svg"
                  alt="OneDaily AI"
                  className="h-10"
                />
              </div>
            ) : (
              <div className="hidden md:flex items-center justify-center w-full">
                <img
                  src="/1_Daily_favicon.svg"
                  alt="OneDaily"
                  className="h-10 w-10"
                />
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all md:block hidden"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5 text-slate-600" />
              ) : (
                <Menu className="w-5 h-5 text-slate-600" />
              )}
            </button>
          </div>

          <nav className="flex-1 p-4">
            {sidebarOpen ? (
              <div className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
                        currentPage === item.id
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 hidden md:block">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center justify-center p-3 rounded-xl transition-all ${
                        currentPage === item.id
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                          : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                      title={item.label}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-slate-200/50">
            {sidebarOpen ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200/50">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-slate-600 truncate font-medium">
                      {profile?.organization || 'Organization'}
                    </p>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-1.5 hover:bg-white rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                    title="Refresh profile"
                  >
                    <RefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all font-semibold"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 hidden md:block">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="w-full flex items-center justify-center p-3 text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all disabled:opacity-50"
                  title="Refresh profile"
                >
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={signOut}
                  className="w-full flex items-center justify-center p-3 text-slate-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="md:hidden bg-white/90 backdrop-blur-sm border-b border-slate-200/50 p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <img
              src="/1_Daily_Logo_SVG.svg"
              alt="OneDaily AI"
              className="h-10"
            />
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
        </div>
        {children}
      </main>
    </div>
  );
};
