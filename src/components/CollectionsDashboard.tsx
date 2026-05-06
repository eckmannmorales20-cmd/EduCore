import React, { useState } from 'react';
import { 
  Search, 
  FileUp, 
  Download, 
  Users, 
  DollarSign, 
  AlertCircle,
  Filter,
  RefreshCw,
  Trash2,
  ChevronRight,
  Calculator
} from 'lucide-react';
import { cn } from '../lib/utils';
import { StudentDebt } from '../types';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';



type FilterType = 'all' | 'active' | 'inactive' | 'highest' | 'current' | 'previous';

interface CollectionsDashboardProps {
  debts?: StudentDebt[];
  onImport?: (data: any[]) => Promise<void> | void;
}

export const CollectionsDashboard = ({ debts = [], onImport }: CollectionsDashboardProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState<StudentDebt | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importState, setImportState] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const fetchDebts = async () => {
    setIsLoading(true);
    try {
      // Fetch debts from Supabase
      // For now, we rely on props
    } catch (error) {
      console.error('Error fetching debts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    // fetchDebts();
  }, []);

  const handleSearch = () => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setSearchResult(null);
      return;
    }

    const localResult = debts.find(d => 
      d.enrollment.toLowerCase() === term || 
      d.firstName.toLowerCase().includes(term) || 
      d.lastName.toLowerCase().includes(term) ||
      `${d.firstName} ${d.lastName}`.toLowerCase().includes(term)
    );

    setSearchResult(localResult || null);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportState('uploading');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (onImport) {
          try {
            await onImport(results.data);
            setImportState('success');
          } catch (error) {
            console.error('Error during import:', error);
            setImportState('idle');
          } finally {
            setTimeout(() => {
              setIsImporting(false);
              setImportState('idle');
            }, 2000);
          }
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setIsImporting(false);
        setImportState('idle');
      }
    });
  };

  const handleExport = (exportType: 'excel' | 'csv') => {
    const exportData = debts.map(debt => ({
      Matrícula: debt.enrollment,
      Nombre: debt.firstName,
      Apellidos: debt.lastName,
      Periodo: debt.period,
      Año: debt.year,
      'Adeudo Colegiatura': debt.tuitionDebt,
      'Adeudo Reinscripción': debt.reinstatementDebt,
      'Adeudo Titulación': debt.otherDebt,
      'Total Adeudo': debt.total
    }));

    const fileName = 'reporte_adeudos';

    if (exportType === 'csv') {
      const csv = Papa.unparse(exportData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Adeudos');
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }
  };

  const handleDeleteDebt = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro de adeudo?')) {
      // setDebts(prev => prev.filter(d => d.studentId !== studentId));
      console.log('Delete debt not implemented yet');
      if (searchResult?.studentId === studentId) {
        setSearchResult(null);
        setSearchTerm('');
      }
    }
  };

  const totalGlobalDebt = debts.reduce((sum, d) => sum + d.total, 0);

  const getDebtStatus = (debt: StudentDebt) => {
    const debtItems = [];
    if (debt.tuitionDebt > 0) debtItems.push('Colegiatura');
    if (debt.reinstatementDebt > 0) debtItems.push('REVOE');
    if (debt.powerCourseDebt > 0) debtItems.push('Pottencia');
    if (debt.adminDebt > 0) debtItems.push('Gastos Admin.');

    if (debtItems.length === 0) return { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', label: 'Sin Adeudo', debts: [] };
    if (debtItems.length === 4) return { color: 'text-rose-600 bg-rose-50 border-rose-100', label: 'Adeudo Total', debts: debtItems };
    return { color: 'text-amber-600 bg-amber-50 border-amber-100', label: 'Adeudo Parcial', debts: debtItems };
  };

  const filteredDebts = (() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let result = [...debts];

    switch (activeFilter) {
      case 'active':
        result = result.filter(d => d.status === 'active');
        break;
      case 'inactive':
        result = result.filter(d => d.status === 'inactive');
        break;
      case 'highest':
        result = result.sort((a, b) => b.total - a.total);
        break;
      case 'current':
        result = result.filter(d => {
          const date = new Date(d.debtDate);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        break;
      case 'previous':
        result = result.filter(d => {
          const date = new Date(d.debtDate);
          return date.getFullYear() < currentYear || (date.getFullYear() === currentYear && date.getMonth() < currentMonth);
        });
        break;
    }

    return result;
  })();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
          <div className="p-2.5 lg:p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shrink-0">
            <Users size={20} className="lg:w-6 lg:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Alumnos</p>
            <p className="text-xl lg:text-2xl font-black text-slate-800 dark:text-white">{debts.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
          <div className="p-2.5 lg:p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 shrink-0">
            <DollarSign size={20} className="lg:w-6 lg:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Adeudo Total</p>
            <p className="text-xl lg:text-2xl font-black text-slate-800 dark:text-white">${totalGlobalDebt.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
          <div className="p-2.5 lg:p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertCircle size={20} className="lg:w-6 lg:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Alumnos con Adeudo</p>
            <p className="text-xl lg:text-2xl font-black text-slate-800 dark:text-white">{debts.filter(d => d.total > 0).length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 lg:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
          <button 
            onClick={fetchDebts}
            disabled={isLoading}
            className="p-2.5 lg:p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={20} className={cn("lg:w-6 lg:h-6", isLoading ? 'animate-spin' : '')} />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Estado Base</p>
            <p className="text-xs lg:text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase truncate">{isLoading ? 'Sincronizando...' : 'Actualizada'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Búsqueda por Matrícula</h3>
              <button 
                onClick={() => {setSearchTerm(''); setSearchResult(null);}}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1"
              >
                <Trash2 size={14} /> Limpiar Búsqueda
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Matrícula o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:text-white"
                />
              </div>
              <button 
                onClick={handleSearch}
                className="w-full sm:w-auto px-8 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-lg shadow-slate-900/20 dark:shadow-blue-600/20"
              >
                Buscar
              </button>
            </div>

            {searchResult ? (
              <div className="mt-8 space-y-6 animate-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Periodo</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{searchResult.period}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Año</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{searchResult.year}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estatus</p>
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                      searchResult.status === 'active' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                    )}>
                      {searchResult.status}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Campus</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{searchResult.campus}</p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Desglose de Adeudos</h4>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Descuento Aplicado: <span className="text-emerald-600 dark:text-emerald-400">{searchResult.discount}%</span>
                    </div>
                  </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Colegiatura</p>
                    <p className="text-base lg:text-lg font-black text-slate-800 dark:text-white">${searchResult.tuitionDebt.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Curso Potencia</p>
                    <p className="text-base lg:text-lg font-black text-slate-800 dark:text-white">${searchResult.powerCourseDebt.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gastos Admin.</p>
                    <p className="text-base lg:text-lg font-black text-slate-800 dark:text-white">${searchResult.adminDebt.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reincorporación</p>
                    <p className="text-base lg:text-lg font-black text-slate-800 dark:text-white">${searchResult.reinstatementDebt.toLocaleString()}</p>
                  </div>
                  <div className="col-span-1 sm:col-span-2 md:col-span-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <p className="text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-widest dark:text-slate-400">Total Final</p>
                    <p className="text-2xl lg:text-3xl font-black text-rose-600 dark:text-rose-400">${searchResult.total.toLocaleString()}</p>
                  </div>
                </div>
                </div>
              </div>
            ) : searchTerm && (
              <div className="mt-8 p-12 text-center space-y-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-300 shadow-sm">
                  <Search size={32} />
                </div>
                <div>
                  <p className="text-slate-800 dark:text-white font-bold">No se encontró la matrícula</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm">Verifique el número e intente de nuevo.</p>
                </div>
              </div>
            )}
          </div>

          {/* Students Table Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Listado de Alumnos y Adeudos</h3>
              <div className="flex flex-wrap justify-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Al Corriente</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Parcial</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                </div>
              </div>
            </div>
            
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nombres</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Apellidos</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado de Adeudo</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDebts.map((debt) => {
                    const status = getDebtStatus(debt);
                    return (
                      <tr 
                        key={debt.studentId} 
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                        onClick={() => {
                          setSearchTerm(debt.enrollment);
                          setSearchResult(debt);
                        }}
                      >
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                            #{debt.enrollment}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-white">{debt.firstName}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{debt.lastName}</td>
                        <td className="px-6 py-4">
                          <div className={cn(
                            "inline-flex flex-col px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all",
                            status.color
                          )}>
                            <span>{status.label}</span>
                            {status.debts.length > 0 && (
                              <span className="text-[8px] opacity-70 mt-0.5">
                                ({status.debts.join(', ')})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "text-sm font-black",
                            debt.total > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                          )}>
                            ${debt.total.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => handleDeleteDebt(debt.studentId, e)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                            title="Eliminar Registro"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDebts.map((debt) => {
                const status = getDebtStatus(debt);
                return (
                  <div 
                    key={debt.studentId} 
                    className="p-4 space-y-3 active:bg-slate-50 dark:active:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => {
                      setSearchTerm(debt.enrollment);
                      setSearchResult(debt);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-mono font-bold text-slate-400">#{debt.enrollment}</p>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">{debt.firstName} {debt.lastName}</h4>
                      </div>
                      <div className={cn(
                        "px-2 py-1 rounded-lg border text-[10px] font-bold",
                        status.color
                      )}>
                        {status.label}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={cn(
                        "text-lg font-black",
                        debt.total > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        ${debt.total.toLocaleString()}
                      </span>
                      <button 
                        onClick={(e) => handleDeleteDebt(debt.studentId, e)}
                        className="p-2 text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Acciones de Base</h3>
            
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={isImporting}
                />
                <button 
                  disabled={isImporting}
                  className="w-full flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <FileUp size={20} />
                    <div className="text-left">
                      <p className="text-sm font-bold">Importar Excel/CSV</p>
                      <p className="text-[10px] opacity-70 uppercase font-bold tracking-wider">Cargar base de adeudos</p>
                    </div>
                  </div>
                  {importState === 'uploading' ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : importState === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  ) : (
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  )}
                </button>
              </div>

              <button className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all group">
                <div className="flex items-center gap-3">
                  <Calculator size={20} />
                  <div className="text-left">
                    <p className="text-sm font-bold">Calcular Totales</p>
                    <p className="text-[10px] opacity-70 uppercase font-bold tracking-wider">3 conceptos principales</p>
                  </div>
                </div>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="relative group">
                <button className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all">
                  <div className="flex items-center gap-3">
                    <Download size={20} />
                    <div className="text-left">
                      <p className="text-sm font-bold">Exportar Reporte</p>
                      <p className="text-[10px] opacity-70 uppercase font-bold tracking-wider">Generar archivo CSV o Excel</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="group-hover:rotate-90 transition-transform" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
                  <button 
                    onClick={() => handleExport('excel')}
                    className="w-full px-4 py-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 rounded-t-xl"
                  >
                    Excel (.xlsx)
                  </button>
                  <button 
                    onClick={() => handleExport('csv')}
                    className="w-full px-4 py-3 text-left text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 rounded-b-xl"
                  >
                    CSV (.csv)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-slate-900/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Filter size={18} className="text-blue-400" />
                </div>
                <h4 className="font-bold">Filtros Rápidos</h4>
              </div>
              {activeFilter !== 'all' && (
                <button 
                  onClick={() => setActiveFilter('all')}
                  className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => setActiveFilter('active')}
                className={cn(
                  "w-full text-left p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                  activeFilter === 'active' ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" : "bg-white/5 border-transparent hover:bg-white/10 text-slate-300"
                )}
              >
                Activos (Inscritos)
              </button>
              <button 
                onClick={() => setActiveFilter('inactive')}
                className={cn(
                  "w-full text-left p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                  activeFilter === 'inactive' ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" : "bg-white/5 border-transparent hover:bg-white/10 text-slate-300"
                )}
              >
                No Activos (Baja Temporal)
              </button>
              <button 
                onClick={() => setActiveFilter('highest')}
                className={cn(
                  "w-full text-left p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                  activeFilter === 'highest' ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" : "bg-white/5 border-transparent hover:bg-white/10 text-slate-300"
                )}
              >
                Mayor Adeudo
              </button>
              <button 
                onClick={() => setActiveFilter('current')}
                className={cn(
                  "w-full text-left p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                  activeFilter === 'current' ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" : "bg-white/5 border-transparent hover:bg-white/10 text-slate-300"
                )}
              >
                Por Periodo (Mes Corriente)
              </button>
              <button 
                onClick={() => setActiveFilter('previous')}
                className={cn(
                  "w-full text-left p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                  activeFilter === 'previous' ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" : "bg-white/5 border-transparent hover:bg-white/10 text-slate-300"
                )}
              >
                Periodo Anterior (Meses Pasados)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckCircle2 = ({ size, className }: { size: number, className: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
