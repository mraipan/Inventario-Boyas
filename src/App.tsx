/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signInAnonymously } from 'firebase/auth';
import { auth, login, logout, loginWithEmail, registerWithEmail, db } from './firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { AppUser } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { LocationManager } from './components/LocationManager';
import { Reports } from './components/Reports';
import { SensorsPerBuoy } from './components/SensorsPerBuoy';
import { Maintenance } from './components/Maintenance';
import { UserManager } from './components/UserManager';
import { Package, MapPin, BarChart3, History, LogIn, LogOut, ShieldCheck, UserPlus, Menu, X, Cpu, Wrench, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type View = 'dashboard' | 'inventory' | 'locations' | 'reports' | 'sensors' | 'maintenance' | 'users';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        // Intentar obtener el perfil del usuario utilizando su email
        try {
          const emailLower = currentUser.email?.toLowerCase().trim();
          if (emailLower) {
            const q = query(collection(db, 'users'), where('correo', '==', emailLower));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              const docData = snapshot.docs[0].data();
              setProfile({
                id: snapshot.docs[0].id,
                ...docData
              } as AppUser);
            } else {
              // Si no existe perfil en el listado, asumimos perfil de administrador por defecto
              setProfile({
                nombre: currentUser.displayName || currentUser.email || 'Administrador',
                correo: currentUser.email || '',
                telefono: '',
                cargo: 'Administrador',
                createdAt: null,
                createdBy: ''
              });
            }
          } else {
            // Ver si hay un perfil guardado localmente (para inicio de sesión anónimo con credenciales personalizadas)
            const savedProfileStr = localStorage.getItem('custom_user_profile');
            if (savedProfileStr) {
              setProfile(JSON.parse(savedProfileStr));
            } else {
              setProfile(null);
            }
          }
        } catch (err) {
          console.error("Error al cargar perfil usuario:", err);
          setProfile({
            nombre: currentUser.displayName || currentUser.email || 'Usuario',
            correo: currentUser.email || '',
            telefono: '',
            cargo: 'Administrador',
            createdAt: null,
            createdBy: ''
          });
        }
      } else {
        setUser(null);
        setProfile(null);
        localStorage.removeItem('custom_user_profile');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    const emailTrim = username.toLowerCase().trim();
    // Mapeo por compatibilidad con cuentas antiguas de demo que no tenían formato de email
    const email = emailTrim.includes('@') ? emailTrim : `${emailTrim}@demo.com`;

    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
        alert('Usuario "' + username + '" creado con éxito. Ahora puedes entrar.');
        setAuthMode('login');
      }
    } catch (error: any) {
      console.error("Auth Error:", error.code, error.message);
      
      // Fallback: verificar si el usuario existe en nuestra colección personalizada 'users' en Firestore
      if (authMode === 'login') {
        try {
          const emailLower = email.toLowerCase().trim();
          let userData: any = null;
          let userId: string = '';

          // 1. Intentar GET directo del documento de usuario (públicamente permitido por reglas: allow get: if true)
          const userDocRef = doc(db, 'users', emailLower);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            userData = userDoc.data();
            userId = userDoc.id;
          } else {
            // 2. Si no, por compatibilidad con usuarios antiguos creados con IDs aleatorios, intentamos búsqueda anónima
            try {
              await signInAnonymously(auth);
              const q = query(collection(db, 'users'), where('correo', '==', emailLower));
              const snapshot = await getDocs(q);
              const matched = snapshot.docs.find(d => d.data().correo?.toLowerCase() === emailLower);
              if (matched) {
                userData = matched.data();
                userId = matched.id;
              }
              if (!userData) {
                await auth.signOut();
              }
            } catch (anonErr) {
              console.warn("Búsqueda anónima omitida o fallida:", anonErr);
            }
          }

          if (userData && userData.contrasena === password) {
            // ¡Credenciales correctas encontradas en base de datos!
            // Registramos de forma transparente este usuario en Firebase Auth en tiempo real
            console.log("Credenciales de DB correctas. Auto-registrando en Firebase Auth...");
            try {
              await registerWithEmail(emailLower, password);
              // Al crearse la cuenta mediante registerWithEmail, automáticamente se inicia sesión principal
              setLoading(false);
              return;
            } catch (regError: any) {
              if (regError.code === 'auth/email-already-in-use') {
                // Si ya está registrado en Firebase Auth, pero no correspondía la contraseña
                setLoginError('Contraseña incorrecta.');
                setLoading(false);
                return;
              } else {
                throw regError;
              }
            }
          } else if (userData) {
            // Usuario existe en la DB pero la contraseña es incorrecta
            setLoginError('Contraseña incorrecta.');
            setLoading(false);
            return;
          }
        } catch (dbErr) {
          console.error("Error al verificar credenciales en base de datos:", dbErr);
        }
      }

      if (error.code === 'auth/user-not-found') {
        setLoginError('Usuario no registrado o contraseña incorrecta.');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setLoginError('Contraseña incorrecta.');
      } else if (error.code === 'auth/email-already-in-use') {
        setLoginError('Este usuario ya existe. Intenta entrar directamente.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError('ACCESO DESACTIVADO: Debes habilitar "Email/Password" en tu Consola de Firebase.');
      } else if (error.code === 'auth/weak-password') {
        setLoginError('La contraseña es muy corta (mínimo 6 caracteres).');
      } else {
        setLoginError('Error: ' + (error.message || 'Intente nuevamente'));
      }
    } finally {
      setLoading(false);
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
            <div className="flex bg-white/5 p-1 rounded-xl">
              <button 
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 text-[10px] uppercase font-bold tracking-widest rounded-lg transition-all ${authMode === 'login' ? 'bg-white text-[#0f172a]' : 'opacity-40 hover:opacity-100'}`}
              >
                Entrar
              </button>
              <button 
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 text-[10px] uppercase font-bold tracking-widest rounded-lg transition-all ${authMode === 'register' ? 'bg-white text-[#0f172a]' : 'opacity-40 hover:opacity-100'}`}
              >
                Registrarse
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase opacity-40 ml-1">Email / Correo Electrónico</label>
                <input 
                  type="email" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: usuario@empresa.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/40"
                  required
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
                  required
                />
              </div>
              
              {loginError && <p className="text-[10px] text-red-400 text-center uppercase tracking-wider font-bold max-w-xs mx-auto leading-tight">{loginError}</p>}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-white/10 text-white py-3 px-6 rounded-2xl hover:bg-white/20 transition-colors font-bold text-sm tracking-wider"
              >
                {authMode === 'login' ? <ShieldCheck size={18} /> : <UserPlus size={18} />}
                {authMode === 'login' ? 'Acceder al Sistema' : 'Crear Cuenta Demo'}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-[#1e293b] px-3 opacity-40 text-white">O usa tu cuenta de</span></div>
            </div>

            <button
              onClick={login}
              className="w-full flex items-center justify-center gap-2 bg-white text-[#0f172a] py-3 px-6 rounded-2xl hover:bg-cyan-50 transition-colors font-bold text-sm tracking-wider"
            >
              <LogIn size={18} />
              Google Login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white selection:bg-white/20 selection:text-cyan-400">
      <div className="mesh-gradient"></div>
      
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 glass border-b border-white/10 z-40 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-sm">INV</div>
          <span className="font-light tracking-tight text-lg">Boyas<span className="font-bold">Oceanográficas</span></span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="flex h-screen overflow-hidden lg:p-6 p-0 lg:gap-6 gap-0">
        {/* Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={`
          fixed lg:relative z-50 lg:z-0
          w-72 lg:w-64 h-full
          glass lg:rounded-3xl flex flex-col overflow-hidden
          transition-transform duration-300 ease-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-8">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-sm">INV</div>
              <span className="font-light tracking-tight text-lg">Boyas<span className="font-bold">Oceanográficas</span></span>
            </div>
            <p className="text-[10px] font-mono opacity-40 uppercase tracking-[0.2em] ml-10">Control Panel</p>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            <NavButton 
              active={currentView === 'dashboard'} 
              onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }}
              icon={<BarChart3 size={18} />}
              label="Dashboard"
            />
            <NavButton 
              active={currentView === 'inventory'} 
              onClick={() => { setCurrentView('inventory'); setIsSidebarOpen(false); }}
              icon={<Package size={18} />}
              label="Equipos"
            />
            <NavButton 
              active={currentView === 'locations'} 
              onClick={() => { setCurrentView('locations'); setIsSidebarOpen(false); }}
              icon={<MapPin size={18} />}
              label="Ubicaciones"
            />
            <NavButton 
              active={currentView === 'sensors'} 
              onClick={() => { setCurrentView('sensors'); setIsSidebarOpen(false); }}
              icon={<Cpu size={18} />}
              label="Sensores por Boya"
            />
            <NavButton 
              active={currentView === 'reports'} 
              onClick={() => { setCurrentView('reports'); setIsSidebarOpen(false); }}
              icon={<History size={18} />}
              label="Historial"
            />
            <NavButton 
              active={currentView === 'users'} 
              onClick={() => { setCurrentView('users'); setIsSidebarOpen(false); }}
              icon={<Users size={18} />}
              label="Usuarios"
            />
          </nav>

          <div className="p-6 bg-white/5 mt-auto border-t border-white/10 mb-safe-bottom">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center text-sm font-bold border border-white/20 uppercase shrink-0">
                {(profile?.nombre?.[0] || profile?.correo?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold truncate" title={profile?.nombre || user?.displayName || user?.email || 'Usuario'}>
                  {profile?.nombre || user?.displayName || user?.email || 'Usuario'}
                </p>
                <div className="flex flex-col gap-0.5">
                  <p className="text-[10px] font-mono opacity-40 truncate" title={profile?.correo || user?.email || undefined}>
                    {profile?.correo || user?.email}
                  </p>
                  {profile?.cargo && (
                    <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded-md w-max mt-0.5 border border-cyan-400/20">
                      {profile.cargo}
                    </span>
                  )}
                </div>
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
        <main className="flex-1 overflow-hidden flex flex-col p-4 lg:p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col pt-2 lg:pt-0"
            >
              <div className="flex-1 overflow-y-auto custom-scrollbar lg:pr-2">
                {currentView === 'dashboard' && <Dashboard onNavigate={setCurrentView} />}
                {currentView === 'inventory' && <Inventory />}
                {currentView === 'locations' && <LocationManager />}
                {currentView === 'sensors' && <SensorsPerBuoy />}
                {currentView === 'maintenance' && <Maintenance />}
                {currentView === 'reports' && <Reports />}
                {currentView === 'users' && <UserManager />}
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
