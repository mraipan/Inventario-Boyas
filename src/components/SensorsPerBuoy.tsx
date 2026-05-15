import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { Product, Location, ProductStatus } from '../types';
import { Plus, Search, Pencil, Trash2, Cpu, AlertCircle, MapPin, Download, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

export function SensorsPerBuoy() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, l] = await Promise.all([
        dbService.getProducts(),
        dbService.getLocations()
      ]);
      setProducts(p || []);
      setLocations(l || []);
    } catch (error) {
      console.error("Error loading sensors data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error("No se pudo leer el archivo");
        
        const workbook = XLSX.read(data, { 
          type: typeof data === 'string' ? 'string' : 'array',
          cellDates: true,
          cellNF: false,
          cellText: false
        });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        let json = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];

        if (json.length === 0) {
          alert("El archivo CSV no contiene datos.");
          return;
        }

        // Delimiter detection fallback
        const firstRow = json[0];
        const firstRowKeys = Object.keys(firstRow);
        if (firstRowKeys.length === 1 && (firstRowKeys[0].includes(",") || firstRowKeys[0].includes(";"))) {
          const delimiter = firstRowKeys[0].includes(";") ? ";" : ",";
          const csvText = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
          const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
          const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ""));
          json = lines.slice(1).map(line => {
            const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ""));
            const obj: any = {};
            headers.forEach((h, i) => {
              obj[h] = values[i] || "";
            });
            return obj;
          });
        }

        const productsToImportRaw = json.map((row, index) => {
          const normalize = (s: string) => 
            String(s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

          const getValue = (keys: string[]) => {
            const rowKeys = Object.keys(row);
            const normalizedTargetKeys = keys.map(normalize);
            const foundKey = rowKeys.find(rk => normalizedTargetKeys.includes(normalize(rk)));
            return foundKey ? row[foundKey] : null;
          };

          const rowUbicacion = getValue(["Ubicacion", "Ubicación", "Centro", "Lugar", "Boya"]);
          const rowCliente = getValue(["Cliente", "Empresa", "Nombre Cliente"]);
          const rowNombre = getValue(["Nombre", "Producto", "Equipo", "Sensor"]);
          const rowMarca = getValue(["Marca", "Fabricante"]);
          const rowModelo = getValue(["Modelo"]);
          const rowSerie = getValue(["Serie", "S/N", "Serial", "N/S"]);
          const rowEstado = getValue(["Estado", "Condicion"]);
          const rowFecha = getValue(["Fecha de Calibración", "Fecha Calibración", "Calibracion"]);

          const cleanUbicacion = String(rowUbicacion || "").toLowerCase().trim();
          const cleanCliente = String(rowCliente || "").toLowerCase().trim();

          const location = locations.find(l => 
            l.centro.toLowerCase().trim() === cleanUbicacion &&
            (!cleanCliente || l.nombreCliente.toLowerCase().trim() === cleanCliente)
          ) || locations.find(l => 
            l.centro.toLowerCase().trim() === cleanUbicacion
          );

          let finalEstado = ProductStatus.BUENO;
          const statusStr = String(rowEstado || "").toLowerCase().trim();
          if (statusStr.includes("malo") || statusStr.includes("baja") || statusStr.includes("dañado")) {
            finalEstado = ProductStatus.MALO;
          }

          return {
            nombre: String(rowNombre || row["Nombre"] || row["nombre"] || `Sensor ${index + 1}`),
            marca: String(rowMarca || row["Marca"] || 'N/A'),
            modelo: String(rowModelo || row["Modelo"] || 'N/A'),
            serie: String(rowSerie || row["Serie"] || `SN-${index + 1}`).trim(),
            estado: finalEstado,
            ubicacionId: location?.id || '',
            fechaCalibracion: rowFecha ? String(rowFecha) : '',
            documentoCalibracionUrl: String(getValue(["Documento URL", "Documento", "URL", "Link", "Certificado"]) || '')
          };
        });

        // Validation Logic
        const existingSeries = new Set(products.map(p => p.serie.toLowerCase().trim()));
        const uniqueInFile = new Map<string, any>();
        const duplicatesInFile: string[] = [];
        const alreadyExists: string[] = [];

        productsToImportRaw.forEach(product => {
          const serieKey = product.serie.toLowerCase().trim();
          if (existingSeries.has(serieKey)) {
            alreadyExists.push(product.serie);
          } else if (uniqueInFile.has(serieKey)) {
            duplicatesInFile.push(product.serie);
          } else {
            uniqueInFile.set(serieKey, product);
          }
        });

        const finalProductsToImport = Array.from(uniqueInFile.values());

        if (finalProductsToImport.length === 0) {
          let msg = "No se encontraron sensores nuevos para importar.\n\n";
          if (alreadyExists.length > 0) msg += `- ${alreadyExists.length} registros ya existen.\n`;
          if (duplicatesInFile.length > 0) msg += `- ${duplicatesInFile.length} registros duplicados en el archivo.\n`;
          alert(msg);
          return;
        }

        let confirmMsg = `Se detectaron ${finalProductsToImport.length} sensores nuevos.\n\n`;
        if (alreadyExists.length > 0) confirmMsg += `⚠️ Omitiendo ${alreadyExists.length} existentes.\n`;
        if (duplicatesInFile.length > 0) confirmMsg += `⚠️ Omitiendo ${duplicatesInFile.length} duplicados en el archivo.\n`;
        confirmMsg += `\n¿Proceder con la importación?`;

        const confirmImport = confirm(confirmMsg);
        if (!confirmImport) return;

        setLoading(true);
        await dbService.batchImportProducts(finalProductsToImport);
        await fetchData();
        alert(`¡Éxito! Se han importado ${finalProductsToImport.length} sensores nuevos.`);
      } catch (error: any) {
        console.error("CSV Import Error:", error);
        alert(`Error al procesar el archivo: ${error.message}`);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const exportToExcel = () => {
    const headers = ["Boya", "Sensor", "Marca", "Modelo", "Serie", "Estado", "Última Calibración"];
    const data = groupedProducts.flatMap(({ location, products }) => 
      products.map(p => ({
        "Boya": location.centro,
        "Sensor": p.nombre,
        "Marca": p.marca,
        "Modelo": p.modelo,
        "Serie": p.serie,
        "Estado": p.estado,
        "Última Calibración": p.fechaCalibracion || 'N/A'
      }))
    );

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sensores por Boya");
    
    worksheet["!cols"] = headers.map(() => ({ wch: 20 }));

    XLSX.writeFile(workbook, `sensores_por_boya_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (confirm(`¿Está seguro de eliminar el sensor ${nombre}?`)) {
      await dbService.deleteProduct(id, nombre);
      fetchData();
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.serie.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.marca.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = selectedLocationId === 'all' || p.ubicacionId === selectedLocationId;
    
    return matchesSearch && matchesLocation;
  });

  const groupedProducts = locations.reduce((acc, loc) => {
    if (selectedLocationId !== 'all' && loc.id !== selectedLocationId) return acc;
    
    const locProducts = filteredProducts.filter(p => p.ubicacionId === loc.id);
    if (locProducts.length > 0) {
      acc.push({ location: loc, products: locProducts });
    }
    return acc;
  }, [] as { location: Location; products: Product[] }[]);

  // Add a category for unassigned sensors if any
  const unassigned = filteredProducts.filter(p => (!p.ubicacionId || !locations.find(l => l.id === p.ubicacionId)) && (selectedLocationId === 'all' || selectedLocationId === 'unassigned'));
  if (unassigned.length > 0) {
    const unassignedLoc: Location = { 
      id: 'unassigned', 
      centro: 'Sin Asignar', 
      nombreCliente: 'Equipos Libres', 
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
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-1">Sectores y Unidades Operativas</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportCSV} 
            accept=".csv" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 md:flex-none glass bg-white/5 text-white py-3 px-4 rounded-2xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2 border border-white/5"
            title="Importar CSV"
          >
            <Upload size={18} className="opacity-70" />
            <span className="md:hidden lg:inline text-xs font-bold uppercase tracking-wider">Importar</span>
          </button>
          <button
            onClick={exportToExcel}
            className="flex-1 md:flex-none glass bg-white/5 text-white py-3 px-4 rounded-2xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2 border border-white/5"
            title="Exportar a Excel"
          >
            <Download size={18} className="opacity-70" />
            <span className="md:hidden lg:inline text-xs font-bold uppercase tracking-wider">Exportar</span>
          </button>
          <button
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="flex-1 md:flex-none bg-white text-[#0f172a] py-3 px-6 rounded-2xl hover:bg-cyan-50 transition-colors font-bold text-sm tracking-wider flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Nuevo Sensor
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-[2] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 group-focus-within:text-cyan-400 transition-all" size={18} />
          <input
            type="text"
            placeholder="Buscar sensor por nombre, serie o marca..."
            className="w-full glass bg-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-white/40 transition-all placeholder:text-white/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative flex-1 group">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none group-focus-within:opacity-100" size={18} />
          <select
            className="w-full glass bg-white/5 border-none rounded-2xl py-3 pl-12 pr-10 outline-none focus:ring-1 focus:ring-white/40 transition-all text-sm appearance-none cursor-pointer"
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
          >
            <option value="all" className="bg-[#1e293b]">Todas las Ubicaciones</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id} className="bg-[#1e293b]">
                {loc.centro}
              </option>
            ))}
            {unassigned.length > 0 && <option value="unassigned" className="bg-[#1e293b]">Sin Asignar</option>}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      <div className="space-y-12 pb-12">
        {loading ? (
          <div className="p-12 text-center font-mono opacity-50 uppercase text-xs">Cargando sensores...</div>
        ) : groupedProducts.length === 0 ? (
          <div className="p-12 text-center font-mono opacity-30 italic text-xs">No se encontraron sensores en esta vista</div>
        ) : (
          groupedProducts.map(({ location, products }) => (
            <section key={location.id} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                    <Cpu size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">{location.centro}</h2>
                    <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">{location.nombreCliente}</p>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] font-mono opacity-30 uppercase tracking-widest leading-none mb-1">Total Sensores</div>
                  <div className="text-xl font-bold text-white/80">{products.length}</div>
                </div>
              </div>

              <div className="glass rounded-3xl overflow-hidden border border-white/5">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="text-white/40 border-b border-white/10 bg-white/2">
                      <tr>
                        <th className="p-4 pl-6 font-medium text-[10px] uppercase tracking-widest">Sensor</th>
                        <th className="p-4 font-medium text-[10px] uppercase tracking-widest text-center">Serie</th>
                        <th className="p-4 font-medium text-[10px] uppercase tracking-widest text-center">Estado</th>
                        <th className="p-4 font-medium text-[10px] uppercase tracking-widest">Últ. Calib.</th>
                        <th className="p-4 pr-6 font-medium text-[10px] uppercase tracking-widest text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-white/5">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-white/5 group transition-colors">
                          <td className="p-4 pl-6">
                            <div className="font-semibold text-white/90">{p.nombre}</div>
                            <div className="text-[10px] opacity-40">{p.marca} • {p.modelo}</div>
                          </td>
                          <td className="p-4 text-center font-mono text-cyan-400 font-bold tracking-tight">
                            {p.serie}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                                p.estado === ProductStatus.BUENO 
                                  ? 'bg-emerald-500/20 text-emerald-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {p.estado}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-xs font-mono opacity-60">{p.fechaCalibracion || 'N/A'}</div>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <div className="flex justify-end gap-1 opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}
                                className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
                                title="Editar"
                              >
                                <Pencil size={14} />
                              </button>
                              <button 
                                onClick={() => handleDelete(p.id!, p.nombre)}
                                className="p-2 hover:bg-red-500/20 rounded-lg text-white/40 hover:text-red-400 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            {/* Mobile actions always visible or different */}
                            <div className="lg:hidden flex justify-end gap-2">
                              <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="text-white/40">
                                <Pencil size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ))
        )}
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

// Reuse/Copy ProductModal logic for consistency
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
      alert("Error al guardar el sensor. Revise si la serie ya existe.");
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
        className="glass rounded-[2rem] lg:rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-full lg:h-auto lg:max-h-[90vh]"
      >
        <div className="bg-white/5 border-b border-white/10 px-6 py-4 lg:p-6 flex justify-between items-center">
          <h3 className="text-xl font-light tracking-tight">{editingProduct ? 'Editar' : 'Registrar'} <span className="font-bold">Sensor</span></h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-xl">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Nombre del Sensor</label>
              <input
                required
                type="text"
                placeholder="Ej: ADCP, Oxígeno..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-white/40 transition-all text-sm lg:text-base"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">N° Serie</label>
              <input
                required
                disabled={!!editingProduct}
                type="text"
                placeholder="SN-0000"
                className="w-full bg-white/5 border border-white/20 text-cyan-300 font-mono rounded-xl px-4 py-3 outline-none disabled:opacity-50 text-sm lg:text-base"
                value={formData.serie}
                onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Marca</label>
              <input
                required
                type="text"
                placeholder="Fabricante"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none text-sm lg:text-base"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Modelo</label>
              <input
                required
                type="text"
                placeholder="Modelo específico"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none text-sm lg:text-base"
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Estado</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none appearance-none text-sm lg:text-base"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value as ProductStatus })}
              >
                <option value={ProductStatus.BUENO} className="bg-[#1e293b]">Bueno</option>
                <option value={ProductStatus.MALO} className="bg-[#1e293b]">Malo</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Boya Asignada</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none appearance-none text-sm lg:text-base"
                value={formData.ubicacionId}
                onChange={(e) => setFormData({ ...formData, ubicacionId: e.target.value })}
              >
                <option value="" className="bg-[#1e293b]">Sin asignar (Libre)</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id} className="bg-[#1e293b]">{l.centro}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Fecha Calibración</label>
              <input
                type="date"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none [color-scheme:dark] text-sm lg:text-base"
                value={formData.fechaCalibracion}
                onChange={(e) => setFormData({ ...formData, fechaCalibracion: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Certificado URL</label>
              <input
                type="url"
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none text-sm lg:text-base"
                value={formData.documentoCalibracionUrl}
                onChange={(e) => setFormData({ ...formData, documentoCalibracionUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="pb-6 lg:pb-0 pt-4 flex flex-col md:flex-row gap-4">
            <button
              type="button"
              onClick={onClose}
              className="order-2 md:order-1 flex-1 py-4 bg-white/10 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={isSubmitting}
              type="submit"
              className="order-1 md:order-2 flex-1 py-4 bg-white text-[#0f172a] rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-cyan-50 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'GUARDANDO...' : editingProduct ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
