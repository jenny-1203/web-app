import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, Navigation, Heart, Trash2, Home, Sparkles, HelpCircle, Plus, X, FolderHeart, FolderOpen, Search, ArrowRight, ChevronDown, ChevronRight, Edit2, ArrowLeftRight, RotateCcw, ExternalLink } from 'lucide-react';
import { SearchFilters, Coordinates, SearchResult, MapSource, FavoriteCategory, ViewState } from './types';
import { FilterBar } from './components/FilterBar';
import { ResultsView } from './components/ResultsView';
import { searchRestaurants } from './services/geminiService';

export default function App() {
  // State
  const [view, setView] = useState<ViewState>('search');
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [manualAddress, setManualAddress] = useState<string>(""); // State for manual location
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationMode, setLocationMode] = useState<'gps' | 'manual'>('gps'); // Toggle mode
  
  // Favorites State (Categorized)
  const [categories, setCategories] = useState<FavoriteCategory[]>(() => {
    try {
        const saved = localStorage.getItem('gourmetCompassFavorites');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Migration: Check if it's the old array format (MapSource[])
            if (Array.isArray(parsed) && parsed.length > 0 && !('items' in parsed[0])) {
                return [
                    { id: 'home', name: '🏠 家裡附近', items: [], collapsed: false },
                    { id: 'work', name: '🏢 公司周邊', items: [], collapsed: false },
                    { id: 'default', name: '📂 未分類', items: parsed, collapsed: false }
                ];
            }
            // Migration: Empty array or fresh start
            if (Array.isArray(parsed) && parsed.length === 0) {
                 return [
                    { id: 'home', name: '🏠 家裡附近', items: [], collapsed: false },
                    { id: 'work', name: '🏢 公司周邊', items: [], collapsed: false },
                    { id: 'default', name: '📂 未分類', items: [], collapsed: false }
                 ];
            }
            // Check if default categories exist, if not add them (lightweight migration)
            if (Array.isArray(parsed)) {
                const hasHome = parsed.some((c: FavoriteCategory) => c.id === 'home');
                const hasWork = parsed.some((c: FavoriteCategory) => c.id === 'work');
                let newCats = [...parsed];
                if (!hasHome) newCats.unshift({ id: 'home', name: '🏠 家裡附近', items: [], collapsed: false });
                if (!hasWork) newCats.unshift({ id: 'work', name: '🏢 公司周邊', items: [], collapsed: false });
                return newCats;
            }
        }
        return [
            { id: 'home', name: '🏠 家裡附近', items: [], collapsed: false },
            { id: 'work', name: '🏢 公司周邊', items: [], collapsed: false },
            { id: 'default', name: '📂 未分類', items: [], collapsed: false }
        ];
    } catch {
        return [
            { id: 'home', name: '🏠 家裡附近', items: [], collapsed: false },
            { id: 'work', name: '🏢 公司周邊', items: [], collapsed: false },
            { id: 'default', name: '📂 未分類', items: [], collapsed: false }
        ];
    }
  });

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false); // For Adding Favorites
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false); // For Renaming Categories
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false); // For Moving Favorites
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false); // For Manual Location Input
  
  // Temporary State for Modals
  const [restaurantToSave, setRestaurantToSave] = useState<MapSource | null>(null); // Item to add
  const [itemToMove, setItemToMove] = useState<{catId: string, item: MapSource} | null>(null); // Item to move
  const [categoryToRename, setCategoryToRename] = useState<FavoriteCategory | null>(null); // Cat to rename
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [renameInput, setRenameInput] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [tempAddressInput, setTempAddressInput] = useState(""); // Input inside location modal

  const [filters, setFilters] = useState<SearchFilters>({
    cuisine: '全部',
    price: '$ 1~200',
    mode: '步行',
    time: '現在',
    recommendationCount: 'single'
  });
  
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Initial Location Fetch
  useEffect(() => {
    refreshLocation();
  }, []);

  const refreshLocation = () => {
    // If we are in manual mode, switching to refresh usually means user wants GPS
    // But we'll keep the mode logic explicit in the UI
    if (!("geolocation" in navigator)) {
        setLocationError("您的瀏覽器不支援定位功能");
        return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setAccuracy(position.coords.accuracy);
          setLocationLoading(false);
          // Only switch mode if we didn't have a manual address active or explicitly requested
          if (!manualAddress) {
             setLocationMode('gps');
          }
        },
        (err) => {
          console.error("Geolocation error:", err);
          setLocationError("請允許定位權限以尋找附近餐廳");
          setLocationLoading(false);
        },
        {
            enableHighAccuracy: true, // Force GPS
            timeout: 20000,
            maximumAge: 0 // No cache
        }
      );
  };

  const handleSetManualLocation = () => {
      if (tempAddressInput.trim()) {
          setManualAddress(tempAddressInput.trim());
          setLocationMode('manual');
          setIsLocationModalOpen(false);
      }
  };

  const switchToGPS = () => {
      setLocationMode('gps');
      refreshLocation();
  };

  const switchToManual = () => {
      if (manualAddress) {
          setLocationMode('manual');
      } else {
          setIsLocationModalOpen(true);
      }
  };

  // Persist Favorites
  useEffect(() => {
    localStorage.setItem('gourmetCompassFavorites', JSON.stringify(categories));
  }, [categories]);

  // Auto-search logic: When toggle changes, search and switch to results
  useEffect(() => {
    if (hasSearched && !loading) {
        // Only trigger if we have location OR manual address
        if (location || manualAddress) {
            handleSearch();
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.recommendationCount]);

  // --- Search Logic ---

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = async () => {
    // Determine effective location source
    if (locationMode === 'gps' && !location) {
        setError("正在獲取 GPS 定位中，請稍候...");
        refreshLocation(); // Try again
        return;
    }
    if (locationMode === 'manual' && !manualAddress) {
        setError("請輸入手動地址");
        setIsLocationModalOpen(true);
        return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setView('results'); 

    try {
      // Pass the correct context based on mode
      const data = await searchRestaurants(
          filters, 
          locationMode === 'gps' ? location : null, 
          locationMode === 'manual' ? manualAddress : undefined
      );
      setResult(data);
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message || "發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  // --- Favorite Logic ---

  const isFavorite = (uri: string) => {
    return categories.some(cat => cat.items.some(item => item.uri === uri));
  };

  const handleRequestSave = (source: MapSource) => {
    if (isFavorite(source.uri)) {
        // Remove from all categories
        setCategories(prev => prev.map(cat => ({
            ...cat,
            items: cat.items.filter(item => item.uri !== source.uri)
        })));
    } else {
        // Open Modal to Add
        setRestaurantToSave(source);
        setIsModalOpen(true);
        setIsAddingCategory(false);
    }
  };

  const saveToCategory = (categoryId: string) => {
    if (!restaurantToSave) return;
    setCategories(prev => prev.map(cat => {
        if (cat.id === categoryId) {
            return { ...cat, items: [...cat.items, restaurantToSave] };
        }
        return cat;
    }));
    setIsModalOpen(false);
    setRestaurantToSave(null);
  };

  const createCategoryAndSave = () => {
    if (!newCategoryName.trim()) return;
    const newId = Date.now().toString();
    const newCat: FavoriteCategory = {
        id: newId,
        name: newCategoryName.trim(),
        items: restaurantToSave ? [restaurantToSave] : [],
        collapsed: false
    };
    setCategories(prev => [...prev, newCat]);
    setNewCategoryName("");
    setIsModalOpen(false);
    setRestaurantToSave(null);
  };

  // --- Category Management Logic ---

  const deleteCategory = (id: string) => {
      if (confirm('確定要刪除這個分類嗎？裡面的收藏也會不見喔！')) {
          setCategories(prev => prev.filter(c => c.id !== id));
      }
  };

  const removeItem = (catId: string, uri: string) => {
      setCategories(prev => prev.map(cat => {
          if (cat.id === catId) {
              return { ...cat, items: cat.items.filter(i => i.uri !== uri) };
          }
          return cat;
      }));
  };

  const toggleCollapse = (catId: string) => {
      setCategories(prev => prev.map(cat => {
          if (cat.id === catId) {
              return { ...cat, collapsed: !cat.collapsed };
          }
          return cat;
      }));
  };

  const openRenameModal = (cat: FavoriteCategory) => {
      setCategoryToRename(cat);
      setRenameInput(cat.name);
      setIsRenameModalOpen(true);
  };

  const handleRename = () => {
      if (!categoryToRename || !renameInput.trim()) return;
      setCategories(prev => prev.map(cat => 
          cat.id === categoryToRename.id ? { ...cat, name: renameInput.trim() } : cat
      ));
      setIsRenameModalOpen(false);
      setCategoryToRename(null);
  };

  const openMoveModal = (catId: string, item: MapSource) => {
      setItemToMove({ catId, item });
      setIsMoveModalOpen(true);
  };

  const handleMove = (targetCatId: string) => {
      if (!itemToMove) return;
      // 1. Remove from old
      // 2. Add to new
      setCategories(prev => prev.map(cat => {
          if (cat.id === itemToMove.catId) {
              return { ...cat, items: cat.items.filter(i => i.uri !== itemToMove.item.uri) };
          }
          if (cat.id === targetCatId) {
               // Avoid duplicates
               if (cat.items.some(i => i.uri === itemToMove.item.uri)) return cat;
               return { ...cat, items: [...cat.items, itemToMove.item] };
          }
          return cat;
      }));
      setIsMoveModalOpen(false);
      setItemToMove(null);
  };

  // UI for No Location and No Manual Address
  if (locationError && !manualAddress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFF8F0] p-6 text-center font-sans relative overflow-hidden">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] max-w-sm w-full border-4 border-slate-800 relative z-10">
          <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce border-4 border-slate-800">
            <MapPin size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">需要定位權限</h1>
          <p className="text-slate-500 mb-8 font-bold leading-relaxed">{locationError}</p>
          <div className="space-y-3">
             <button 
                onClick={() => refreshLocation()}
                className="w-full bg-yellow-400 text-slate-900 py-4 rounded-2xl font-black text-lg border-b-4 border-slate-900 hover:translate-y-1 hover:border-b-0 active:border-t-4 transition-all"
             >
                {locationLoading ? '定位中...' : '重新定位 🔄'}
             </button>
             <button 
                onClick={() => setIsLocationModalOpen(true)}
                className="w-full bg-white text-slate-600 py-4 rounded-2xl font-black text-lg border-2 border-slate-200 hover:bg-slate-50 transition-all"
             >
                ✍️ 手動輸入位置
             </button>
          </div>
        </div>

        {/* Manual Location Modal (Reusable logic copy) */}
        {isLocationModalOpen && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm">
                 <div className="bg-white rounded-[2rem] w-full max-w-sm p-6">
                    <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                        <MapPin className="text-pink-500" /> 手動輸入位置
                    </h3>
                    <p className="text-slate-400 text-sm font-bold mb-4">輸入地標或路名 (例如: 台北101、板橋車站)</p>
                    <input 
                       autoFocus
                       type="text" 
                       value={tempAddressInput}
                       onChange={e => setTempAddressInput(e.target.value)}
                       placeholder="輸入地點..."
                       className="w-full p-4 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-pink-400 focus:outline-none font-bold mb-4"
                    />
                    <div className="flex gap-3">
                        <button onClick={() => setIsLocationModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500">取消</button>
                        <button onClick={handleSetManualLocation} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold">確認</button>
                    </div>
                 </div>
              </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] pb-28 font-sans text-slate-700 relative overflow-x-hidden">
      
      {/* Cute Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: 'radial-gradient(#FDBA74 2px, transparent 2px)',
        backgroundSize: '24px 24px'
      }}></div>

      {/* Lively Header */}
      <header className="sticky top-0 z-50 bg-[#FFF8F0]/90 backdrop-blur-md border-b-4 border-slate-800/10 transition-all duration-300">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-pink-400 p-2.5 rounded-2xl text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] transform rotate-3 border-2 border-white">
              <HelpCircle size={24} strokeWidth={3} />
            </div>
            <div>
               <h1 className="font-black text-slate-800 text-xl leading-none mb-1 tracking-tight">選擇困難雷達</h1>
               <p className="text-[10px] text-pink-400 font-black tracking-widest uppercase bg-pink-100 px-2 py-0.5 rounded-full inline-block sm:inline hidden">Indecision Radar</p>
            </div>
          </div>
          
          {/* Top Tab Switcher (Desktop Only) */}
           <div className="hidden md:flex p-1.5 bg-slate-800 rounded-full shadow-lg scale-90 sm:scale-100">
              <button
                onClick={() => setView('search')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                  view === 'search' ? 'bg-yellow-400 text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Search size={14} /> 探索
              </button>
              <button
                onClick={() => setView('results')}
                disabled={!hasSearched && !loading}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                  view === 'results' 
                    ? 'bg-yellow-400 text-slate-900' 
                    : !hasSearched && !loading ? 'text-slate-600 opacity-50 cursor-not-allowed' : 'text-slate-400 hover:text-white'
                }`}
              >
                 {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} 
                 結果
              </button>
              <button
                onClick={() => setView('favorites')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                  view === 'favorites' ? 'bg-yellow-400 text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Heart size={14} fill={view === 'favorites' ? "currentColor" : "none"} /> 
                收藏
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pt-6 space-y-6 relative z-10">
        
        {/* --- View: Search (Explore) --- */}
        {view === 'search' && (
          <div className="animate-fade-in space-y-6">
            
            {/* Location Status Bar */}
            <div className="bg-white rounded-2xl p-3 border-2 border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-bold shadow-sm">
                
                {/* Mode Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={switchToGPS}
                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${locationMode === 'gps' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
                    >
                        <Navigation size={12} /> GPS
                    </button>
                    <button 
                        onClick={switchToManual}
                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${locationMode === 'manual' ? 'bg-white shadow text-pink-500' : 'text-slate-400'}`}
                    >
                        <Edit2 size={12} /> 手動
                    </button>
                </div>

                <div className="flex items-center gap-2 text-slate-500 flex-1 justify-end truncate">
                    {locationMode === 'manual' ? (
                         manualAddress ? (
                            <span className="flex items-center gap-1 text-pink-500 truncate">
                                📍 {manualAddress}
                            </span>
                         ) : (
                            <span className="text-slate-400">未設定地址</span>
                         )
                    ) : (
                        locationLoading ? (
                            <span>定位中...</span>
                        ) : (
                            <span className="flex items-center gap-1 text-blue-600">
                                📡 已定位 
                                {accuracy && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded ml-1">±{Math.round(accuracy)}m</span>}
                            </span>
                        )
                    )}
                </div>
            </div>

            <FilterBar 
              filters={filters} 
              onChange={handleFilterChange} 
              disabled={loading} 
            />
            
            <button
              onClick={handleSearch}
              disabled={loading || (locationLoading && locationMode === 'gps') || (locationMode === 'manual' && !manualAddress)}
              className={`
                w-full py-5 rounded-[2rem] font-black text-2xl flex items-center justify-center gap-3 transition-all duration-300 border-b-8 border-slate-900 shadow-xl
                ${loading 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300' 
                  : 'bg-yellow-400 text-slate-900 hover:bg-yellow-300 hover:translate-y-[-4px] active:translate-y-[2px] active:border-b-4'
                }
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={28} />
                  搜尋美食中...
                </>
              ) : (
                <>
                  <Sparkles size={28} fill="currentColor" />
                  幫我決定吃什麼！
                </>
              )}
            </button>
          </div>
        )}

        {/* --- View: Results --- */}
        {view === 'results' && (
          <div className="animate-fade-in">
            {loading ? (
                <div className="text-center py-20">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-yellow-200 rounded-full animate-ping opacity-75"></div>
                        <div className="bg-yellow-400 p-6 rounded-full relative z-10 border-4 border-slate-800 shadow-lg">
                           <Loader2 size={48} className="animate-spin text-slate-900" />
                        </div>
                    </div>
                    <p className="mt-8 text-xl font-black text-slate-600 animate-pulse">
                        正在掃描 {locationMode === 'manual' ? manualAddress : '附近'} {filters.mode === '步行' ? '600公尺' : '1.8公里'} 內的美食...
                    </p>
                    <p className="text-sm text-slate-400 mt-2 font-bold">AI 正在努力閱讀 Google 地圖評價 🍱</p>
                </div>
            ) : error ? (
                <div className="text-center p-8 bg-white rounded-3xl border-4 border-slate-200 shadow-lg">
                    <p className="text-red-500 font-bold text-lg mb-4">{error}</p>
                    <button 
                        onClick={() => setView('search')}
                        className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold"
                    >
                        返回重試
                    </button>
                </div>
            ) : result ? (
               <ResultsView 
                 result={result} 
                 isFavorite={isFavorite}
                 onRequestSave={handleRequestSave}
               />
            ) : (
                <div className="text-center py-20 opacity-50">
                    <div className="bg-slate-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search size={40} className="text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-bold text-lg">還沒開始搜尋喔！</p>
                    <button onClick={() => setView('search')} className="mt-4 text-blue-500 underline font-bold">去探索頁面</button>
                </div>
            )}
          </div>
        )}

        {/* --- View: Favorites --- */}
        {view === 'favorites' && (
          <div className="animate-fade-in space-y-6 pb-20">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <span className="bg-pink-100 p-2 rounded-xl text-pink-500"><FolderHeart size={24} /></span>
                我的收藏夾
            </h2>

            {categories.map(cat => (
                <div key={cat.id} className="bg-white rounded-[2rem] border-4 border-slate-100 overflow-hidden">
                    <div 
                        onClick={() => toggleCollapse(cat.id)}
                        className="bg-slate-50 p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-slate-400">
                                {cat.collapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                            </span>
                            <span className="text-lg font-black text-slate-700">{cat.name}</span>
                            <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {cat.items.length}
                            </span>
                        </div>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => openRenameModal(cat)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
                                <Edit2 size={16} />
                            </button>
                            {cat.id !== 'home' && cat.id !== 'work' && cat.id !== 'default' && (
                                <button onClick={() => deleteCategory(cat.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {!cat.collapsed && (
                        <div className="p-4 grid gap-4">
                            {cat.items.length === 0 ? (
                                <p className="text-center text-slate-400 text-sm py-4 font-bold">還沒有收藏任何店家</p>
                            ) : (
                                cat.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-2xl border-2 border-slate-100 shadow-sm hover:border-pink-200 transition-colors group">
                                        <div className="p-3 bg-orange-50 rounded-xl text-orange-500">
                                            <StoreItemIcon />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 truncate">{item.title}</h4>
                                            <a href={item.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 flex items-center gap-1 hover:underline mt-0.5">
                                                開啟地圖 <ExternalLink size={10} />
                                            </a>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => openMoveModal(cat.id, item)}
                                                className="p-2 bg-slate-50 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                                                title="移動到其他分類"
                                            >
                                                <ArrowLeftRight size={16} />
                                            </button>
                                            <button 
                                                onClick={() => removeItem(cat.id, item.uri)}
                                                className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                title="移除"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            ))}
          </div>
        )}
      </main>
      
      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t-2 border-slate-100 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-around items-center p-2">
              <button 
                 onClick={() => setView('search')}
                 className={`flex flex-col items-center gap-1 p-2 rounded-xl w-full transition-colors ${view === 'search' ? 'text-slate-900 bg-yellow-100' : 'text-slate-400'}`}
              >
                  <Search size={24} strokeWidth={view === 'search' ? 3 : 2} />
                  <span className="text-[10px] font-black">探索</span>
              </button>
              <button 
                 onClick={() => setView('results')}
                 disabled={!hasSearched && !loading}
                 className={`flex flex-col items-center gap-1 p-2 rounded-xl w-full transition-colors ${view === 'results' ? 'text-slate-900 bg-yellow-100' : (!hasSearched && !loading) ? 'text-slate-200' : 'text-slate-400'}`}
              >
                  {loading ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} strokeWidth={view === 'results' ? 3 : 2} />}
                  <span className="text-[10px] font-black">結果</span>
              </button>
              <button 
                 onClick={() => setView('favorites')}
                 className={`flex flex-col items-center gap-1 p-2 rounded-xl w-full transition-colors ${view === 'favorites' ? 'text-pink-500 bg-pink-50' : 'text-slate-400'}`}
              >
                  <Heart size={24} fill={view === 'favorites' ? "currentColor" : "none"} strokeWidth={view === 'favorites' ? 3 : 2} />
                  <span className="text-[10px] font-black">收藏</span>
              </button>
          </div>
      </div>

      {/* --- Modals (Keep unchanged) --- */}
      {/* --- Modal: Add Favorite --- */}
      {isModalOpen && restaurantToSave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl border-4 border-white">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Heart className="text-pink-500 fill-pink-500" /> 
                      收藏店家
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200">
                      <X size={20} />
                  </button>
              </div>
              
              <div className="mb-6 bg-orange-50 p-4 rounded-2xl border-2 border-orange-100">
                  <p className="font-bold text-slate-700">{restaurantToSave.title}</p>
              </div>

              {!isAddingCategory ? (
                  <div className="space-y-3">
                      <p className="text-sm font-bold text-slate-400 ml-1">選擇分類：</p>
                      {categories.map(cat => (
                          <button 
                             key={cat.id}
                             onClick={() => saveToCategory(cat.id)}
                             className="w-full p-4 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 font-bold text-slate-600 flex items-center gap-3 transition-colors text-left"
                          >
                              <FolderOpen size={18} />
                              {cat.name}
                          </button>
                      ))}
                      <button 
                         onClick={() => setIsAddingCategory(true)}
                         className="w-full p-4 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600 font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                          <Plus size={18} /> 新增分類
                      </button>
                  </div>
              ) : (
                  <div className="space-y-4">
                      <input 
                         autoFocus
                         type="text" 
                         placeholder="輸入新分類名稱 (例如: 甜點清單)"
                         value={newCategoryName}
                         onChange={e => setNewCategoryName(e.target.value)}
                         className="w-full p-4 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-yellow-400 focus:outline-none font-bold"
                      />
                      <div className="flex gap-3">
                          <button 
                             onClick={() => setIsAddingCategory(false)}
                             className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200"
                          >
                              返回
                          </button>
                          <button 
                             onClick={createCategoryAndSave}
                             disabled={!newCategoryName.trim()}
                             className="flex-1 py-3 rounded-xl font-bold text-slate-900 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50"
                          >
                              建立並收藏
                          </button>
                      </div>
                  </div>
              )}
           </div>
        </div>
      )}

      {/* --- Modal: Rename Category --- */}
      {isRenameModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm">
             <div className="bg-white rounded-[2rem] w-full max-w-sm p-6">
                <h3 className="text-xl font-black text-slate-800 mb-4">重新命名分類</h3>
                <input 
                   autoFocus
                   type="text" 
                   value={renameInput}
                   onChange={e => setRenameInput(e.target.value)}
                   className="w-full p-4 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-blue-400 focus:outline-none font-bold mb-4"
                />
                <div className="flex gap-3">
                    <button onClick={() => setIsRenameModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500">取消</button>
                    <button onClick={handleRename} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold">儲存</button>
                </div>
             </div>
          </div>
      )}

      {/* --- Modal: Move Item --- */}
      {isMoveModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm">
             <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 max-h-[80vh] overflow-y-auto">
                <h3 className="text-xl font-black text-slate-800 mb-2">移動收藏</h3>
                <p className="text-sm font-bold text-slate-400 mb-4">將 "{itemToMove?.item.title}" 移動到...</p>
                <div className="space-y-2">
                    {categories.map(cat => (
                         <button 
                             key={cat.id}
                             onClick={() => handleMove(cat.id)}
                             disabled={cat.id === itemToMove?.catId}
                             className={`w-full p-4 rounded-xl font-bold flex items-center gap-3 text-left
                                ${cat.id === itemToMove?.catId 
                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                                    : 'bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600'
                                }
                             `}
                          >
                              <FolderOpen size={18} />
                              {cat.name}
                              {cat.id === itemToMove?.catId && <span className="text-xs ml-auto">(目前)</span>}
                          </button>
                    ))}
                </div>
                <button onClick={() => setIsMoveModalOpen(false)} className="w-full mt-4 py-3 bg-slate-100 rounded-xl font-bold text-slate-500">取消</button>
             </div>
          </div>
      )}

      {/* --- Modal: Manual Location Input --- */}
      {isLocationModalOpen && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                 <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 border-4 border-slate-200 shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <div className="bg-pink-100 p-1.5 rounded-lg text-pink-500">
                                <MapPin size={20} />
                            </div>
                            手動輸入位置
                        </h3>
                        <button onClick={() => setIsLocationModalOpen(false)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <p className="text-slate-400 text-sm font-bold mb-4">覺得定位不準嗎？直接輸入地標或路名試試看！</p>
                    <p className="text-xs text-slate-400 mb-2 pl-1">例如：台北101、板橋大遠百、中山站...</p>
                    
                    <input 
                       autoFocus
                       type="text" 
                       value={tempAddressInput}
                       onChange={e => setTempAddressInput(e.target.value)}
                       placeholder="請輸入地點..."
                       className="w-full p-4 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-pink-400 focus:outline-none font-bold mb-6 text-lg"
                    />
                    
                    <div className="flex gap-3">
                        <button onClick={() => setIsLocationModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">取消</button>
                        <button onClick={handleSetManualLocation} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-lg active:scale-95">確認設定</button>
                    </div>
                 </div>
              </div>
        )}

    </div>
  );
}

// Simple Icon Component for List Items
const StoreItemIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
);