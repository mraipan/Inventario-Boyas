import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { AppUser } from '../types';
import { Plus, Users, Mail, Phone, Pencil, Trash2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function UserManager() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const data = await dbService.getUsers();
    setUsers(data || []);
    setLoading(false);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (confirm(`¿Eliminar al usuario "${nombre}"?`)) {
      await dbService.deleteUser(id);
      fetchData();
    }
  };

  return (
    <div className="space-y-6 py-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight">Gestión de <span className="font-bold">Usuarios</span></h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-1">Registrar y listar usuarios del sistema</p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
          className="w-full md:w-auto bg-white text-[#0f172a] py-3 px-6 rounded-2xl hover:bg-cyan-50 transition-colors font-bold text-sm tracking-wider flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Nuevo Usuario
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
        {loading ? (
          <div className="col-span-full py-12 text-center font-mono opacity-50 uppercase text-xs">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="col-span-full py-12 text-center font-mono opacity-30 italic text-xs">No hay usuarios registrados</div>
        ) : (
          users.map((user) => (
            <motion.div 
              key={user.id}
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass rounded-3xl p-8 flex flex-col group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[60px] -mr-12 -mt-12"></div>
              
              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-all duration-500">
                  <Users size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
                  <button onClick={() => { setEditingUser(user); setIsModalOpen(true); }} className="px-3 py-1.5 glass-dark hover:bg-white/10 text-[10px] font-bold uppercase transition-colors">Editar</button>
                  <button onClick={() => handleDelete(user.id!, user.nombre)} className="px-3 py-1.5 glass-dark hover:bg-red-500/20 text-[10px] font-bold uppercase text-red-400 transition-colors">Borrar</button>
                </div>
              </div>
              
              <div className="relative z-10 flex-grow flex flex-col">
                <h3 className="text-xl font-bold tracking-tight text-white mb-2">{user.nombre}</h3>
                
                <div className="mb-6">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-mono uppercase tracking-wider border ${
                    user.cargo === 'Administrador' ? 'bg-rose-400/10 text-rose-400 border-rose-400/20' :
                    user.cargo === 'Soporte' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' :
                    'bg-cyan-400/10 text-cyan-400 border-cyan-400/20'
                  }`}>
                    {user.cargo || 'Técnico'}
                  </span>
                </div>
                
                <div className="space-y-2.5 mt-auto text-sm text-white/70">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-cyan-400/70 shrink-0" />
                    <span className="font-mono text-xs truncate" title={user.correo}>{user.correo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-cyan-400/70 shrink-0" />
                    <span className="text-xs">{user.telefono}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <UserModal 
            onClose={() => setIsModalOpen(false)} 
            onSave={fetchData} 
            editingUser={editingUser}
            existingUsers={users}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UserModal({ onClose, onSave, editingUser, existingUsers }: { onClose: () => void; onSave: () => void, editingUser: AppUser | null, existingUsers: AppUser[] }) {
  const [formData, setFormData] = useState<Partial<AppUser>>({
    nombre: editingUser?.nombre || '',
    correo: editingUser?.correo || '',
    telefono: editingUser?.telefono || '',
    cargo: editingUser?.cargo || 'Administrador',
    contrasena: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordVal = formData.contrasena || '';
  const hasMinLen = passwordVal.length >= 8;
  const hasLetters = /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(passwordVal);
  const hasNumbers = /[0-9]/.test(passwordVal);
  const hasSpecial = /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/.test(passwordVal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const emailClean = (formData.correo || '').trim().toLowerCase();
    const phoneClean = (formData.telefono || '').trim();
    const nameClean = (formData.nombre || '').trim();
    const cargoClean = formData.cargo || 'Administrador';
    const passwordClean = passwordVal.trim();

    if (!nameClean || !emailClean || !phoneClean || !cargoClean) {
      alert("Por favor complete todos los campos requeridos.");
      setIsSubmitting(false);
      return;
    }

    // Uniqueness validation on Email:
    const duplicateEmail = existingUsers.find(u => 
      u.id !== editingUser?.id && 
      u.correo.trim().toLowerCase() === emailClean
    );

    if (duplicateEmail) {
      alert(`El correo "${emailClean}" ya está registrado para el usuario "${duplicateEmail.nombre}".`);
      setIsSubmitting(false);
      return;
    }

    // Password validation:
    const isNewUser = !editingUser;
    if (isNewUser || passwordClean !== '') {
      const pMinLen = passwordClean.length >= 8;
      const pLetters = /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(passwordClean);
      const pNumbers = /[0-9]/.test(passwordClean);
      const pSpecial = /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/.test(passwordClean);

      if (!pMinLen || !pLetters || !pNumbers || !pSpecial) {
        alert("La contraseña no cumple con los requisitos de seguridad (mínimo 8 caracteres, con letras, números y al menos un carácter especial).");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      if (editingUser) {
        const updatePayload: Partial<AppUser> = {
          nombre: nameClean,
          correo: emailClean,
          telefono: phoneClean,
          cargo: cargoClean
        };
        if (passwordClean !== '') {
          updatePayload.contrasena = passwordClean;
        }
        await dbService.updateUser(editingUser.id!, updatePayload);
      } else {
        await dbService.addUser({
          nombre: nameClean,
          correo: emailClean,
          telefono: phoneClean,
          cargo: cargoClean,
          contrasena: passwordClean
        });
      }
      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Error al guardar el usuario: " + dbService.getFriendlyErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#090d16]/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Card */}
      <motion.div 
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className="bg-[#0f172a] border border-white/10 rounded-[32px] w-full max-w-lg p-8 relative z-10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-cyan-500/10 to-transparent blur-3xl pointer-events-none"></div>

        <header className="mb-6 relative">
          <h3 className="text-xl font-light tracking-tight">{editingUser ? 'Editar' : 'Registrar'} <span className="font-bold">Usuario</span></h3>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-1">Formulario de información del usuario</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto pr-1 flex-grow">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1 text-white/50">Nombre Completo</label>
            <input
              required
              type="text"
              placeholder="Ej: Juan Pérez"
              className="w-full bg-white/5 border border-white/10 font-sans rounded-xl px-4 py-3 outline-none focus:border-cyan-400 text-sm lg:text-base text-white placeholder-white/20 transition-all"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1 text-white/50">Correo Electrónico</label>
            <input
              required
              type="email"
              placeholder="Ej: juan.perez@empresa.com"
              className="w-full bg-white/5 border border-white/10 font-sans rounded-xl px-4 py-3 outline-none focus:border-cyan-400 text-sm lg:text-base text-white placeholder-white/20 transition-all font-mono lowercase"
              value={formData.correo}
              onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1 text-white/50">Número Telefónico</label>
            <input
              required
              type="text"
              placeholder="Ej: +56 9 1234 5678"
              className="w-full bg-white/5 border border-white/10 font-sans rounded-xl px-4 py-3 outline-none focus:border-cyan-400 text-sm lg:text-base text-white placeholder-white/20 transition-all"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1 text-white/50">Cargo / Rol</label>
            <select
              required
              className="w-full bg-[#1b233a] border border-white/10 font-sans rounded-xl px-4 py-3 outline-none focus:border-cyan-400 text-sm lg:text-base text-white transition-all [&>option]:bg-[#0f172a] [&>option]:text-white cursor-pointer"
              value={formData.cargo}
              onChange={(e) => setFormData({ ...formData, cargo: e.target.value as any })}
            >
              <option value="Administrador">Administrador</option>
              <option value="Soporte">Soporte</option>
              <option value="Técnico">Técnico</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1 text-white/50">
              Contraseña {editingUser && <span className="opacity-60 lowercase font-normal italic">(dejar vacío para mantener actual)</span>}
            </label>
            <div className="relative">
              <input
                required={!editingUser}
                type={showPassword ? 'text' : 'password'}
                placeholder={editingUser ? "••••••••" : "Ingrese una contraseña segura"}
                className="w-full bg-white/5 border border-white/10 font-sans rounded-xl pl-4 pr-12 py-3 outline-none focus:border-cyan-400 text-sm lg:text-base text-white placeholder-white/20 transition-all font-mono"
                value={formData.contrasena || ''}
                onChange={(e) => setFormData({ ...formData, contrasena: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/80 transition-colors"
                title={showPassword ? "Ocultar Contraseña" : "Mostrar Contraseña"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {/* Live Password Requirements feedback shown only when typed or required */}
            {(!editingUser || (formData.contrasena && formData.contrasena.trim() !== '')) && (
              <div className="mt-2.5 p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1.5 text-[11px] font-sans">
                <p className="font-semibold text-white/60 mb-1 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-cyan-400 shrink-0" /> Restricciones de seguridad:
                </p>
                <div className="grid grid-cols-1 gap-1 text-white/50">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasMinLen ? 'bg-emerald-400' : 'bg-red-400/85'}`} />
                    <span className={hasMinLen ? 'text-emerald-400 font-medium' : ''}>Mínimo 8 caracteres</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasLetters && hasNumbers ? 'bg-emerald-400' : 'bg-red-400/85'}`} />
                    <span className={hasLetters && hasNumbers ? 'text-emerald-400 font-medium' : ''}>Debe contener letras y números</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasSpecial ? 'bg-emerald-400' : 'bg-red-400/85'}`} />
                    <span className={hasSpecial ? 'text-emerald-400 font-medium' : ''}>Al menos un carácter especial (ej: !@#$...)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pb-4 lg:pb-0 pt-4 flex flex-col md:flex-row gap-4 font-sans">
            <button
              type="button"
              onClick={onClose}
              className="w-full md:w-1/2 bg-white/5 hover:bg-white/10 text-white/80 py-3 rounded-xl transition-colors font-medium text-sm border border-white/10"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-full md:w-1/2 bg-cyan-400 hover:bg-cyan-300 text-[#0f172a] py-3 rounded-xl transition-colors font-bold text-sm shadow-lg shadow-cyan-400/10"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'GUARDANDO...' : editingUser ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
