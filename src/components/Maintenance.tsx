import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Product, Location, ProductHealth, MovementType } from '../types';
import { 
  Wrench, 
  MapPin, 
  AlertCircle, 
  Calendar, 
  Cpu, 
  Check, 
  Settings, 
  ClipboardList, 
  Plus, 
  FileText, 
  CheckSquare, 
  Users, 
  Clock 
} from 'lucide-react';
import { CalibrationDocumentField } from './CalibrationDocumentField';
import { downloadCalibrationDocument } from '../utils/fileHelpers';
import { motion, AnimatePresence } from 'motion/react';

interface MaintenanceProps {
  isReadOnly?: boolean;
}

export function Maintenance({ isReadOnly = false }: MaintenanceProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  
  // Maintenance actions state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [newHealth, setNewHealth] = useState<ProductHealth>(ProductHealth.BUENO);
  const [newCalibrationDate, setNewCalibrationDate] = useState('');
  const [newCertUrl, setNewCertUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Checklist items
  const [checklist, setChecklist] = useState({
    limpieza: false,
    inspeccionVisual: false,
    pruebaBaterias: false,
    calibracionVerificacion: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [l, p] = await Promise.all([
        dbService.getLocations(),
        dbService.getProducts()
      ]);
      setLocations(l || []);
      setProducts(p || []);
    } catch (err) {
      console.error("Error loading maintenance data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Get current selected location detail
  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

  // Get products installed in the selected location
  const installedSensors = products.filter(p => p.ubicacionId === selectedLocationId);

  // Set default values when selecting a product to maintain
  const handleOpenMaintenance = (product: Product) => {
    setSelectedProduct(product);
    setNewHealth(product.estadoSalud || ProductHealth.BUENO);
    setNewCalibrationDate(product.fechaCalibracion || '');
    setNewCertUrl(product.documentoCalibracionUrl || '');
    setMaintenanceNotes('');
    setChecklist({
      limpieza: false,
      inspeccionVisual: false,
      pruebaBaterias: false,
      calibracionVerificacion: false,
    });
    setSuccessMessage(null);
  };

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsSubmitting(true);
    try {
      // Build details about checklist
      const completedTasks = [];
      if (checklist.limpieza) completedTasks.push('Limpieza general de Biofouling');
      if (checklist.inspeccionVisual) completedTasks.push('Inspección visual de conectores y ánodos');
      if (checklist.pruebaBaterias) completedTasks.push('Medición/Prueba de batería interna');
      if (checklist.calibracionVerificacion) completedTasks.push('Verificación/Calibración de lectura');

      const checklistStr = completedTasks.length > 0 
        ? `Actividades: [${completedTasks.join(', ')}]` 
        : '';

      const fullNotes = [
        checklistStr,
        maintenanceNotes.trim() ? `Comentarios: ${maintenanceNotes.trim()}` : ''
      ].filter(Boolean).join('. ');

      // Build object updating the product
      const updates: Partial<Product> = {
        estadoSalud: newHealth,
        fechaCalibracion: newCalibrationDate,
        documentoCalibracionUrl: newCertUrl,
        nombre: selectedProduct.nombre // Need this for logMovement in dbService
      };

      // We perform the product update which will automatically record a movement
      // To enrich the audit trail, we can append maintenance notes if any.
      await dbService.updateProduct(selectedProduct.serie, updates);

      setSuccessMessage(`¡Mantención registrada con éxito para el sensor S/N: ${selectedProduct.serie}!`);
      
      // Refresh local data
      await fetchData();

      // Close maintenance form after a short delay
      setTimeout(() => {
        setSelectedProduct(null);
        setSuccessMessage(null);
      }, 2000);

    } catch (err: any) {
      console.error("Error saving maintenance:", err);
      alert(dbService.getFriendlyErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight">Servicios de <span className="font-bold">Mantención</span></h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-1">
            Revisión técnica, calibraciones periódicas y control de sensores en terreno
          </p>
        </div>
      </header>

      {/* Main Grid: Selector & Location Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left/Selection Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[50px] -mr-12 -mt-12"></div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400">
                <Wrench size={20} />
              </div>
              <h2 className="font-bold text-base tracking-tight">Lugar de Mantención</h2>
            </div>
            
            <p className="text-xs opacity-60 mb-4 leading-relaxed">
              Seleccione el centro técnico o la boya oceanográfica donde se realizarán las tareas de mantenimiento técnico.
            </p>

            <div className="space-y-1.5 relative z-10">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Ubicación / Boya</label>
              <select
                value={selectedLocationId}
                onChange={(e) => {
                  setSelectedLocationId(e.target.value);
                  setSelectedProduct(null); // Close active form on switch
                }}
                className="w-full bg-[#1e293b]/80 border border-white/10 rounded-xl px-4 py-3 outline-none text-sm lg:text-base cursor-pointer focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-all text-white font-medium"
              >
                <option value="" className="bg-[#1e293b]">-- Seleccionar Boya o Centro --</option>
                {locations.map((loc) => {
                  const displayAcs = loc.acs ? ` - ${loc.acs}` : '';
                  const displayClient = loc.nombreCliente ? ` (${loc.nombreCliente})` : '';
                  return (
                    <option key={loc.id} value={loc.id} className="bg-[#1e293b]">
                      {loc.centro}{displayAcs}{displayClient}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Location Summary card if selected */}
          {selectedLocation && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-3xl p-6 border border-cyan-500/15"
            >
              <div className="flex items-center gap-2 text-cyan-400 mb-4">
                <MapPin size={16} />
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Detalles de Estación</span>
              </div>
              
              <h3 className="text-lg font-bold tracking-tight mb-1">
                {selectedLocation.centro}
                {selectedLocation.acs ? ` - ${selectedLocation.acs}` : ''}
              </h3>
              <p className="text-xs opacity-50 mb-4 font-mono">{selectedLocation.nombreCliente}</p>

              <div className="space-y-3 pt-4 border-t border-white/5 text-xs">
                <div className="flex justify-between">
                  <span className="opacity-50">Región:</span>
                  <span className="font-semibold text-right">{selectedLocation.region}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-50">Ciudad / Comuna:</span>
                  <span className="font-semibold text-right">{selectedLocation.ciudad}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-50">Cant. Sensores:</span>
                  <span className="font-mono font-bold text-cyan-400">{installedSensors.length} inst.</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right/Data Display Column */}
        <div className="lg:col-span-8">
          <div className="h-full">
            {!selectedLocationId ? (
              <div className="glass rounded-3xl p-12 text-center flex flex-col items-center justify-center h-full min-h-[300px]">
                <div className="p-4 bg-white/5 rounded-full mb-4 text-white/30 animate-pulse">
                  <Wrench size={32} />
                </div>
                <h3 className="text-lg font-semibold mb-1">Esperando Selección de Ubicación</h3>
                <p className="text-xs opacity-50 max-w-sm leading-relaxed">
                  Por favor, elija un centro oceanográfico o boya de la lista lateral para visualizar sus sensores instalados y agendar inspecciones.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* List of Sensors inside the selected Buoy */}
                <div className="glass rounded-3xl overflow-hidden">
                  <div className="p-6 bg-white/5 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white">Sensores Instalados</h3>
                      <p className="text-[10px] opacity-50 font-mono">Boya: {selectedLocation?.centro}</p>
                    </div>
                    <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1 rounded-full">
                      {installedSensors.length} {installedSensors.length === 1 ? 'Sensor' : 'Sensores'}
                    </span>
                  </div>

                  {loading ? (
                    <div className="p-12 text-center font-mono opacity-50 uppercase text-xs">Cargando sensores...</div>
                  ) : installedSensors.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <div className="text-xs font-mono opacity-40 italic">No hay sensores instalados asociados a esta ubicación.</div>
                      <p className="text-[11px] opacity-40 max-w-md mx-auto leading-relaxed">
                        Puedes asignar sensores a esta boya seleccionando "{selectedLocation?.centro}" como ubicación desde las pestañas de Equipos o Sensores por Boya.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {installedSensors.map((p) => {
                        const isUnderMaintenance = selectedProduct?.serie === p.serie;
                        return (
                          <div 
                            key={p.serie} 
                            className={`p-6 transition-all duration-300 flex flex-col gap-4 
                              ${isUnderMaintenance ? 'bg-cyan-500/5' : 'hover:bg-white/5'}
                            `}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-start gap-3.5">
                                <div className={`p-3 rounded-xl shrink-0 border mt-0.5
                                  ${(p.estadoSalud === ProductHealth.BUENO || !p.estadoSalud) ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' : 
                                    'bg-red-500/10 text-red-500 border-red-500/10'}
                                `}>
                                  <Cpu size={20} />
                                </div>
                                <div className="text-left">
                                  <div className="font-bold text-base tracking-tight text-white flex items-center gap-2.5 flex-wrap">
                                    <span>{p.nombre}</span>
                                    {/* Health status badge */}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-mono font-bold uppercase tracking-wider ${
                                      (p.estadoSalud === ProductHealth.BUENO || !p.estadoSalud) 
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/10' 
                                        : 'bg-red-500/20 text-red-400 border border-red-500/10'
                                    }`}>
                                      {p.estadoSalud || ProductHealth.BUENO}
                                    </span>
                                  </div>
                                  <p className="text-xs opacity-50 font-medium mt-1">
                                    Marca: <span className="text-white/80 font-bold">{p.marca}</span> • Modelo: <span className="text-white/80 font-bold">{p.modelo}</span>
                                  </p>
                                  <p className="text-[11px] font-mono text-cyan-300/80 mt-1 uppercase tracking-wider">
                                    S/N: {p.serie} {p.profundidad ? `• Profundidad: ${p.profundidad}m` : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2.5 sm:mt-0 mt-2 shrink-0">
                                {p.fechaCalibracion && (
                                  <p className="text-[10px] font-mono opacity-50 flex items-center gap-1.5 uppercase font-semibold">
                                    <Calendar size={12} className="text-cyan-400" />
                                    Calib: {p.fechaCalibracion}
                                  </p>
                                )}
                                
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                  {p.documentoCalibracionUrl && (
                                    <button
                                      onClick={() => downloadCalibrationDocument(p.documentoCalibracionUrl!, p.nombre, p.serie)}
                                      className="p-2 py-2.5 flex-1 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all font-semibold flex items-center justify-center gap-1.5 text-xs text-white"
                                      title="Descargar Certificado"
                                    >
                                      <FileText size={14} className="text-cyan-400" />
                                      <span>Certificado</span>
                                    </button>
                                  )}
                                  {!isReadOnly && (
                                    <button
                                      onClick={() => handleOpenMaintenance(p)}
                                      className={`px-4 py-2.5 flex-1 sm:flex-initial rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2
                                        ${isUnderMaintenance 
                                          ? 'bg-cyan-400 text-[#0f172a] shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                                          : 'bg-white/10 hover:bg-white/20 text-white border border-white/5'
                                        }
                                      `}
                                    >
                                      <Wrench size={13} />
                                      <span>Hacer Mantención</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Collapsible Panel for active Maintenance actions */}
                            <AnimatePresence>
                              {isUnderMaintenance && (
                                <motion.form
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  onSubmit={handleSaveMaintenance}
                                  className="mt-4 pt-6 border-t border-white/10 space-y-6 overflow-hidden text-left"
                                >
                                  {successMessage ? (
                                    <motion.div 
                                      initial={{ scale: 0.95 }}
                                      animate={{ scale: 1 }}
                                      className="bg-emerald-500/20 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-2"
                                    >
                                      <div className="w-12 h-12 bg-emerald-500/20 rounded-full mx-auto flex items-center justify-center text-emerald-400">
                                        <Check size={24} />
                                      </div>
                                      <h4 className="font-bold text-emerald-400">¡Registro Exitoso!</h4>
                                      <p className="text-xs text-emerald-300/80 leading-relaxed max-w-sm mx-auto">{successMessage}</p>
                                    </motion.div>
                                  ) : (
                                    <>
                                      {/* Section header */}
                                      <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg max-w-max">
                                        <ClipboardList size={14} className="text-cyan-400" />
                                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Formulario de Control Técnico</span>
                                      </div>

                                      {/* Grid 1: Status & Calibration Date */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        
                                        {/* Health State Selection */}
                                        <div className="space-y-1.5">
                                          <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1 text-white/50">Estado de Salud</label>
                                          <select
                                            value={newHealth}
                                            onChange={(e) => setNewHealth(e.target.value as ProductHealth)}
                                            className="w-full bg-[#111827] border border-white/10 rounded-xl px-4 py-3 outline-none text-sm font-medium text-white cursor-pointer"
                                          >
                                            <option value={ProductHealth.BUENO} className="bg-[#1e293b]">Bueno</option>
                                            <option value={ProductHealth.DEFECTUOSO} className="bg-[#1e293b]">Defectuoso</option>
                                          </select>
                                        </div>

                                        {/* Date selection */}
                                        <div className="space-y-1.5">
                                          <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Fecha de Calibración</label>
                                          <input
                                            type="date"
                                            className="w-full bg-[#111827] border border-white/10 rounded-xl px-4 py-3 outline-none [color-scheme:dark] text-sm"
                                            value={newCalibrationDate}
                                            onChange={(e) => setNewCalibrationDate(e.target.value)}
                                          />
                                        </div>

                                        {/* Cert field placeholder style */}
                                        <div className="md:col-span-1">
                                          {/* Custom document uploader */}
                                        </div>
                                      </div>

                                      {/* Checklist container */}
                                      <div className="space-y-2">
                                        <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1 block">Procedimientos de Mantenimiento</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-white/2 p-4 rounded-2xl border border-white/5">
                                          <label className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-white/2 rounded-lg transition-colors select-none text-xs">
                                            <input 
                                              type="checkbox" 
                                              checked={checklist.limpieza}
                                              onChange={(e) => setChecklist({ ...checklist, limpieza: e.target.checked })}
                                              className="w-4.5 h-4.5 rounded bg-white/5 border-white/10 text-cyan-400 focus:ring-0 focus:ring-offset-0 focus:outline-none shrink-0" 
                                            />
                                            <span className={checklist.limpieza ? 'text-white font-medium' : 'text-white/60 font-light'}>Limpieza general de Biofouling</span>
                                          </label>
                                          <label className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-white/2 rounded-lg transition-colors select-none text-xs">
                                            <input 
                                              type="checkbox" 
                                              checked={checklist.inspeccionVisual}
                                              onChange={(e) => setChecklist({ ...checklist, inspeccionVisual: e.target.checked })}
                                              className="w-4.5 h-4.5 rounded bg-white/5 border-white/10 text-cyan-400 focus:ring-0 focus:ring-offset-0 shrink-0" 
                                            />
                                            <span className={checklist.inspeccionVisual ? 'text-white font-medium' : 'text-white/60 font-light'}>Inspección visual de conectores y cables</span>
                                          </label>
                                          <label className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-white/2 rounded-lg transition-colors select-none text-xs">
                                            <input 
                                              type="checkbox" 
                                              checked={checklist.pruebaBaterias}
                                              onChange={(e) => setChecklist({ ...checklist, pruebaBaterias: e.target.checked })}
                                              className="w-4.5 h-4.5 rounded bg-white/5 border-white/10 text-cyan-400 focus:ring-0 focus:ring-offset-0 shrink-0" 
                                            />
                                            <span className={checklist.pruebaBaterias ? 'text-white font-medium' : 'text-white/60 font-light'}>Medición/Prueba de batería interna</span>
                                          </label>
                                          <label className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-white/2 rounded-lg transition-colors select-none text-xs">
                                            <input 
                                              type="checkbox" 
                                              checked={checklist.calibracionVerificacion}
                                              onChange={(e) => setChecklist({ ...checklist, calibracionVerificacion: e.target.checked })}
                                              className="w-4.5 h-4.5 rounded bg-white/5 border-white/10 text-cyan-400 focus:ring-0 focus:ring-offset-0 shrink-0" 
                                            />
                                            <span className={checklist.calibracionVerificacion ? 'text-white font-medium' : 'text-white/60 font-light'}>Verificación y calibración de software</span>
                                          </label>
                                        </div>
                                      </div>

                                      {/* Cert upload directly inside maintenance panel */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <CalibrationDocumentField
                                          value={newCertUrl}
                                          onChange={(val) => setNewCertUrl(val)}
                                          productName={p.nombre}
                                          serie={p.serie}
                                        />
                                        
                                        {/* Extra field: Freeform service notes */}
                                        <div className="space-y-1.5">
                                          <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1 block">Comentarios / Observaciones</label>
                                          <textarea
                                            placeholder="Detalle de trabajos adicionales efectuados o piezas reemplazadas..."
                                            rows={4}
                                            className="w-full bg-[#111827] border border-white/10 rounded-xl px-4 py-3 outline-none text-sm text-white resize-none"
                                            value={maintenanceNotes}
                                            onChange={(e) => setMaintenanceNotes(e.target.value)}
                                          />
                                        </div>
                                      </div>

                                      {/* Action buttons */}
                                      <div className="flex flex-col sm:flex-row justify-end gap-3.5 pt-4">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedProduct(null)}
                                          className="py-3 px-6 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors order-2 sm:order-1 text-center"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          type="submit"
                                          disabled={isSubmitting}
                                          className="py-3 px-6 bg-cyan-400 text-[#0f172a] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-cyan-300 transition-colors order-1 sm:order-2 flex items-center justify-center gap-2"
                                        >
                                          {isSubmitting ? (
                                            <>
                                              <div className="w-4 h-4 border-2 border-[#0f172a] border-t-transparent rounded-full animate-spin"></div>
                                              <span>Guardando...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Check size={14} />
                                              <span>Finalizar Mantención</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </motion.form>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
