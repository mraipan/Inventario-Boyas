import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Product, Location, ProductStatus } from '../types';
import { Plus, Search, Filter, Pencil, Trash2, Download, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [p, l] = await Promise.all([dbService.getProducts(), dbService.getLocations()]);
    setProducts(p || []);
    setLocations(l || []);
    setLoading(false);
  };

  const filteredProducts = products.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.serie.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.marca.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string, nombre: string) => {
    if (confirm(`¿Está seguro de eliminar el producto ${nombre}?`)) {
      await dbService.deleteProduct(id, nombre);
      fetchData();
    }
  };

  return (
    <div className="space-y-6 py-4">
      <header className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Inventario de <span className="font-bold">Boyas</span></h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-1">Control de Equipos y Calibraciones</p>
        </div>
        <button
          onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
          className="bg-white text-[#0f172a] py-3 px-6 rounded-2xl hover:bg-cyan-50 transition-colors font-bold text-sm tracking-wider flex items-center gap-2"
        >
          <Plus size={18} />
          Nuevo Registro
        </button>
      </header>

      <div className="flex gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 group-focus-within:text-cyan-400 transition-all" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, serie o marca..."
            className="w-full glass bg-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-white/40 transition-all placeholder:text-white/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="text-white/40 border-b border-white/10 sticky top-0 bg-[#0f172a]/80 backdrop-blur-md z-10">
              <tr>
                <th className="p-6 font-medium text-xs uppercase tracking-widest">Producto / Marca</th>
                <th className="p-6 font-medium text-xs uppercase tracking-widest text-center">Serie</th>
                <th className="p-6 font-medium text-xs uppercase tracking-widest text-center">Estado</th>
                <th className="p-6 font-medium text-xs uppercase tracking-widest">Ubicación</th>
                <th className="p-6 font-medium text-xs uppercase tracking-widest text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center font-mono opacity-50 uppercase text-xs">Cargando datos...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center font-mono opacity-30 italic text-xs">No se encontraron equipos</td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 group transition-colors">
                    <td className="p-6">
                      <div className="font-semibold text-base">{p.nombre}</div>
                      <div className="text-xs opacity-50">{p.marca} • {p.modelo}</div>
                    </td>
                    <td className="p-6 text-center font-mono text-cyan-400 font-bold tracking-tight">
                      {p.serie}
                    </td>
                    <td className="p-6 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        p.estado === ProductStatus.BUENO 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="font-medium">{locations.find(l => l.id === p.ubicacionId)?.centro || 'No asignada'}</div>
                      <div className="text-[10px] opacity-40 uppercase tracking-tight">{locations.find(l => l.id === p.ubicacionId)?.nombreCliente}</div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-3 translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                        <button 
                          onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}
                          className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id!, p.nombre)}
                          className="p-2 hover:bg-red-500/20 rounded-xl text-white/40 hover:text-red-400 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <ProductModal 
            onClose={() => setIsModalOpen(false)} 
            onSave={fetchData} 
            editingProduct={editingProduct}
            locations={locations}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductModal({ onClose, onSave, editingProduct, locations }: { onClose: () => void; onSave: () => void, editingProduct: Product | null, locations: Location[] }) {
  const [formData, setFormData] = useState<Partial<Product>>(
    editingProduct || {
      nombre: '',
      marca: '',
      modelo: '',
      serie: '',
      estado: ProductStatus.BUENO,
      ubicacionId: '',
      fechaCalibracion: '',
      documentoCalibracionUrl: ''
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await dbService.updateProduct(editingProduct.id!, formData);
      } else {
        await dbService.addProduct(formData as any);
      }
      onSave();
      onClose();
    } catch (error) {
      alert("Error al guardar el producto. Revise si la serie ya existe.");
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
        className="glass rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="bg-white/5 border-b border-white/10 p-6 flex justify-between items-center">
          <h3 className="text-xl font-light tracking-tight">{editingProduct ? 'Editar' : 'Registrar'} <span className="font-bold">Equipo</span></h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Nombre del Producto</label>
              <input
                required
                type="text"
                placeholder="Ej: Multímetro Digital"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-white/40 transition-all"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">N° Serie (Único)</label>
              <input
                required
                disabled={!!editingProduct}
                type="text"
                placeholder="SN-0000"
                className="w-full bg-white/5 border border-white/20 text-cyan-300 font-mono rounded-xl px-4 py-3 outline-none disabled:opacity-50"
                value={formData.serie}
                onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Marca</label>
              <input
                required
                type="text"
                placeholder="Fluke, Tektronix..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Modelo</label>
              <input
                required
                type="text"
                placeholder="Ej: Model 87V"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none"
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Estado Físico</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none appearance-none"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value as ProductStatus })}
              >
                <option value={ProductStatus.BUENO} className="bg-slate-800">Bueno</option>
                <option value={ProductStatus.MALO} className="bg-slate-800">Malo</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Ubicación Asignada</label>
              <select
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none appearance-none"
                value={formData.ubicacionId}
                onChange={(e) => setFormData({ ...formData, ubicacionId: e.target.value })}
              >
                <option value="" className="bg-slate-800">Seleccionar...</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id} className="bg-slate-800">{l.centro} ({l.region})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Fecha de Calibración</label>
              <input
                type="date"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none [color-scheme:dark]"
                value={formData.fechaCalibracion}
                onChange={(e) => setFormData({ ...formData, fechaCalibracion: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Documento URL</label>
              <input
                type="text"
                placeholder="Link al PDF..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none"
                value={formData.documentoCalibracionUrl}
                onChange={(e) => setFormData({ ...formData, documentoCalibracionUrl: e.target.value })}
              />
            </div>
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
              {isSubmitting ? 'GUARDANDO...' : editingProduct ? 'Actualizar Registro' : 'Registrar Producto'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
