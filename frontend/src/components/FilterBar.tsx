import { Search, Filter } from 'lucide-react';
import type { NotificationType } from '@/types';

interface FilterBarProps {
  selectedType: NotificationType | 'all';
  onTypeChange: (type: NotificationType | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function FilterBar({
  selectedType,
  onTypeChange,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  const types: Array<{ value: NotificationType | 'all'; label: string; icon: string }> = [
    { value: 'all', label: 'Todas', icon: '📋' },
    { value: 'success', label: 'Éxitos', icon: '✅' },
    { value: 'error', label: 'Errores', icon: '❌' },
    { value: 'warning', label: 'Advertencias', icon: '⚠️' },
    { value: 'info', label: 'Info', icon: 'ℹ️' },
  ];

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Type filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {types.map((type) => (
              <button
                key={type.value}
                onClick={() => onTypeChange(type.value)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                  transition-colors flex items-center gap-2
                  ${selectedType === type.value
    ? 'bg-blue-600 text-white'
    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
}
                `}
              >
                <span>{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar notificaciones..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
