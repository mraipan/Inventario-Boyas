import React, { useState, useEffect } from 'react';
import { AutocompleteInput } from './AutocompleteInput';
import { dbService } from '../services/dbService';
import { Product, Location, ProductStatus } from '../types';
import { Plus, Search, Filter, Pencil, Trash2, Download, Upload, AlertCircle, FileText } from 'lucide-react';
import { CalibrationDocumentField } from './CalibrationDocumentField';
import { downloadCalibrationDocument } from '../utils/fileHelpers';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

export function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error("No se pudo leer el archivo");
        
        // Use XLSX to parse the content
        // If it's a CSV, we can also try to detect semicolons manually if xlsx fails
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

        // DELIMITER FALLBACK: If only one key exists and it contains commas or semicolons, 
        // it means xlsx failed to detect the delimiter
        const firstRow = json[0];
        const firstRowKeys = Object.keys(firstRow);
        if (firstRowKeys.length === 1 && (firstRowKeys[0].includes(",") || firstRowKeys[0].includes(";"))) {
          console.log("Detectado error de delimitador. Intentando parse manual...");
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

        console.log("Datos CSV procesados:", json[0]);

        const productsToImportRaw = json.map((row, index) => {
          // Normalize string for comparison (remove accents, lowercase, trim)
          const normalize = (s: string) => 
            String(s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

          const getValue = (keys: string[]) => {
            const rowKeys = Object.keys(row);
            const normalizedTargetKeys = keys.map(normalize);
            const foundKey = rowKeys.find(rk => normalizedTargetKeys.includes(normalize(rk)));
            return foundKey ? row[foundKey] : null;
          };

          const rowUbicacion = getValue(["Ubicacion", "Ubicación", "Centro", "Lugar", "Ubicacion Equipos", "Ubic"]);
          const rowCliente = getValue(["Cliente", "Empresa", "Nombre Cliente", "Nombre de Cliente"]);
          const rowNombre = getValue(["Nombre", "Producto", "Equipo", "Instrumento", "Item"]);
          const rowMarca = getValue(["Marca", "Fabricante", "Brand"]);
          const rowModelo = getValue(["Modelo", "Model"]);
          const rowSerie = getValue(["Serie", "S/N", "Serial", "N/S", "Numero de Serie"]);
          const rowEstado = getValue(["Estado", "Condicion", "Status"]);
          const rowFecha = getValue(["Fecha de Calibración", "Fecha Calibración", "Calibracion", "Fecha", "Fecha Calib"]);

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
          if (statusStr.includes("malo") || statusStr.includes("baja") || statusStr.includes("dañado") || statusStr.includes("reparacion")) {
            finalEstado = ProductStatus.MALO;
          }

          return {
            nombre: String(rowNombre || row["Nombre"] || row["nombre"] || `Equipo ${index + 1}`),
            marca: String(rowMarca || row["Marca"] || row["marca"] || 'N/A'),
            modelo: String(rowModelo || row["Modelo"] || row["modelo"] || 'N/A'),
            serie: String(rowSerie || row["Serie"] || row["serie"] || `SN-${index + 1}`).trim(),
            estado: finalEstado,
            ubicacionId: location?.id || '',
            fechaCalibracion: rowFecha ? String(rowFecha) : '',
            documentoCalibracionUrl: String(getValue(["Documento URL", "Documento", "URL", "Link", "Certificado"]) || '')
          };
        });

        // VALIDATION LOGIC: Check for duplicates and existing series
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
          let msg = "No se encontraron registros nuevos para importar.\n\n";
          if (alreadyExists.length > 0) msg += `- ${alreadyExists.length} registros ya existen en el sistema.\n`;
          if (duplicatesInFile.length > 0) msg += `- ${duplicatesInFile.length} registros están duplicados en el archivo.\n`;
          alert(msg);
          return;
        }

        let confirmMsg = `Se detectaron ${finalProductsToImport.length} registros nuevos.\n\n`;
        if (alreadyExists.length > 0) confirmMsg += `⚠️ Se omitirán ${alreadyExists.length} registros que ya existen.\n`;
        if (duplicatesInFile.length > 0) confirmMsg += `⚠️ Se omitirán ${duplicatesInFile.length} duplicados en el mismo archivo.\n`;
        confirmMsg += `\n¿Desea proceder con la importación?`;

        const confirmImport = confirm(confirmMsg);
        if (!confirmImport) return;

        setLoading(true);
        await dbService.batchImportProducts(finalProductsToImport);
        await fetchData();
        alert(`¡Éxito! Se han importado ${finalProductsToImport.length} registros nuevos.`);
      } catch (error: any) {
        console.error("Critical CSV Import Error:", error);
        alert(`Error al procesar el archivo: ${error.message || 'Error desconocido'}`);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = (error) => {
      console.error("FileReader Error:", error);
      alert("Error al leer el archivo físico.");
      setLoading(false);
    };

    // Use readAsText for better CSV recognition (handling common delimiters)
    reader.readAsText(file);
  };

  const exportToExcel = () => {
    const headers = ["Nombre", "Marca", "Modelo", "Serie", "Estado", "Ubicación", "Cliente", "Fecha de Calibración"];
    const data = products.map(p => {
      const location = locations.find(l => l.id === p.ubicacionId);
      return {
        "Nombre": p.nombre,
        "Marca": p.marca,
        "Modelo": p.modelo,
        "Serie": p.serie,
        "Estado": p.estado,
        "Ubicación": location?.centro || 'N/A',
        "Cliente": location?.nombreCliente || 'N/A',
        "Fecha de Calibración": p.fechaCalibracion || 'N/A'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
    
    // Auto-size columns (basic approach)
    const maxWidth = headers.reduce((w, r) => Math.max(w, r.length), 10);
    worksheet["!cols"] = headers.map(() => ({ wch: maxWidth + 5 }));

    XLSX.writeFile(workbook, `inventario_sensores_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight">Inventario de <span className="font-bold">Boyas</span></h1>
          <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-1">Control de Equipos y Calibraciones</p>
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
            className="flex-[2] md:flex-none bg-white text-[#0f172a] py-3 px-6 rounded-2xl hover:bg-cyan-50 transition-colors font-bold text-sm tracking-wider flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Nuevo Registro
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
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
                      <div className="text-xs opacity-50 flex items-center gap-2 flex-wrap">
                        <span>{p.marca} • {p.modelo}</span>
                        {p.fechaCalibracion && (
                          <span className="opacity-60">• Calib: {p.fechaCalibracion}</span>
                        )}
                        {p.documentoCalibracionUrl && (
                          <button
                            onClick={() => downloadCalibrationDocument(p.documentoCalibracionUrl!, p.nombre, p.serie)}
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors ml-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 px-2 py-0.5 rounded-lg font-mono uppercase tracking-wider"
                            title="Ver Documento de Calibración"
                          >
                            <FileText size={11} />
                            <span>Doc</span>
                          </button>
                        )}
                      </div>
                      {p.estado === ProductStatus.INSTALADO && p.profundidad && (
                        <div className="text-[10px] text-cyan-400 font-bold mt-1 uppercase tracking-widest">Profundidad: {p.profundidad}m</div>
                      )}
                    </td>
                    <td className="p-6 text-center font-mono text-cyan-400 font-bold tracking-tight">
                      {p.serie}
                    </td>
                    <td className="p-6 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        p.estado === ProductStatus.BUENO 
                          ? 'bg-green-500/20 text-green-400' 
                          : p.estado === ProductStatus.INSTALADO
                          ? 'bg-cyan-500/20 text-cyan-400'
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
                      <div className="flex justify-end gap-1 md:gap-3 lg:translate-x-2 lg:opacity-0 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 transition-all">
                        <button 
                          onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}
                          className="p-2 md:p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id!, p.nombre)}
                          className="p-2 md:p-2 hover:bg-red-500/20 rounded-xl text-white/40 hover:text-red-400 transition-colors"
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
            products={products}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductModal({ onClose, onSave, editingProduct, locations, products = [] }: { onClose: () => void; onSave: () => void, editingProduct: Product | null, locations: Location[], products?: Product[] }) {
  const [formData, setFormData] = useState<Partial<Product>>(
    editingProduct || {
      nombre: '',
      marca: '',
      modelo: '',
      serie: '',
      estado: ProductStatus.BUENO,
      profundidad: undefined,
      ubicacionId: '',
      fechaCalibracion: '',
      documentoCalibracionUrl: ''
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autocomplete options for predictive text from database only
  const suggestedNombres = Array.from(new Set(
    products.map(p => p.nombre).filter(Boolean)
  ));

  const suggestedMarcas = Array.from(new Set(
    products.map(p => p.marca).filter(Boolean)
  ));

  const suggestedModelos = Array.from(new Set(
    products.map(p => p.modelo).filter(Boolean)
  ));

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
    } catch (error: any) {
      alert("Error al guardar el producto: " + dbService.getFriendlyErrorMessage(error));
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
          <h3 className="text-xl font-light tracking-tight">{editingProduct ? 'Editar' : 'Registrar'} <span className="font-bold">Equipo</span></h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-xl">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Nombre del Producto</label>
              <AutocompleteInput
                required
                placeholder="Ej: Multímetro Digital"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none text-white text-sm lg:text-base"
                value={formData.nombre || ''}
                onChange={(val) => setFormData({ ...formData, nombre: val })}
                suggestions={suggestedNombres}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">N° Serie (Único)</label>
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
              <AutocompleteInput
                required
                placeholder="Fluke, Tektronix..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none text-white text-sm lg:text-base"
                value={formData.marca || ''}
                onChange={(val) => setFormData({ ...formData, marca: val })}
                suggestions={suggestedMarcas}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Modelo</label>
              <AutocompleteInput
                required
                placeholder="Ej: Model 87V"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none text-white text-sm lg:text-base"
                value={formData.modelo || ''}
                onChange={(val) => setFormData({ ...formData, modelo: val })}
                suggestions={suggestedModelos}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Estado Físico</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none appearance-none text-sm lg:text-base"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value as ProductStatus })}
              >
                <option value={ProductStatus.BUENO} className="bg-[#1e293b]">Bueno</option>
                <option value={ProductStatus.MALO} className="bg-[#1e293b]">Malo</option>
                <option value={ProductStatus.INSTALADO} className="bg-[#1e293b]">Instalado</option>
              </select>
            </div>
            {formData.estado === ProductStatus.INSTALADO ? (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Profundidad (m)</label>
                <select
                  required
                  className="w-full bg-white/5 border border-white/20 text-cyan-300 font-bold rounded-xl px-4 py-3 outline-none appearance-none text-sm lg:text-base"
                  value={formData.profundidad}
                  onChange={(e) => setFormData({ ...formData, profundidad: Number(e.target.value) })}
                >
                  <option value="" className="bg-[#1e293b]">Seleccionar Profundidad...</option>
                  {[0, 5, 10, 30, 50, 60].map(d => (
                    <option key={d} value={d} className="bg-[#1e293b]">{d} metros</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Ubicación Asignada</label>
                <select
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none appearance-none text-sm lg:text-base"
                  value={formData.ubicacionId}
                  onChange={(e) => setFormData({ ...formData, ubicacionId: e.target.value })}
                >
                  <option value="" className="bg-[#1e293b]">Seleccionar...</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id} className="bg-[#1e293b]">{l.centro} ({l.region})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {formData.estado === ProductStatus.INSTALADO && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Ubicación de Instalación</label>
              <select
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none appearance-none text-sm lg:text-base"
                value={formData.ubicacionId}
                onChange={(e) => setFormData({ ...formData, ubicacionId: e.target.value })}
              >
                <option value="" className="bg-[#1e293b]">Seleccionar Boya/Sede...</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id} className="bg-[#1e293b]">{l.centro} ({l.region})</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1">Fecha de Calibración</label>
              <input
                type="date"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none [color-scheme:dark] text-sm lg:text-base"
                value={formData.fechaCalibracion}
                onChange={(e) => setFormData({ ...formData, fechaCalibracion: e.target.value })}
              />
            </div>
            <CalibrationDocumentField
              value={formData.documentoCalibracionUrl || ''}
              onChange={(val) => setFormData({ ...formData, documentoCalibracionUrl: val })}
              productName={formData.nombre || ''}
              serie={formData.serie || ''}
            />
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
              {isSubmitting ? 'GUARDANDO...' : editingProduct ? 'Actualizar Registro' : 'Registrar Producto'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
