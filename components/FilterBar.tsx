import React from 'react';
import { SearchFilters } from '../types';
import { Zap, List } from 'lucide-react';

interface FilterBarProps {
  filters: SearchFilters;
  onChange: (key: keyof SearchFilters, value: any) => void;
  disabled: boolean;
}

// Data Definition
const cuisines = [
  { label: '全部', icon: '🍱' },
  { label: '中式', icon: '🥟' },
  { label: '日式', icon: '🍣' },
  { label: '韓式', icon: '🥘' },
  { label: '港式', icon: '🍤' },
  { label: '美式', icon: '🍔' },
  { label: '義式', icon: '🍝' },
  { label: '速食', icon: '🍟' },
  { label: '飲料', icon: '🥤' },
  { label: '咖啡廳', icon: '☕' },
];

const prices = ['$ 1~200', '$ 201~400', '$ 401~600', '$ 600+'];

const modes = [
  { label: '步行', icon: '🚶' },
  { label: '騎車', icon: '🛵' }
];

const times = [
  { label: '現在', icon: '🕒' },
  { label: '早上', icon: '🍳' },
  { label: '中午', icon: '🍱' },
  { label: '晚上', icon: '🌙' }
];

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onChange, disabled }) => {
  
  const SectionLabel = ({ label, emoji }: { label: string, emoji: string }) => (
    <div className="flex items-center gap-2 mb-4 ml-1">
      <span className="text-2xl filter drop-shadow-sm">{emoji}</span>
      <span className="text-lg font-black text-slate-800 tracking-wide">{label}</span>
    </div>
  );

  const FilterChip = ({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon?: string }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative px-4 py-3 rounded-2xl text-base font-black transition-all duration-150 flex items-center justify-center gap-2 whitespace-nowrap border-[3px] flex-grow sm:flex-grow-0
        ${active 
          ? 'bg-slate-800 text-white border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] transform -translate-y-1' 
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]'
        }
        active:shadow-none active:translate-y-0
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {icon && <span className="text-xl leading-none">{icon}</span>}
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-8 p-6 bg-white/60 backdrop-blur-md rounded-[2.5rem] shadow-xl border-4 border-white">
      
      {/* Cuisine - Wrapped Layout */}
      <div>
        <SectionLabel label="今天想吃什麼？" emoji="😋" />
        <div className="flex flex-wrap gap-3">
          {cuisines.map((c) => (
             <FilterChip 
               key={c.label} 
               label={c.label} 
               icon={c.icon}
               active={filters.cuisine === c.label} 
               onClick={() => onChange('cuisine', c.label)} 
             />
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <SectionLabel label="預算範圍" emoji="💰" />
        <div className="flex flex-wrap gap-3">
          {prices.map((p) => (
            <FilterChip 
              key={p} 
              label={p} 
              active={filters.price === p} 
              onClick={() => onChange('price', p)} 
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Mode */}
        <div>
            <SectionLabel label="交通方式" emoji="🚀" />
            <div className="flex flex-wrap gap-3">
              {modes.map((m) => (
                <FilterChip 
                  key={m.label} 
                  label={m.label} 
                  icon={m.icon}
                  active={filters.mode === m.label} 
                  onClick={() => onChange('mode', m.label)} 
                />
              ))}
            </div>
        </div>

        {/* Time */}
        <div>
            <SectionLabel label="用餐時段" emoji="⏰" />
            <div className="flex flex-wrap gap-3">
              {times.map((t) => (
                <FilterChip 
                  key={t.label} 
                  label={t.label} 
                  icon={t.icon}
                  active={filters.time === t.label} 
                  onClick={() => onChange('time', t.label)} 
                />
              ))}
            </div>
        </div>
      </div>

      {/* Recommendation Count Toggle */}
      <div className="pt-6 border-t-4 border-dashed border-slate-200">
        <SectionLabel label="推薦模式 (點擊切換)" emoji="✨" />
        <div className="flex bg-slate-100 p-2 rounded-2xl w-full sm:w-fit border-2 border-slate-200 shadow-inner">
          <button
             onClick={() => onChange('recommendationCount', 'single')}
             className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-base font-black flex items-center justify-center gap-2 transition-all ${
               filters.recommendationCount === 'single' 
               ? 'bg-yellow-400 text-slate-900 shadow-md transform scale-105 border-2 border-slate-900' 
               : 'text-slate-400 hover:text-slate-600'
             }`}
          >
            <Zap size={20} fill="currentColor" />
            精選一家
          </button>
          <button
             onClick={() => onChange('recommendationCount', 'multiple')}
             className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-base font-black flex items-center justify-center gap-2 transition-all ${
               filters.recommendationCount === 'multiple' 
               ? 'bg-pink-400 text-white shadow-md transform scale-105 border-2 border-slate-900' 
               : 'text-slate-400 hover:text-slate-600'
             }`}
          >
            <List size={20} />
            推薦多家
          </button>
        </div>
      </div>
    </div>
  );
};