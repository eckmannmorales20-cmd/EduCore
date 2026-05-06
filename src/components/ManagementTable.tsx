import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  FileSpreadsheet,
  FileText,
  X,
  Check,
  Upload,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatePresence } from 'motion/react';
import { ImportModal } from './ImportModal';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface TableProps {
  key?: string;
  title: string;
  subtitle: string;
  columns: { 
    key: string; 
    label: string; 
    render?: (val: any, row: any) => React.ReactNode;
    exportValue?: (val: any, row: any) => string | number;
    excludeFromExport?: boolean;
  }[];
  data: any[];
  onAdd?: () => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onManage?: (item: any) => void;
  actionLabel?: string;
  onExport?: (type: 'excel' | 'csv') => void;
  onImport?: (data: any[]) => Promise<void>;
  onRowClick?: (item: any) => void;
  filterConfigs?: FilterConfig[];
  type: 'student' | 'teacher' | 'career' | 'subject' | 'group' | 'debt' | 'grade';
}

export const ManagementTable = ({ title, subtitle, columns, data, onAdd, onEdit, onDelete, onManage, actionLabel, onExport, onImport, onRowClick, filterConfigs, type }: TableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Search logic
      const searchMatch = searchTerm === '' || Object.values(item).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Filter logic
      const filterMatch = Object.entries(activeFilters).every(([key, value]) => {
        if (!value) return true;
        
        // Handle boolean values (like isCommonCore)
        if (key === 'isCommonCore') {
          const itemValue = !!item[key]; // Convert to boolean (undefined/null becomes false)
          return String(itemValue) === value;
        }

        const col = columns.find(c => c.key === key);
        let itemValue = String(item[key]).toLowerCase();
        if (col && col.exportValue) {
          itemValue = String(col.exportValue(item[key], item)).toLowerCase();
        }
        
        let filterValue = String(value).toLowerCase();

        // Handle career abbreviations
        if (key === 'career') {
          // If filtering by "Todas", match common core subjects too
          if (filterValue === 'todas') {
            return item.career === 'Todas' || item.isCommonCore === true;
          }
          
          if (filterValue.startsWith('ing.')) {
            filterValue = filterValue.replace('ing.', 'ingeniería');
          } else if (filterValue.startsWith('lic.')) {
            filterValue = filterValue.replace('lic.', 'licenciatura');
          }
          
          if (itemValue.startsWith('ing.')) {
            itemValue = itemValue.replace('ing.', 'ingeniería');
          } else if (itemValue.startsWith('lic.')) {
            itemValue = itemValue.replace('lic.', 'licenciatura');
          }
        }

        // Handle semester numbers (e.g., "6to" -> "6")
        if (key === 'semester') {
          const filterMatches = filterValue.match(/\d+/g);
          const itemMatches = itemValue.match(/\d+/g);
          
          if (!filterMatches) return true;
          if (!itemMatches) return false;
          
          return filterMatches.some(f => itemMatches.includes(f));
        }

        return itemValue.includes(filterValue) || filterValue.includes(itemValue);
      });

      return searchMatch && filterMatch;
    });
  }, [data, searchTerm, activeFilters]);

  const toggleFilter = (key: string, value: string) => {
    setActiveFilters(prev => {
      const next = { ...prev };
      if (next[key] === value) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const handleExport = (exportType: 'excel' | 'csv') => {
    if (onExport) {
      onExport(exportType);
      return;
    }

    const exportData = filteredData.map(row => {
      const rowData: Record<string, any> = {};
      columns.forEach(col => {
        if (col.key === 'actions' || col.excludeFromExport) return;
        
        let val = row[col.key];
        if (col.exportValue) {
          val = col.exportValue(val, row);
        } else if (typeof val === 'object' && val !== null) {
          val = JSON.stringify(val);
        }
        rowData[col.label] = val;
      });
      return rowData;
    });

    const fileName = `${title.toLowerCase().replace(/\s+/g, '_')}_export`;

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
    } else if (exportType === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:gap-3 w-full md:w-auto">
          {onImport && (
            <button 
              onClick={() => {
                console.log(`Opening ImportModal for type: ${type}`);
                setIsImportModalOpen(true);
              }}
              className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs lg:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <Upload size={16} /> <span className="hidden sm:inline">Importar</span>
            </button>
          )}
          <div className="relative group flex-1 sm:flex-none">
            <button className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs lg:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
              <Download size={16} /> <span className="hidden sm:inline">Exportar</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
              <button 
                onClick={() => handleExport('excel')}
                className="w-full px-4 py-2 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 rounded-t-xl"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" /> Excel (.xlsx)
              </button>
              <button 
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 rounded-b-xl"
              >
                <FileText size={14} className="text-blue-600" /> CSV (.csv)
              </button>
            </div>
          </div>
          {onAdd && (
            <button 
              onClick={onAdd}
              className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 rounded-xl text-xs lg:text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Agregar Nuevo</span><span className="sm:hidden">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center relative rounded-t-2xl">
          <div className="relative w-full md:w-64 xl:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs lg:text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none dark:text-white"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {filterConfigs && filterConfigs.length > 0 && (
              <div className="relative">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2",
                    showFilters || Object.keys(activeFilters).length > 0
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  )}
                >
                  <Filter size={16} /> 
                  Filtros
                  {Object.keys(activeFilters).length > 0 && (
                    <span className="w-5 h-5 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center">
                      {Object.keys(activeFilters).length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showFilters && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-40 p-4 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-slate-800 dark:text-white">Filtrar por</h4>
                        <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          <X size={16} />
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {filterConfigs.map(config => (
                          <div key={config.key} className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest dark:text-slate-500">{config.label}</p>
                            <div className="flex flex-wrap gap-2">
                              {config.options.map(opt => (
                                <button
                                  type="button"
                                  key={opt.value}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFilter(config.key, opt.value);
                                  }}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5",
                                    activeFilters[config.key] === opt.value
                                      ? "bg-blue-600 border-blue-600 text-white"
                                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                                  )}
                                >
                                  {activeFilters[config.key] === opt.value && <Check size={12} />}
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveFilters({});
                          }}
                          className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          Limpiar todos los filtros
                        </button>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                {columns.map((col) => (
                  <th key={col.key} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {col.label}
                  </th>
                ))}
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredData.length > 0 ? (
                filteredData.map((row) => (
                  <tr 
                    key={row.id || Math.random()} 
                    className={cn(
                      "transition-colors group",
                      onRowClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                    )}
                    onClick={() => onRowClick && onRowClick(row)}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2 transition-opacity">
                        {onManage ? (
                          <button 
                            onClick={() => onManage(row)}
                            className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                          >
                            <ArrowRight size={14} /> {actionLabel || 'Gestionar'}
                          </button>
                        ) : (
                          <>
                            {onEdit && (
                              <button 
                                onClick={() => onEdit(row)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                            {onDelete && (
                              <button 
                                onClick={() => onDelete(row)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search size={32} className="opacity-20" />
                      <p className="text-sm font-medium">No se encontraron resultados</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredData.length > 0 ? (
            filteredData.map((row) => (
              <div 
                key={row.id || Math.random()} 
                className={cn(
                  "p-4 space-y-3",
                  onRowClick ? "cursor-pointer active:bg-slate-50 dark:active:bg-slate-800" : ""
                )}
                onClick={() => onRowClick && onRowClick(row)}
              >
                <div className="grid grid-cols-2 gap-2">
                  {columns.map((col) => (
                    <div key={col.key} className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{col.label}</p>
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-2" onClick={(e) => e.stopPropagation()}>
                  {onManage ? (
                    <button 
                      onClick={() => onManage(row)}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <ArrowRight size={14} /> {actionLabel || 'Gestionar'}
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      {onEdit && (
                        <button 
                          onClick={() => onEdit(row)}
                          className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {onDelete && (
                        <button 
                          onClick={() => onDelete(row)}
                          className="p-2 text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Search size={32} className="opacity-20" />
                <p className="text-sm font-medium">No se encontraron resultados</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/30 dark:bg-slate-800/30 rounded-b-2xl">
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Mostrando <span className="font-semibold text-slate-800 dark:text-white">{filteredData.length}</span> de <span className="font-semibold text-slate-800 dark:text-white">{data.length}</span> registros</p>
          <div className="flex gap-2 w-full sm:w-auto justify-center">
            <button className="px-3 py-1 text-xs sm:text-sm font-medium text-slate-400 cursor-not-allowed">Anterior</button>
            <button className="px-3 py-1 text-xs sm:text-sm font-medium bg-blue-600 text-white rounded-lg">1</button>
            <button className="px-3 py-1 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors">Siguiente</button>
          </div>
        </div>
      </div>

      {onImport && (
        <ImportModal 
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={onImport}
          type={type}
        />
      )}
    </div>
  );
};
