import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Movement, MovementType, Product, Location } from '../types';
import { History, Download, FileText, Filter, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

export function Reports() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [movData, prodData, locData] = await Promise.all([
      dbService.getMovements(),
      dbService.getProducts(),
      dbService.getLocations()
    ]);
    setMovements(movData || []);
    setProducts(prodData || []);
    setLocations(locData || []);
    setLoading(false);
  };

  const getMovementLocation = (move: Movement) => {
    if (move.ubicacionName) {
      return move.ubicacionName;
    }
    const product = products.find(p => p.id === move.productId || p.serie === move.productId);
    if (product && product.ubicacionId) {
      const loc = locations.find(l => l.id === product.ubicacionId);
      if (loc) {
        return `${loc.centro} (${loc.nombreCliente})`;
      }
    }
    return null;
  };

  const getBadgeStyle = (type: MovementType) => {
    switch (type) {
      case MovementType.CREATE: return 'bg-cyan-500/20 text-cyan-400';
      case MovementType.UPDATE: return 'bg-orange-500/20 text-orange-400';
      case MovementType.DELETE: return 'bg-red-500/20 text-red-400';
      default: return 'bg-white/10 text-white/50';
    }
  };

  return (
    <div className="space-y-6 py-4">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight">Historial de <span className="font-bold">Movimientos</span></h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-1">Audit Log e Informes de trazabilidad</p>
        </div>
        <button
          onClick={() => alert('Exportación a CSV no implementada en este demo.')}
          className="w-full md:w-auto bg-white text-[#0f172a] py-3 px-6 rounded-2xl hover:bg-cyan-50 transition-colors font-bold text-sm tracking-wider flex items-center justify-center gap-2"
        >
          <Download size={18} />
          Exportar CSV
        </button>
      </header>

      <div className="glass rounded-3xl overflow-hidden flex flex-col">
        <div className="p-6 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider opacity-60">
            <Filter size={16} className="opacity-50" />
            <span>Filtros</span>
          </div>
          <span className="text-[10px] font-mono opacity-40 uppercase font-bold tracking-widest">{movements.length} Registros</span>
        </div>

        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="p-12 text-center font-mono opacity-50 uppercase text-xs tracking-widest">Cargando historial...</div>
          ) : movements.length === 0 ? (
            <div className="p-12 text-center font-mono opacity-20 italic text-xs">No hay movimientos</div>
          ) : (
            movements.map((move) => (
              <div key={move.id} className="p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8 hover:bg-white/5 transition-colors group">
                <div className="md:w-40 text-[10px] font-mono opacity-40 uppercase tracking-tighter leading-tight font-semibold">
                  {move.timestamp?.toDate().toLocaleString() || 'Sincronizando...'}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-1.5">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${getBadgeStyle(move.type)}`}>
                      {move.type}
                    </span>
                    <span className="font-bold text-base tracking-tight">{move.productName}</span>
                    <span className="text-[10px] opacity-20 font-mono tracking-widest md:group-hover:opacity-100 transition-opacity whitespace-nowrap">#{move.productId?.slice(-6).toUpperCase()}</span>
                  </div>
                  <p className="text-sm opacity-50 font-medium mb-1">{move.description}</p>
                  {getMovementLocation(move) && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-cyan-400">
                      <MapPin size={10} className="text-cyan-400/80" />
                      <span className="opacity-60 uppercase text-[9px] tracking-wider font-sans">Sede / Centro:</span>
                      <span className="font-bold">{getMovementLocation(move)}</span>
                    </div>
                  )}
                </div>

                <div className="text-left md:text-right mt-2 md:mt-0">
                  <div className="flex items-center gap-3 md:justify-end">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold border border-white/10 order-2 md:order-2">
                      {move.userEmail[0].toUpperCase()}
                    </div>
                    <div className="text-left md:text-right order-1 md:order-1">
                      <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-0.5">Operador</p>
                      <p className="text-xs font-bold text-cyan-400/80">{move.userEmail.split('@')[0]}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
