import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Location } from '../types';
import { CHILE_REGIONS } from '../constants';
import { Plus, Search, Pencil, Trash2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function LocationManager() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const data = await dbService.getLocations();
    setLocations(data || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta ubicación? Asegúrese de que no haya equipos asociados.')) {
      await dbService.deleteLocation(id);
      fetchData();
    }
  };

  return (
    <div className="space-y-6 py-4">
      <header className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Gestión de <span className="font-bold">Ubicaciones</span></h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-1">Configuración de Sedes y Clientes</p>
        </div>
        <button
          onClick={() => { setEditingLocation(null); setIsModalOpen(true); }}
          className="bg-white text-[#0f172a] py-3 px-6 rounded-2xl hover:bg-cyan-50 transition-colors font-bold text-sm tracking-wider flex items-center gap-2"
        >
          <Plus size={18} />
          Nueva Ubicación
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center font-mono opacity-50 uppercase text-xs">Cargando ubicaciones...</div>
        ) : locations.length === 0 ? (
          <div className="col-span-full py-12 text-center font-mono opacity-30 italic text-xs">No hay ubicaciones registradas</div>
        ) : (
          locations.map((loc) => (
            <motion.div 
              key={loc.id}
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass rounded-3xl p-8 flex flex-col group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[60px] -mr-12 -mt-12"></div>
              
              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-all duration-500">
                  <MapPin size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
                  <button onClick={() => { setEditingLocation(loc); setIsModalOpen(true); }} className="px-3 py-1.5 glass-dark hover:bg-white/10 text-[10px] font-bold uppercase transition-colors">Editar</button>
                  <button onClick={() => handleDelete(loc.id!)} className="px-3 py-1.5 glass-dark hover:bg-red-500/20 text-[10px] font-bold uppercase text-red-400 transition-colors">Borrar</button>
                </div>
              </div>
              
              <div className="relative z-10">
                <h3 className="text-xl font-bold tracking-tight mb-1">{loc.centro}</h3>
                <p className="text-sm opacity-50 font-medium mb-6">{loc.nombreCliente}</p>
                
                <div className="pt-4 border-t border-white/5 flex gap-4 items-center text-[10px] font-mono uppercase tracking-widest opacity-40">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    {loc.region}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {loc.ciudad}
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <LocationModal 
            onClose={() => setIsModalOpen(false)} 
            onSave={fetchData} 
            editingLocation={editingLocation}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LocationModal({ onClose, onSave, editingLocation }: { onClose: () => void; onSave: () => void, editingLocation: Location | null }) {
  const [formData, setFormData] = useState<Partial<Location>>(
    editingLocation || {
      nombreCliente: '',
      region: '',
      ciudad: '',
      centro: ''
    }
  );

  const selectedRegionData = CHILE_REGIONS.find(r => r.name === formData.region);
  const cities = selectedRegionData ? selectedRegionData.cities : [];
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingLocation) {
        await dbService.updateLocation(editingLocation.id!, formData);
      } else {
        await dbService.addLocation(formData as any);
      }
      onSave();
      onClose();
    } catch (error) {
      alert("Error al guardar la ubicación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="bg-white/5 border-b border-white/10 p-6 flex justify-between items-center">
          <h3 className="text-xl font-light tracking-tight">{editingLocation ? 'Editar' : 'Nueva'} <span className="font-bold">Ubicación</span></h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Nombre del Cliente</label>
            <input
              required
              type="text"
              placeholder="Ej: Hospital Central"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none"
              value={formData.nombreCliente}
              onChange={(e) => setFormData({ ...formData, nombreCliente: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Región</label>
            <select
              required
              className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 outline-none text-sm appearance-none"
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value, ciudad: '' })}
            >
              <option value="">Seleccione Región</option>
              {CHILE_REGIONS.map(r => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Ciudad</label>
            <select
              required
              disabled={!formData.region}
              className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 outline-none text-sm appearance-none disabled:opacity-50"
              value={formData.ciudad}
              onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
            >
              <option value="">Seleccione Ciudad</option>
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Centro / Sede</label>
            <input
              required
              type="text"
              placeholder="Ej: Campus Norte"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none"
              value={formData.centro}
              onChange={(e) => setFormData({ ...formData, centro: e.target.value })}
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/10 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={isSubmitting}
              type="submit"
              className="flex-1 py-4 bg-white text-slate-900 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-cyan-50 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'GUARDANDO...' : editingLocation ? 'Actualizar' : 'Guardar Ubicación'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
