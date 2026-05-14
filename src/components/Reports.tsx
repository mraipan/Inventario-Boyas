import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Movement, MovementType } from '../types';
import { History, Download, FileText, Filter } from 'lucide-react';
import { motion } from 'motion/react';

export function Reports() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const data = await dbService.getMovements();
    setMovements(data || []);
    setLoading(false);
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
      <header className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Historial de <span className="font-bold">Movimientos</span></h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-1">Audit Log e Informes de trazabilidad</p>
        </div>
        <button
          onClick={() => alert('Exportación a CSV no implementada en este demo.')}
          className="bg-white text-[#0f172a] py-3 px-6 rounded-2xl hover:bg-cyan-50 transition-colors font-bold text-sm tracking-wider flex items-center gap-2"
        >
          <Download size={18} />
          Exportar CSV
        </button>
      </header>

      <div className="glass rounded-3xl overflow-hidden flex flex-col">
        <div className="p-6 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider opacity-60">
            <Filter size={16} className="opacity-50" />
            <span>Filtros de auditoría</span>
          </div>
          <span className="text-[10px] font-mono opacity-40 uppercase font-bold tracking-widest">{movements.length} Registros totales</span>
        </div>

        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="p-12 text-center font-mono opacity-50 uppercase text-xs tracking-widest">Cargando historial...</div>
          ) : movements.length === 0 ? (
            <div className="p-12 text-center font-mono opacity-20 italic text-xs">No hay movimientos registrados</div>
          ) : (
            movements.map((move) => (
              <div key={move.id} className="p-6 flex items-center gap-8 hover:bg-white/5 transition-colors group">
                <div className="w-40 text-[10px] font-mono opacity-40 uppercase tracking-tighter leading-tight font-semibold">
                  {move.timestamp?.toDate().toLocaleString() || 'Sincronizando...'}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-1.5">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${getBadgeStyle(move.type)}`}>
                      {move.type}
                    </span>
                    <span className="font-bold text-base tracking-tight">{move.productName}</span>
                    <span className="text-[10px] opacity-20 font-mono tracking-widest group-hover:opacity-100 transition-opacity">#{move.productId?.slice(-6).toUpperCase()}</span>
                  </div>
                  <p className="text-sm opacity-50 font-medium">{move.description}</p>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-3 justify-end">
                    <div className="text-right">
                      <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-0.5">Operador</p>
                      <p className="text-xs font-bold text-cyan-400/80">{move.userEmail.split('@')[0]}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold border border-white/10">
                      {move.userEmail[0].toUpperCase()}
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
