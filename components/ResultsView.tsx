import React, { useState } from 'react';
import { SearchResult, MapSource } from '../types';
import { MapPin, Heart, Store, ExternalLink, Smile, Map as MapIcon, Crown, AlignLeft, List } from 'lucide-react';

interface ResultsViewProps {
  result: SearchResult;
  isFavorite: (uri: string) => boolean;
  onRequestSave: (source: MapSource) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ result, isFavorite, onRequestSave }) => {
  const [activeTab, setActiveTab] = useState<'report' | 'list'>('report');
  
  // Improved markdown parser with Link support
  const renderText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      const isListItem = trimmed.startsWith('*') || trimmed.startsWith('-');
      const cleanLine = isListItem ? trimmed.substring(1).trim() : line;

      // Process bold markers (**text**) and Links ([text](url))
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      
      const content = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-orange-600 font-black bg-orange-50 px-1 rounded mx-0.5">{part.replace(/\*\*/g, '')}</strong>;
        }
        
        // Check for links [Text](URL)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const linkParts = [];
        let lastIndex = 0;
        let match;
        
        while ((match = linkRegex.exec(part)) !== null) {
            if (match.index > lastIndex) {
                linkParts.push(part.substring(lastIndex, match.index));
            }
            linkParts.push(
                <a 
                    key={`${i}-${match.index}`} 
                    href={match[2]} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 underline decoration-2 underline-offset-2 hover:text-blue-600 font-bold mx-1"
                >
                    {match[1]}
                </a>
            );
            lastIndex = linkRegex.lastIndex;
        }
        if (lastIndex < part.length) {
            linkParts.push(part.substring(lastIndex));
        }

        return linkParts.length > 0 ? <span key={i}>{linkParts}</span> : part;
      });

      if (isListItem) {
        return (
          <div key={idx} className="flex items-start gap-3 mb-2 ml-1">
            <span className="mt-2 w-2 h-2 rounded-full bg-yellow-400 ring-2 ring-slate-800 flex-shrink-0" />
            <span className="text-slate-600 leading-relaxed text-sm md:text-base font-bold">{content}</span>
          </div>
        );
      }
      
      if (trimmed === '') return <div key={idx} className="h-4" />;
      
      return (
        <p key={idx} className="mb-2 text-slate-600 leading-relaxed text-sm md:text-base font-bold">
          {content}
        </p>
      );
    });
  };

  return (
    <div className="pb-32">
        {/* Mobile Sub-Tab Switcher */}
        <div className="md:hidden flex mb-6 bg-slate-100 p-1.5 rounded-2xl">
            <button 
                onClick={() => setActiveTab('report')}
                className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'report' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'
                }`}
            >
                <AlignLeft size={16} /> AI 建議
            </button>
            <button 
                onClick={() => setActiveTab('list')}
                className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'
                }`}
            >
                <List size={16} /> 店家清單
            </button>
        </div>

      <div className="space-y-8 animate-fade-in">
        
        {/* AI Analysis Section - Show if activeTab is 'report' OR if screen is desktop (md) */}
        <div className={`${activeTab === 'report' ? 'block' : 'hidden'} md:block`}>
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border-4 border-slate-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-200 rounded-full opacity-50 pointer-events-none mix-blend-multiply" />
                <div className="absolute top-20 -left-10 w-24 h-24 bg-pink-200 rounded-full opacity-50 pointer-events-none mix-blend-multiply" />
                
                <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3 relative z-10">
                <div className="p-2.5 bg-yellow-400 text-slate-900 rounded-xl transform rotate-3 border-2 border-slate-800">
                    <Smile size={24} strokeWidth={3} />
                </div>
                <span className="bg-white px-2 py-1 rounded-lg border-2 border-slate-100">AI 美食報告</span>
                </h2>
                <div className="relative z-10 bg-white/80 backdrop-blur-sm rounded-2xl p-4 md:p-6 border-2 border-slate-100">
                {renderText(result.text)}
                </div>
            </div>
        </div>

        {/* Found Locations Cards - Show if activeTab is 'list' OR if screen is desktop (md) */}
        <div className={`${activeTab === 'list' ? 'block' : 'hidden'} md:block`}>
          <h3 className="text-xl font-black text-slate-800 mb-6 px-4 flex items-center gap-2">
            <div className="bg-pink-400 text-white p-1 rounded-lg">
               <MapPin size={20} fill="currentColor" />
            </div>
            <span>發現 {result.sources.length} 間好店</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.sources.map((source, index) => {
              const fav = isFavorite(source.uri);
              const bgColor = index % 2 === 0 ? 'bg-orange-50' : 'bg-blue-50';
              const isTopPick = index === 0;

              return (
                <div
                  key={index}
                  className={`group relative bg-white rounded-[2rem] overflow-hidden border-4 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] transition-all duration-300 flex flex-col ${isTopPick ? 'ring-4 ring-yellow-400 ring-offset-4' : ''}`}
                >
                   {isTopPick && (
                      <div className="absolute top-0 left-0 bg-yellow-400 text-slate-900 text-xs font-black px-3 py-1.5 rounded-br-2xl border-b-4 border-r-4 border-slate-800 z-30 flex items-center gap-1 shadow-md">
                          <Crown size={14} fill="currentColor" />
                          AI 極推 TOP 1
                      </div>
                   )}

                  {/* Compact Cute Map Preview - even smaller on mobile h-20, desktop h-32 */}
                  <a href={source.uri} target="_blank" rel="noopener noreferrer" className={`block relative h-20 md:h-32 ${bgColor} overflow-hidden group/map cursor-pointer border-b-4 border-slate-800`}>
                     <div className="absolute inset-0 opacity-20" style={{
                         backgroundImage: 'radial-gradient(#94A3B8 2px, transparent 2px), radial-gradient(#94A3B8 2px, transparent 2px)',
                         backgroundSize: '24px 24px',
                         backgroundPosition: '0 0, 12px 12px'
                     }}></div>
                     
                     <div className="absolute top-1/2 left-0 w-full h-8 bg-white border-y-4 border-slate-200 transform -rotate-6"></div>
                     
                     <div className="absolute bottom-2 right-2 bg-yellow-400 text-slate-900 text-[10px] font-black px-3 py-1 rounded-lg shadow-sm border border-slate-900 flex items-center gap-1 group-hover/map:bg-yellow-300 transition-colors z-20">
                        <ExternalLink size={10} />
                        看距離
                     </div>

                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-2/3">
                        <div className="relative flex flex-col items-center">
                          <div className={`relative z-10 p-1.5 rounded-full border-2 border-white shadow-lg ${isTopPick ? 'bg-yellow-500 scale-110' : 'bg-pink-500'}`}>
                               <MapPin size={20} className="text-white fill-white" />
                          </div>
                        </div>
                     </div>
                  </a>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xl font-black text-slate-800 mb-1 group-hover:text-pink-500 transition-colors leading-tight line-clamp-1">
                        {source.title}
                      </h4>
                      
                      <div className="flex items-center gap-2 mb-3">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-black rounded border border-green-200">
                            <Store size={10} />
                            Google Map
                          </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <a
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center bg-slate-800 text-white text-sm font-black py-3 rounded-xl hover:bg-slate-700 transition-colors border-2 border-transparent active:scale-95"
                      >
                        🛵 導航
                      </a>
                      
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          onRequestSave(source);
                        }}
                        className={`
                          p-3 rounded-xl transition-all duration-300 border-2 active:scale-95
                          ${fav 
                            ? 'bg-pink-500 text-white border-slate-900 shadow-sm' 
                            : 'bg-white text-slate-300 border-slate-200 hover:border-pink-300 hover:text-pink-400'
                          }
                        `}
                      >
                        <Heart size={20} fill={fav ? "currentColor" : "none"} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {result.sources.length === 0 && (
              <div className="text-center p-10 bg-white rounded-[2rem] border-4 border-dashed border-slate-300 mt-6 opacity-75">
                  <MapIcon size={48} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold">🗺️ 這次沒有直接匹配到地圖連結</p>
                  <p className="text-slate-400 text-sm mt-1">請參考上方的文字建議，手動搜尋看看哦！</p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};