import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Table as TableIcon,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { cn } from '../lib/utils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[]) => Promise<void>;
  type: 'student' | 'teacher' | 'career' | 'subject' | 'group' | 'debt' | 'grade';
}

export const ImportModal = ({ isOpen, onClose, onImport, type }: ImportModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typeLabels = {
    student: 'Alumnos',
    teacher: 'Profesores',
    career: 'Carreras',
    subject: 'Materias',
    group: 'Grupos',
    debt: 'Adeudos',
    grade: 'Calificaciones'
  };

  const expectedHeaders = {
    student: ['name', 'enrollment', 'career', 'semester', 'group', 'modality'],
    teacher: ['name', 'employeeId', 'specialty', 'email'],
    career: ['name', 'code', 'headOfCareer'],
    subject: ['name', 'code', 'semester', 'credits', 'teacher', 'career', 'isCommonCore'],
    group: ['name', 'semester', 'career', 'modality', 'subject', 'teacher'],
    debt: ['enrollment', 'period', 'year', 'tuition', 'reinstatement', 'powerCourse', 'admin', 'discount', 'campus'],
    grade: ['enrollment', 'subject', 'partial', 'grade']
  };

  const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const headerMapping: Record<string, string> = {
    // Student
    'nombre completo': 'name',
    'nombre': 'name',
    'matrícula': 'enrollment',
    'matricula': 'enrollment',
    'carrera': 'career',
    'cuatrimestre': 'semester',
    'grupo': 'group',
    'modalidad': 'modality',
    // Teacher
    'id empleado': 'employeeId',
    'id': 'employeeId',
    'especialidad': 'specialty',
    'correo institucional': 'email',
    'correo': 'email',
    // Career
    'nombre de la carrera': 'name',
    'código': 'code',
    'codigo': 'code',
    'jefe de carrera': 'headOfCareer',
    // Subject
    'nombre de la materia': 'name',
    'créditos': 'credits',
    'creditos': 'credits',
    'docente': 'teacher',
    'tronco común': 'isCommonCore',
    'tronco comun': 'isCommonCore',
    'es tronco común': 'isCommonCore',
    // Group
    'nombre del grupo': 'name',
    'materia': 'subject',
    'alumnos': 'studentsCount',
    'estudiantes': 'studentsCount',
    'semestre': 'semester',
    'periodo': 'semester',
    // Debt
    'colegiatura': 'tuition',
    'adeudo colegiatura': 'tuition',
    'reincorporacion': 'reinstatement',
    'adeudo reincorporacion': 'reinstatement',
    'revoe': 'reinstatement',
    'pottencia': 'powerCourse',
    'curso potencia': 'powerCourse',
    'gastos admin': 'admin',
    'gastos administrativos': 'admin',
    'descuento': 'discount',
    'porcentaje descuento': 'discount',
    'plantel': 'campus',
    'año': 'year',
    // Grade
    'calificacion': 'grade',
    'parcial': 'partial',
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    console.log('File selected:', selectedFile?.name);
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Por favor selecciona un archivo CSV válido.');
        return;
      }
      setFile(selectedFile);
      setError(null);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    console.log('Parsing file for preview:', file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        const clean = normalizeString(header);
        if (clean === 'grupo' || clean === 'group') {
          return type === 'group' ? 'name' : 'group';
        }
        return headerMapping[clean] || clean;
      },
      complete: (results) => {
        console.log('Preview parse complete. Rows:', results.data.length);
        if (results.data && results.data.length > 0) {
          setHeaders(Object.keys(results.data[0] as object));
          setPreviewData(results.data.slice(0, 5)); // Show first 5 rows
        } else {
          setError('El archivo está vacío o no tiene el formato correcto.');
        }
      },
      error: (err) => {
        console.error('Preview parse error:', err);
        setError(`Error al procesar el archivo: ${err.message}`);
      }
    });
  };

  const startImport = () => {
    if (!file) {
      return;
    }
    
    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        try {
          const clean = normalizeString(header);
          console.log(`Transforming header: "${header}" -> "${clean}"`);
          if (clean === 'grupo' || clean === 'group') {
            return type === 'group' ? 'name' : 'group';
          }
          const mapped = headerMapping[clean] || clean;
          if (mapped !== clean) {
            console.log(`Mapped header: "${clean}" to "${mapped}"`);
          }
          return mapped;
        } catch (e) {
          console.error('Error in transformHeader:', e);
          return header;
        }
      },
      complete: async (results) => {
        if (results.data.length === 0) {
          setError('No se encontraron datos en el archivo CSV.');
          setLoading(false);
          return;
        }

        try {
          await onImport(results.data);
          setSuccess(true);
          setTimeout(() => {
            onClose();
            resetState();
          }, 2000);
        } catch (err: any) {
          setError(`Error al importar: ${err.message || 'Error desconocido'}`);
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        console.error('PapaParse global error:', error);
        setError(`Error al leer el archivo: ${error.message}`);
        setLoading(false);
      }
    });
  };

  const resetState = () => {
    setFile(null);
    setPreviewData([]);
    setHeaders([]);
    setLoading(false);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Upload className="text-blue-600" size={24} />
                Importar {typeLabels[type]}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sube un archivo CSV para alimentar la base de datos.</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-400"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-8 overflow-y-auto flex-1">
            {!file ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <FileText size={32} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Haz clic para subir o arrastra un archivo</p>
                  <p className="text-sm text-slate-400 mt-1">Solo archivos CSV (.csv)</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* File Info */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{file.name}</p>
                      <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <button 
                    onClick={resetState}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Cambiar archivo
                  </button>
                </div>

                {/* Preview */}
                {previewData.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <TableIcon size={16} className="text-blue-600" />
                        Vista previa (primeras 5 filas)
                      </h3>
                    </div>
                    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                              {headers.map(h => (
                                <th key={h} className="px-4 py-3 font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {previewData.map((row, i) => (
                              <tr key={i} className="dark:text-slate-300">
                                {headers.map(h => (
                                  <td key={h} className="px-4 py-3 truncate max-w-[150px]">
                                    {row[h]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50 flex gap-3">
                      <AlertCircle className="text-amber-600 shrink-0" size={18} />
                      <div className="text-xs text-amber-700 dark:text-amber-400">
                        <p className="font-bold mb-1">Encabezados recomendados:</p>
                        <p className="opacity-80">
                          {type === 'career' ? 'CÓDIGO, NOMBRE DE LA CARRERA, JEFE DE CARRERA' : 
                           type === 'student' ? 'MATRÍCULA, NOMBRE COMPLETO, CARRERA, CUATRIMESTRE' :
                           type === 'subject' ? 'CÓDIGO, NOMBRE DE LA MATERIA, CUATRIMESTRE, CRÉDITOS, DOCENTE, CARRERA, TRONCO COMÚN' :
                           type === 'debt' ? 'MATRÍCULA, PERIODO, AÑO, COLEGIATURA, REINCORPORACIÓN, CURSO POTENCIA, GASTOS ADMIN, DESCUENTO, CAMPUS' :
                           type === 'grade' ? 'MATRÍCULA, MATERIA, PARCIAL, CALIFICACIÓN' :
                           expectedHeaders[type].join(', ')}
                        </p>
                        <p className="mt-2">El sistema intentará mapear automáticamente tus columnas si usas nombres descriptivos en español.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400"
              >
                <AlertCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400"
              >
                <CheckCircle2 size={20} />
                <p className="text-sm font-medium">¡Importación exitosa! Los datos han sido guardados.</p>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={startImport}
              disabled={!file || loading || success}
              className={cn(
                "px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2",
                !file || loading || success
                  ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Procesando...
                </>
              ) : (
                <>
                  Iniciar Importación
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
