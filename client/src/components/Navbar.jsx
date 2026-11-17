import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  UploadCloud, 
  PlayCircle, 
  SearchCode, 
  FileSpreadsheet,
  Activity
} from 'lucide-react';
import { useReconciliation } from '../context/ReconciliationContext';

export default function Navbar() {
  const location = useLocation();
  const { activeReconId, loading } = useReconciliation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Upload Data', path: '/upload', icon: UploadCloud },
    { name: 'Reconciliation', path: '/reconciliation', icon: PlayCircle },
    { name: 'Investigation', path: '/investigation', icon: SearchCode },
    { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Recon<span className="text-indigo-400">X</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                  Onelab AI Native
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Payment Reconciliation & Investigation</p>
            </div>
          </Link>

          {/* Nav Items */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-indigo-400 shadow-inner border border-slate-700/80'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Live Run & Period Badge */}
          <div className="flex items-center space-x-3">
            <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-300 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg shadow-sm">
              <Activity className={`w-3.5 h-3.5 ${loading ? 'text-amber-400 animate-spin' : 'text-emerald-400'}`} />
              <span className="text-slate-400">Run:</span>
              <span className="font-mono text-white font-medium">{activeReconId || 'None'}</span>
            </div>

            <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1.5 rounded-lg shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium">Jan 2026 (INR)</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
