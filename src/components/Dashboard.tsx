import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Product, Location, Movement, ProductStatus } from '../types';
import { Package, MapPin, Activity, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export function Dashboard({ onNavigate }: { onNavigate: (view: any) => void }) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    badCondition: 0,
    totalLocations: 0,
    recentMovements: [] as Movement[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const [products, locations, movements] = await Promise.all([
        dbService.getProducts(),
        dbService.getLocations(),
        dbService.getMovements()
      ]);

      setStats({
        totalProducts: products?.length || 0,
        badCondition: products?.filter(p => p.estado === ProductStatus.MALO).length || 0,
        totalLocations: locations?.length || 0,
        recentMovements: (movements || []).slice(0, 5)
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div className="py-12 text-center font-mono opacity-50 uppercase text-xs">Calculando métricas...</div>;

  return (
    <div className="space-y-8 py-4">
      <header className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Estado del <span className="font-bold">Sistema</span></h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-1">Resumen General de Inventario</p>
        </div>
        <div className="flex gap-3">
          <div className="glass px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold">{stats.totalProducts} Items Total</div>
          <div className="glass px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold text-cyan-400">{stats.badCondition} Críticos</div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Equipos" 
          value={stats.totalProducts} 
          icon={<Package size={20} />} 
          onClick={() => onNavigate('inventory')}
        />
        <StatCard 
          label="Estado Crítico" 
          value={stats.badCondition} 
          icon={<AlertCircle size={20} />} 
          critical
          onClick={() => onNavigate('inventory')}
        />
        <StatCard 
          label="Ubicaciones" 
          value={stats.totalLocations} 
          icon={<MapPin size={20} />} 
          onClick={() => onNavigate('locations')}
        />
        <StatCard 
          label="Actividad" 
          value={stats.recentMovements.length} 
          icon={<Activity size={20} />} 
          onClick={() => onNavigate('reports')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold uppercase opacity-60 tracking-wider">Últimos Movimientos</h3>
            <button onClick={() => onNavigate('reports')} className="text-[10px] font-mono uppercase bg-white/10 px-3 py-1 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1"> Ver todo <ArrowRight size={10} /> </button>
          </div>
          <div className="glass rounded-3xl overflow-hidden divide-y divide-white/5">
            {stats.recentMovements.length === 0 ? (
              <div className="p-8 text-center opacity-30 italic text-xs">Sin actividad reciente</div>
            ) : (
              stats.recentMovements.map(m => (
                <div key={m.id} className="p-4 flex justify-between items-center bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex gap-4 items-center">
                    <div className={`p-2 rounded-xl ${m.type === 'create' ? 'bg-cyan-500/20 text-cyan-400' : m.type === 'update' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>
                      <Activity size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{m.productName}</p>
                      <p className="text-[10px] opacity-50 uppercase font-mono tracking-tight">{m.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono opacity-40 uppercase">{m.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-semibold uppercase opacity-60 tracking-wider">Atajos rápidos</h3>
          <div className="space-y-4">
            <QuickAction 
              label="Registrar Equipo" 
              desc="Ingreso manual de nueva serie" 
              onClick={() => onNavigate('inventory')}
            />
            <QuickAction 
              label="Nueva Ubicación" 
              desc="Configurar cliente o sede" 
              onClick={() => onNavigate('locations')}
            />
            <div className="p-6 glass-dark border border-white/10 rounded-3xl space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Package size={80} />
              </div>
              <p className="text-lg font-light leading-snug relative z-10">"El control preciso es la base de la <span className="font-bold text-cyan-400">calidad</span>."</p>
              <p className="text-[10px] font-mono opacity-40 uppercase relative z-10">— Manual de Operaciones</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, critical, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`glass rounded-3xl p-6 text-left hover:bg-white/20 transition-all group relative overflow-hidden`}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-20 -mr-8 -mt-8 ${critical ? 'bg-red-500' : 'bg-cyan-500'}`}></div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-white/20 transition-colors">
          {icon}
        </div>
        <span className={`text-4xl font-light tracking-tighter ${critical ? 'text-red-400' : 'text-white'}`}>{value}</span>
      </div>
      <p className="text-[10px] font-mono uppercase tracking-widest opacity-50 relative z-10">{label}</p>
    </button>
  );
}

function QuickAction({ label, desc, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full glass rounded-2xl p-5 text-left hover:bg-white/20 transition-colors group flex justify-between items-center"
    >
      <div>
        <p className="font-bold text-sm mb-0.5">{label}</p>
        <p className="text-[10px] font-mono opacity-50 uppercase tracking-tighter">{desc}</p>
      </div>
      <ArrowRight size={16} className="opacity-30 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
