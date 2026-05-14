import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Product, Location } from '../types';
import { Cpu, Filter, Anchor, AlertCircle } from 'lucide-react';

export function SensorsPerBuoy() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [p, l] = await Promise.all([
          dbService.getProducts(),
          dbService.getLocations()
        ]);
        setProducts(p);
        setLocations(l);
      } catch (error) {
        console.error("Error loading sensors data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesLocation = selectedLocationId === 'all' || p.ubicacionId === selectedLocationId;
    return matchesLocation;
  });

  const groupedProducts = locations.reduce((acc, loc) => {
    const locProducts = filteredProducts.filter(p => p.ubicacionId === loc.id);
    if (locProducts.length > 0) {
      acc.push({ location: loc, products: locProducts });
    }
    return acc;
  }, [] as { location: Location; products: Product[] }[]);

  // Add a category for unassigned sensors if any
  const unassigned = filteredProducts.filter(p => !p.ubicacionId || !locations.find(l => l.id === p.ubicacionId));
  if (unassigned.length > 0) {
    const unassignedLoc: Location = { 
      id: 'unassigned', 
      centro: 'Sin Asignar', 
      nombreCliente: 'N/A', 
      region: 'N/A', 
      ciudad: 'N/A', 
      createdAt: new Date() as any, 
      createdBy: 'system' 
    };
    groupedProducts.push({ 
      location: unassignedLoc, 
      products: unassigned 
    });
  }

  return (
    <div className="space-y-6 py-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight">Sensores por <span className="font-bold">Boya</span></h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-1">Configuración y estado de sensores instalados</p>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none" size={18} />
          <select
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-10 outline-none focus:ring-2 focus:ring-white/20 transition-all text-sm appearance-none cursor-pointer font-bold uppercase tracking-wider"
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
          >
            <option value="all" className="bg-[#1e293b]">Seleccionar Ubicación (Todas)</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id} className="bg-[#1e293b]">
                {loc.centro} ({loc.nombreCliente})
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {loading ? (
          <div className="p-12 text-center font-mono opacity-50 uppercase text-xs">Cargando sensores...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center font-mono opacity-30 italic text-xs">No se encontraron sensores registrados</div>
        ) : (
          groupedProducts.map(({ location, products }) => (
            <div key={location.id} className="space-y-6">
              <div className="flex items-center gap-4 px-2">
                <div className="h-px bg-white/10 flex-1"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-mono opacity-40 uppercase tracking-[0.3em] font-bold">{location.nombreCliente}</span>
                  <h2 className="text-xl font-light tracking-tight"><span className="font-bold">{location.centro}</span></h2>
                </div>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => (
                  <div key={p.id} className="glass rounded-3xl p-6 hover:bg-white/5 transition-all group border border-white/5 hover:border-white/10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-400 group-hover:scale-110 transition-transform">
                        <Cpu size={24} />
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.estado === 'Bueno' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {p.estado}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-1">{p.nombre}</h3>
                    <p className="text-xs opacity-50 font-mono mb-4">S/N: {p.serie}</p>
                    
                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={14} className="opacity-40" />
                        <span className="text-xs opacity-80">Marca/Modelo: <span className="font-bold text-white">{p.marca} {p.modelo}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Anchor size={14} className="opacity-40" />
                        <span className="text-[10px] font-mono opacity-40 uppercase tracking-wider">Última Calib: {p.fechaCalibracion || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
