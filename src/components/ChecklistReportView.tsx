import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Location, ChecklistReport, AppUser } from '../types';
import { ClipboardList, Save, History, MapPin, CheckSquare, Square, Check, User, Calendar, MessageSquare, AlertCircle, RefreshCw, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as FirebaseUser } from 'firebase/auth';

interface ChecklistReportViewProps {
  profile: AppUser | null;
  user: FirebaseUser | null;
}

export function ChecklistReportView({ profile, user }: ChecklistReportViewProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [reports, setReports] = useState<ChecklistReport[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedReplacements, setSelectedReplacements] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'nuevo' | 'historial'>('nuevo');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [cambioSensores, setCambioSensores] = useState(false);
  const [limpiezaSensores, setLimpiezaSensores] = useState(false);
  const [cambioTarjetaLora, setCambioTarjetaLora] = useState(false);
  const [cambioCableConexion, setCambioCableConexion] = useState(false);
  const [cambioPanelesSolares, setCambioPanelesSolares] = useState(false);
  const [reemplazoBateriaBoya, setReemplazoBateriaBoya] = useState(false);
  const [reemplazoBateriaAdcp, setReemplazoBateriaAdcp] = useState(false);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  // Reset selectedReplacements when selectedLocationId changes
  useEffect(() => {
    setSelectedReplacements({});
  }, [selectedLocationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const locData = await dbService.getLocations();
      setLocations(locData || []);
    } catch (err) {
      console.error("Error al cargar ubicaciones:", err);
    }

    try {
      const repData = await dbService.getChecklistReports();
      setReports(repData || []);
    } catch (err) {
      console.error("Error al cargar historial de tareas:", err);
    }

    try {
      const prodData = await dbService.getProducts();
      setProducts(prodData || []);
    } catch (err) {
      console.error("Error al cargar sensores:", err);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setSelectedLocationId('');
    setCambioSensores(false);
    setLimpiezaSensores(false);
    setCambioTarjetaLora(false);
    setCambioCableConexion(false);
    setCambioPanelesSolares(false);
    setReemplazoBateriaBoya(false);
    setReemplazoBateriaAdcp(false);
    setObservaciones('');
    setSelectedReplacements({});
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!selectedLocationId) {
      setErrorMessage('Por favor, selecciona una ubicación o boya.');
      return;
    }

    const locSelected = locations.find(l => l.id === selectedLocationId);
    if (!locSelected) {
      setErrorMessage('Ubicación inválida.');
      return;
    }

    // Must select at least one task to submit
    if (
      !cambioSensores &&
      !limpiezaSensores &&
      !cambioTarjetaLora &&
      !cambioCableConexion &&
      !cambioPanelesSolares &&
      !reemplazoBateriaBoya &&
      !reemplazoBateriaAdcp
    ) {
      setErrorMessage('Por favor, tiquee al menos una tarea realizada.');
      return;
    }

    setSubmitting(true);
    try {
      const creadorNombre = profile?.nombre || user?.displayName || user?.email || 'Técnico';
      const creadorEmail = profile?.correo || user?.email || 'tecnico@demo.com';

      let finalObservaciones = observaciones.trim();

      // Perform sensor swaps in Firestore if selected
      if (cambioSensores) {
        const swapDetails: string[] = [];
        for (const [oldSensorId, newSensorId] of Object.entries(selectedReplacements)) {
          if (newSensorId) {
            const oldProduct = products.find(p => p.id === oldSensorId);
            const newProduct = products.find(p => p.id === newSensorId);

            if (oldProduct && newProduct) {
              const originalBodegaLocId = newProduct.ubicacionId;

              // Step 1: Move old product to newProduct's Bodega location
              await dbService.updateProduct(oldProduct.id!, {
                ubicacionId: originalBodegaLocId,
              });

              // Step 2: Move new product to current location, sharing/inheriting the same depth
              await dbService.updateProduct(newProduct.id!, {
                ubicacionId: selectedLocationId,
                profundidad: oldProduct.profundidad || undefined
              });

              swapDetails.push(`Se reemplazó ${oldProduct.nombre} (S/N: ${oldProduct.serie}) por ${newProduct.nombre} (S/N: ${newProduct.serie})`);
            }
          }
        }

        if (swapDetails.length > 0) {
          const swapsText = `[Cambio de Sensores en Terreno]:\n` + swapDetails.join('\n');
          finalObservaciones = finalObservaciones
            ? `${finalObservaciones}\n\n${swapsText}`
            : swapsText;
        }
      }

      const payload = {
        ubicacionId: selectedLocationId,
        ubicacionCentro: locSelected.centro + (locSelected.acs ? ` - ${locSelected.acs}` : ''),
        ubicacionCliente: locSelected.nombreCliente,
        cambioSensores,
        limpiezaSensores,
        cambioTarjetaLora,
        cambioCableConexion,
        cambioPanelesSolares,
        reemplazoBateriaBoya,
        reemplazoBateriaAdcp,
        observaciones: finalObservaciones,
        creadoPorNombre: creadorNombre,
        creadoPorEmail: creadorEmail
      };

      await dbService.addChecklistReport(payload);
      setSuccessMessage('¡Reporte de tareas guardado con éxito!');
      resetForm();
      // Reload history list & cached products
      const updatedReports = await dbService.getChecklistReports();
      setReports(updatedReports || []);
      const updatedProducts = await dbService.getProducts();
      setProducts(updatedProducts || []);
      
      // Switch view after brief delay
      setTimeout(() => {
        setActiveTab('historial');
        setSuccessMessage('');
      }, 1500);

    } catch (err: any) {
      console.error("Error al registrar reporte de checklist:", err);
      setErrorMessage(dbService.getFriendlyErrorMessage(err) || 'Ocurrió un error al guardar el reporte.');
    } finally {
      setSubmitting(false);
    }
  };

  const tasksList = [
    { id: 'cambioSensores', checked: cambioSensores, setChecked: setCambioSensores, label: 'Cambio de sensores', desc: 'Sustitución de transductores o sensores marinos' },
    { id: 'limpiezaSensores', checked: limpiezaSensores, setChecked: setLimpiezaSensores, label: 'Limpieza de sensores', desc: 'Remoción de biofouling y sedimentos en lentes/electros' },
    { id: 'cambioTarjetaLora', checked: cambioTarjetaLora, setChecked: setCambioTarjetaLora, label: 'Cambio de tarjeta LoRa', desc: 'Reemplazo del módulo transmisor de radiofrecuencia' },
    { id: 'cambioCableConexion', checked: cambioCableConexion, setChecked: setCambioCableConexion, label: 'Cambio de cable de conexión', desc: 'Remplazo del cableado de datos o de poder' },
    { id: 'cambioPanelesSolares', checked: cambioPanelesSolares, setChecked: setCambioPanelesSolares, label: 'Cambio o modificación de paneles solares', desc: 'Ajuste estacional o sustitución de celdas fotovoltaicas' },
    { id: 'reemplazoBateriaBoya', checked: reemplazoBateriaBoya, setChecked: setReemplazoBateriaBoya, label: 'Reemplazo de batería Boya', desc: 'Instalación de batería principal recargable de la boya' },
    { id: 'reemplazoBateriaAdcp', checked: reemplazoBateriaAdcp, setChecked: setReemplazoBateriaAdcp, label: 'Reemplazo batería ADCP', desc: 'Sustitución de pack de baterías del ADCP sumergido' },
  ];

  return (
    <div className="space-y-6 py-4 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight">Reporte de <span className="font-bold">Mantenimiento</span></h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-1">Checklist de tareas en terreno</p>
        </div>
        
        {/* Tab Selector */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-full md:w-auto">
          <button
            onClick={() => { setActiveTab('nuevo'); setErrorMessage(''); }}
            className={`flex-1 md:flex-none py-2 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'nuevo' ? 'bg-white text-[#0f172a]' : 'text-white/60 hover:text-white'
            }`}
          >
            <ClipboardList size={14} />
            Nuevo Checklist
          </button>
          <button
            onClick={() => { setActiveTab('historial'); setErrorMessage(''); }}
            className={`flex-1 md:flex-none py-2 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'historial' ? 'bg-white text-[#0f172a]' : 'text-white/60 hover:text-white'
            }`}
          >
            <History size={14} />
            Historial ({reports.length})
          </button>
        </div>
      </header>

      {/* Main Container */}
      <AnimatePresence mode="wait">
        {activeTab === 'nuevo' ? (
          <motion.div
            key="new-report"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Selector de Ubicación en la parte superior, idéntico a Sensores por Boya */}
              <div className="glass p-6 md:p-8 rounded-3xl border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-white">Ubicación de la Intervención</h2>
                    <p className="text-xs text-white/50">Seleccione la Boya o Centro Marino de la base de datos para registrar las actividades.</p>
                  </div>
                </div>

                <div className="relative max-w-md group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none group-focus-within:opacity-100 group-focus-within:text-cyan-400 transition-all" size={18} />
                  <select
                    required
                    className="w-full glass bg-white/5 border-none rounded-2xl py-3.5 pl-12 pr-10 outline-none focus:ring-1 focus:ring-white/40 transition-all text-sm appearance-none cursor-pointer text-white"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                  >
                    <option value="" className="bg-[#1e293b]">-- SELECCIONE UBICACIÓN --</option>
                    {locations.map(loc => {
                      const displayAcs = loc.acs ? ` - ${loc.acs}` : '';
                      const displayClient = loc.nombreCliente ? ` (${loc.nombreCliente})` : '';
                      return (
                        <option key={loc.id} value={loc.id} className="bg-[#1e293b]">
                          {loc.centro}{displayAcs}{displayClient}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Checklist Bento Panel */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="glass p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight mb-1">Tareas Realizadas</h2>
                      <p className="text-xs text-white/50">Tiquee todas las intervenciones ejecutadas durante esta visita.</p>
                    </div>

                    <div className="space-y-3">
                      {tasksList.map((task) => (
                        <div 
                          key={task.id}
                          onClick={() => task.setChecked(!task.checked)}
                          className={`group p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-4 select-none ${
                            task.checked 
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-white shadow-[0_0_15px_rgba(34,211,238,0.05)]' 
                              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {task.checked ? (
                              <div className="w-5 h-5 rounded-lg bg-cyan-400 text-[#0f172a] flex items-center justify-center animate-bounce-short">
                                <Check size={14} strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-lg border-2 border-white/30 group-hover:border-white/60 transition-colors" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold tracking-tight">{task.label}</p>
                            <p className="text-xs opacity-50 font-normal leading-relaxed">{task.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Sensor Swap Panel */}
                  {cambioSensores && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass p-6 md:p-8 rounded-3xl border border-cyan-500/20 space-y-6 shadow-[0_0_30px_rgba(34,211,238,0.05)] bg-slate-900/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                          <Cpu size={20} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold tracking-tight text-white">Gestión de Cambio de Sensores</h2>
                          <p className="text-xs text-white/50">Lista de sensores de la ubicación actual. Puede reasignar las series usando equipos de Bodega.</p>
                        </div>
                      </div>

                      {!selectedLocationId ? (
                        <div className="p-8 bg-white/2 border border-white/5 rounded-2xl text-center text-xs text-white/40 italic">
                          ⚠️ Por favor, seleccione una ubicación arriba para desplegar sus sensores.
                        </div>
                      ) : (() => {
                        const currentLocationSensors = products.filter(p => p.ubicacionId === selectedLocationId);
                        const bodegaLocationIds = locations.filter(l => l.centro.toLowerCase().includes('bodega')).map(l => l.id);
                        const bodegaSensors = products.filter(p => p.ubicacionId && bodegaLocationIds.includes(p.ubicacionId));

                        if (currentLocationSensors.length === 0) {
                          return (
                            <div className="p-8 bg-white/2 border border-white/5 rounded-2xl text-center text-xs text-white/40 italic">
                              No hay sensores registrados ni asignados actualmente en esta ubicación.
                            </div>
                          );
                        }

                        if (bodegaSensors.length === 0) {
                          return (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 text-xs text-center font-medium">
                              ⚠️ No hay sensores disponibles con ubicación "Bodega" para realizar el cambio en esta sesión.
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4">
                            {currentLocationSensors.map((sensor) => {
                              const chosenReplacementId = selectedReplacements[sensor.id || ''] || '';
                              
                              // Offer same-name sensors first for easier tracking
                              const filteredBodegaSensors = [...bodegaSensors].sort((a, b) => {
                                const aMatches = a.nombre.toLowerCase() === sensor.nombre.toLowerCase();
                                const bMatches = b.nombre.toLowerCase() === sensor.nombre.toLowerCase();
                                if (aMatches && !bMatches) return -1;
                                if (!aMatches && bMatches) return 1;
                                return a.nombre.localeCompare(b.nombre);
                              });

                              return (
                                <div key={sensor.id} className="p-5 bg-white/2 border border-white/5 rounded-2xl hover:border-white/10 transition-all space-y-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/2 p-3 rounded-xl border border-white/5">
                                    <div>
                                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                                        {sensor.nombre}
                                      </p>
                                      <p className="text-[11px] opacity-50 mt-0.5">{sensor.marca} • {sensor.modelo}</p>
                                    </div>
                                    <div className="sm:text-right font-mono">
                                      <span className="text-[9px] opacity-40 uppercase tracking-widest block">Serie Instalada</span>
                                      <span className="text-xs font-bold text-cyan-400">{sensor.serie}</span>
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono uppercase opacity-40 tracking-widest text-white block">
                                      Intercambiar por equipo de Bodega
                                    </label>
                                    <select
                                      className="w-full bg-[#111827] border border-white/10 rounded-xl px-4 py-2.5 outline-none text-xs text-white cursor-pointer focus:border-cyan-400/50"
                                      value={chosenReplacementId}
                                      onChange={(e) => {
                                        setSelectedReplacements({
                                          ...selectedReplacements,
                                          [sensor.id || '']: e.target.value
                                        });
                                      }}
                                    >
                                      <option value="" className="bg-[#1e293b]">-- Mantener actual (S/N: {sensor.serie}) --</option>
                                      {filteredBodegaSensors.map(b => (
                                        <option key={b.id} value={b.id} className="bg-[#1e293b]">
                                          {b.nombre} [S/N: {b.serie}] ({b.marca} {b.modelo}) - en {locations.find(l => l.id === b.ubicacionId)?.centro || 'Bodega'}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                </div>

                {/* Meta information panel (Location & Comments) */}
                <div className="space-y-4">
                  <div className="glass p-6 rounded-3xl border border-white/10 space-y-6">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight mb-1">Detalles de Visita</h2>
                      <p className="text-xs text-white/50">Ubicación física y anotaciones adicionales.</p>
                    </div>

                    {/* Resumen de Ubicación Seleccionada */}
                    {selectedLocationId && (
                      <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
                        <p className="text-[9px] font-mono opacity-50 uppercase tracking-widest mb-1 flex items-center gap-1.5 text-cyan-400">
                          <MapPin size={10} />
                          Boya Seleccionada
                        </p>
                        {(() => {
                          const loc = locations.find(l => l.id === selectedLocationId);
                          return (
                            <div>
                              <p className="text-sm font-bold text-white">
                                {loc?.centro}
                                {loc?.acs ? ` - ${loc.acs}` : ''}
                              </p>
                              <p className="text-[10px] opacity-50 uppercase mt-0.5">{loc?.nombreCliente}</p>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Observaciones */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <MessageSquare size={10} />
                        Observaciones / Reporte
                      </label>
                      <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Añadir observaciones sobre el estado, sensores específicos, clima, detalles del reemplazo, etc..."
                      className="w-full h-32 bg-[#1e293b]/70 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none placeholder:opacity-30 text-white"
                    />
                  </div>

                  {/* Operador info display */}
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-1.5">
                    <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest">Registrado de forma transparente por</p>
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 flex items-center justify-center text-[10px] font-bold">
                        {(profile?.nombre?.[0] || 'T').toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold truncate leading-none">{profile?.nombre || user?.displayName || user?.email || 'Técnico'}</p>
                        <p className="text-[9px] opacity-40 font-mono truncate">{profile?.correo || user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Alerts/Status */}
                  {errorMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs flex items-start gap-2"
                    >
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold uppercase tracking-wider text-[9px] mb-0.5">Atención</p>
                        <p className="opacity-90">{errorMessage}</p>
                      </div>
                    </motion.div>
                  )}

                  {successMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs flex items-center gap-2"
                    >
                      <Check size={16} className="shrink-0 text-emerald-400" />
                      <span>{successMessage}</span>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-white text-[#0f172a] hover:bg-cyan-50 disabled:bg-white/50 py-3.5 px-6 rounded-2xl transition-all font-bold text-sm tracking-wider flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Guardar Reporte
                      </>
                    )}
                  </button>
                </div>
              </div>

              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="history-panel"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="glass rounded-3xl overflow-hidden flex flex-col border border-white/10">
              <div className="p-6 bg-white/5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-60">
                  <ClipboardList size={16} className="opacity-50" />
                  <span>Historial de Visitas</span>
                </div>
                <span className="text-[10px] font-mono opacity-40 uppercase font-bold tracking-widest">
                  {reports.length} Reporte{reports.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="divide-y divide-white/5">
                {loading ? (
                  <div className="p-12 text-center font-mono opacity-50 uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                    <RefreshCw size={14} className="animate-spin" />
                    Cargando historial de reportes...
                  </div>
                ) : reports.length === 0 ? (
                  <div className="p-12 text-center font-mono opacity-20 italic text-xs">
                    No se han registrado reportes de mantenimiento aún.
                  </div>
                ) : (
                  reports.map((rep) => {
                    // Collect active checklists
                    const completedTasks = [];
                    if (rep.cambioSensores) completedTasks.push('Cambio de Sensores');
                    if (rep.limpiezaSensores) completedTasks.push('Limpieza de Sensores');
                    if (rep.cambioTarjetaLora) completedTasks.push('Tarjeta LoRa');
                    if (rep.cambioCableConexion) completedTasks.push('Cable Conexión');
                    if (rep.cambioPanelesSolares) completedTasks.push('Paneles Solares');
                    if (rep.reemplazoBateriaBoya) completedTasks.push('Batería Boya');
                    if (rep.reemplazoBateriaAdcp) completedTasks.push('Batería ADCP');

                    return (
                      <div key={rep.id} className="p-6 flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-8 hover:bg-white/5 transition-colors group">
                        
                        {/* Timestamp */}
                        <div className="lg:w-36 text-[10px] font-mono opacity-40 uppercase tracking-tighter leading-tight font-semibold py-1">
                          {rep.createdAt?.toDate().toLocaleString() || 'Refrescando...'}
                        </div>
                        
                        {/* Main Summary */}
                        <div className="flex-1 space-y-3">
                          {/* Location details */}
                          <div className="flex flex-wrap items-center gap-1.5 md:gap-3">
                            <div className="flex items-center gap-1 text-cyan-400">
                              <MapPin size={13} strokeWidth={2} />
                              <span className="font-extrabold text-sm tracking-tight">
                                {(() => {
                                  const matchingLoc = locations.find(l => l.id === rep.ubicacionId);
                                  if (matchingLoc) {
                                    return matchingLoc.centro + (matchingLoc.acs ? ` - ${matchingLoc.acs}` : '');
                                  }
                                  return rep.ubicacionCentro;
                                })()}
                              </span>
                            </div>
                            <span className="text-[10px] opacity-40 uppercase tracking-widest font-mono">({rep.ubicacionCliente})</span>
                          </div>

                          {/* Completed Checklist Chips */}
                          <div className="flex flex-wrap gap-1.5">
                            {completedTasks.map((t, idx) => (
                              <span key={idx} className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                {t}
                              </span>
                            ))}
                          </div>

                          {/* Observations */}
                          {rep.observaciones && (
                            <p className="text-sm opacity-60 font-medium pl-3 border-l-2 border-white/10 italic leading-relaxed py-0.5">
                              "{rep.observaciones}"
                            </p>
                          )}
                        </div>

                        {/* Author info */}
                        <div className="min-w-[150px] lg:text-right mt-2 lg:mt-0 shrink-0 self-end lg:self-start">
                          <div className="flex items-center lg:justify-end gap-2.5">
                            <div className="text-left lg:text-right">
                              <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-0.5">Técnico Operador</p>
                              <p className="text-xs font-bold text-white/85 truncate max-w-[140px]" title={rep.creadoPorNombre}>
                                {rep.creadoPorNombre}
                              </p>
                              <p className="text-[9px] font-mono opacity-40 truncate max-w-[140px]" title={rep.creadoPorEmail}>
                                {rep.creadoPorEmail}
                              </p>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[11px] font-bold border border-white/10 uppercase shrink-0">
                              {rep.creadoPorNombre[0]}
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
