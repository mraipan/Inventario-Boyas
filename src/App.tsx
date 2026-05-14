/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, login, logout, loginWithEmail } from './firebase';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { LocationManager } from './components/LocationManager';
import { Reports } from './components/Reports';
import { Package, MapPin, BarChart3, History, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type View = 'dashboard' | 'inventory' | 'locations' | 'reports';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      // Map 'marco' to an email for Firebase Auth compatibility
      const email = username === 'marco' ? 'marco@test.com' : username;
      await loginWithEmail(email, password);
    } catch (error: any) {
      setLoginError('Error: ' + (error.message || 'Credenciales inválidas'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center font-mono text-white">
        <div className="mesh-gradient"></div>
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-sm tracking-widest"
        >
          INICIALIZANDO SISTEMA...
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-white overflow-y-auto">
        <div className="mesh-gradient"></div>
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-md w-full glass rounded-3xl p-8 my-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-bold text-xl">
              INV
            </div>
            <div>
              <h1 className="text-2xl font-light tracking-tight">Boyas <span className="font-bold">Oceanográficas</span></h1>
              <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest">v1.0.0</p>
            </div>
          </div>
          
          <p className="text-sm mb-8 leading-relaxed opacity-70">
            Acceso restringido. Por favor, inicie sesión para gestionar el inventario y equipos.
          </p>

          <div className="space-y-6">
            <button
              onClick={login}
              id="login-button"
              className="w-full flex items-center justify-center gap-2 bg-white text-[#0f172a] py-3 px-6 rounded-2xl hover:bg-cyan-50 transition-colors font-bold text-sm tracking-wider"
            >
              <LogIn size={18} />
              Entrar con Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-[#1e293b] px-3 opacity-40">O acceso de pruebas</span></div>
            </div>

            <form onSubmit={handleTestLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase opacity-40 ml-1">Usuario</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="marco"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase opacity-40 ml-1">Contraseña</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/40"
                />
              </div>
              
              {loginError && <p className="text-[10px] text-red-400 text-center uppercase tracking-wider">{loginError}</p>}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-white/10 text-white py-3 px-6 rounded-2xl hover:bg-white/20 transition-colors font-bold text-sm tracking-wider"
              >
                <ShieldCheck size={18} />
                Acceder (Demo)
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white selection:bg-white/20 selection:text-cyan-400">
      <div className="mesh-gradient"></div>
      <div className="flex h-screen overflow-hidden p-6 gap-6">
        {/* Sidebar */}
        <aside className="w-64 glass rounded-3xl flex flex-col overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-sm">INV</div>
              <span className="font-light tracking-tight text-lg">Boyas<span className="font-bold">Oceanográficas</span></span>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            <NavButton 
              active={currentView === 'dashboard'} 
              onClick={() => setCurrentView('dashboard')}
              icon={<BarChart3 size={18} />}
              label="Dashboard"
            />
            <NavButton 
              active={currentView === 'inventory'} 
              onClick={() => setCurrentView('inventory')}
              icon={<Package size={18} />}
              label="Equipos"
            />
            <NavButton 
              active={currentView === 'locations'} 
              onClick={() => setCurrentView('locations')}
              icon={<MapPin size={18} />}
              label="Ubicaciones"
            />
            <NavButton 
              active={currentView === 'reports'} 
              onClick={() => setCurrentView('reports')}
              icon={<History size={18} />}
              label="Historial"
            />
          </nav>

          <div className="p-6 bg-white/5 mt-auto border-t border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center text-sm font-bold border border-white/20">
                {user.email?.[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold truncate">{user.displayName || user.email}</p>
                <p className="text-[10px] font-mono opacity-40 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-widest hover:text-red-400 transition-colors"
            >
              <LogOut size={12} />
              Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {currentView === 'dashboard' && <Dashboard onNavigate={setCurrentView} />}
                {currentView === 'inventory' && <Inventory />}
                {currentView === 'locations' && <LocationManager />}
                {currentView === 'reports' && <Reports />}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all relative ${
        active 
          ? 'bg-white/20 text-white font-bold' 
          : 'hover:bg-white/10 text-white/60 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
      {active && (
        <motion.div 
          layoutId="active-indicator" 
          className="absolute right-3 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]" 
        />
      )}
    </button>
  );
}
