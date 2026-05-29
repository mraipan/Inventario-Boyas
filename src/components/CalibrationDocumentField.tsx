import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Eye, AlertCircle } from 'lucide-react';
import { downloadCalibrationDocument } from '../utils/fileHelpers';

interface CalibrationDocumentFieldProps {
  value: string; // Base64 data URI or URL
  onChange: (value: string) => void;
  productName: string;
  serie: string;
  disabled?: boolean;
}

export function CalibrationDocumentField({
  value,
  onChange,
  productName,
  serie,
  disabled = false,
}: CalibrationDocumentFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setError(null);

    // Validate file size: 100 KB = 100 * 1024 bytes = 102400 bytes
    const maxSizeBytes = 100 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`Error: El archivo "${file.name}" supera el límite de 100 KB (Tamaño: ${(file.size / 1024).toFixed(1)} KB)`);
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const lowerName = file.name.toLowerCase();
    const hasValidExtension = lowerName.endsWith('.pdf') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png');

    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      setError('Error: Solo se permiten archivos en formato PDF o JPG/JPEG');
      return;
    }

    // Read as Base64 string
    const reader = new FileReader();
    reader.onerror = () => {
      setError('Hubo un problema al procesar el archivo. Reintente por favor.');
    };
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        onChange(e.target.result);
      } else {
        setError('No se pudo convertir el archivo a formato válido.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadCalibrationDocument(value, productName || 'Producto', serie || 'SN');
  };

  // Determine file type icon
  const isPdf = value.startsWith('data:application/pdf') || value.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] font-mono uppercase opacity-50 tracking-widest ml-1 block">
        Documento de Calibración (PDF o JPG)
      </label>

      {value ? (
        <div className="flex items-center justify-between bg-white/5 border border-white/15 rounded-xl p-3 text-sm">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 shrink-0">
              <FileText size={20} />
            </div>
            <div className="truncate text-left">
              <div className="font-semibold text-white truncate max-w-[200px] sm:max-w-[250px]">
                {isPdf ? 'Documento_Calibracion.pdf' : 'Documento_Calibracion.jpg'}
              </div>
              <div className="text-[10px] text-cyan-400/80 font-mono">
                {value.startsWith('data:') 
                  ? `Tamaño: ~${Math.round((value.length * 3) / 4 / 1024)} KB` 
                  : 'Documento en línea'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 bg-white/10 hover:bg-white/15 text-white/90 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold px-2.5"
              title="Descargar o Ver Documento"
            >
              <Eye size={14} className="text-cyan-400" />
              <span>Ver</span>
            </button>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 hover:bg-red-500/20 text-white/60 hover:text-red-400 rounded-lg transition-colors"
                title="Quitar Documento"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDragOver={disabled ? undefined : handleDragOver}
          onDragLeave={disabled ? undefined : handleDragLeave}
          onDrop={disabled ? undefined : handleDrop}
          onClick={disabled ? undefined : () => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all flex flex-col items-center justify-center gap-2 bg-white/2
            ${disabled 
              ? 'border-white/5 opacity-50 cursor-not-allowed'
              : isDragging 
                ? 'border-cyan-400 bg-cyan-500/5 scale-[0.99] shadow-inner cursor-pointer' 
                : 'border-white/15 hover:border-white/30 hover:bg-white/5 cursor-pointer'
            }
          `}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf, .jpg, .jpeg, image/jpeg, image/jpg, application/pdf"
            className="hidden"
            disabled={disabled}
          />
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40">
            <Upload size={18} />
          </div>
          <div className="text-xs font-semibold text-white">
            {disabled ? 'Sin documento de calibración' : 'Haz clic o arrastra un documento aquí'}
          </div>
          {!disabled && (
            <div className="text-[10px] text-white/40 font-mono tracking-tight uppercase">
              Formatos: PDF o JPG • Máx: 100 KB
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-red-400 bg-red-500/10 border border-red-500/15 rounded-xl p-3 text-xs leading-5">
          <AlertCircle size={16} className="shrink-0 text-red-500 mt-0.5" />
          <div className="text-left font-light">{error}</div>
        </div>
      )}
    </div>
  );
}
