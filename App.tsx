
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Music, Search, Plus, ListMusic, 
  Repeat, Shuffle, Heart, MoreHorizontal, FolderSearch,
  ChevronDown, AlertCircle, PlayCircle, Settings, SlidersHorizontal,
  Trash2, Info, Moon, Sun, CheckCircle2, RotateCcw, X, 
  BarChart3, Activity, HardDrive
} from 'lucide-react';
import { Track } from './types';

const PRESETS = {
  Flat: [0, 0, 0, 0, 0],
  Rock: [5, 3, -1, 3, 5],
  Pop: [-2, 1, 3, 2, -1],
  Bass: [8, 5, 0, 0, 0],
  Electro: [4, 2, 0, 3, 4],
  Vocal: [-3, -2, 4, 5, 2]
};

const App: React.FC = () => {
  // --- Estados de Audio ---
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- Estados de UI ---
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEqOpen, setIsEqOpen] = useState(false);
  const [librarySize, setLibrarySize] = useState<string>("0 MB");

  // --- Estados de Ecualizador ---
  const [eqGains, setEqGains] = useState<number[]>(PRESETS.Flat);
  const [activePreset, setActivePreset] = useState<string>('Flat');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);

  const currentTrack = currentTrackIndex >= 0 ? tracks[currentTrackIndex] : null;

  // --- Web Audio API Setup ---
  useEffect(() => {
    if (audioRef.current && !audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaElementSource(audioRef.current);
      const frequencies = [60, 230, 910, 4000, 14000];
      
      const filters = frequencies.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        if (i === 0) filter.type = 'lowshelf';
        else if (i === frequencies.length - 1) filter.type = 'highshelf';
        else filter.type = 'peaking';
        
        filter.frequency.value = freq;
        filter.Q.value = 1.2;
        filter.gain.value = eqGains[i];
        return filter;
      });

      source.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      filters[filters.length - 1].connect(ctx.destination);
      filtersRef.current = filters;
    }
  }, [audioRef.current]);

  useEffect(() => {
    filtersRef.current.forEach((filter, i) => {
      filter.gain.setTargetAtTime(eqGains[i], audioCtxRef.current?.currentTime || 0, 0.1);
    });
  }, [eqGains]);

  const updateEq = (index: number, value: number) => {
    const newGains = [...eqGains];
    newGains[index] = value;
    setEqGains(newGains);
    setActivePreset('Personalizado');
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
  };

  const applyPreset = (name: keyof typeof PRESETS) => {
    setEqGains(PRESETS[name]);
    setActivePreset(name);
  };

  // --- Gestión de Reproducción ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
        if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  const startAutoScan = () => {
    if (folderInputRef.current) folderInputRef.current.click();
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;
    
    setIsScanning(true);
    let totalBytes = 0;
    
    const mp3Tracks: Track[] = files
      .filter(f => f.name.toLowerCase().endsWith('.mp3'))
      .map(file => {
        totalBytes += file.size;
        return {
          id: Math.random().toString(36).substring(2, 11) + Date.now(),
          name: file.name.replace(/\.[^/.]+$/, ""),
          artist: 'Archivo Local',
          album: 'Memoria Interna',
          duration: 0,
          url: URL.createObjectURL(file),
          file: file,
          addedAt: Date.now()
        };
      });

    setLibrarySize((totalBytes / (1024 * 1024)).toFixed(1) + " MB");
    setTracks(mp3Tracks);
    setHasPermission(true);
    setTimeout(() => setIsScanning(false), 1500);
  };

  const playTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
    setProgress(0);
  };

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
  }, [tracks.length]);

  const prevTrack = () => {
    if (tracks.length === 0) return;
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredTracks = useMemo(() => 
    tracks.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [tracks, searchQuery]
  );

  // --- Vistas ---

  if (!hasPermission && !isScanning) {
    return (
      <div className="h-screen flex items-center justify-center bg-black p-8 font-sans">
        <div className="max-w-sm w-full bg-[#111] rounded-[50px] p-12 flex flex-col items-center text-center shadow-2xl border border-white/5">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[30px] flex items-center justify-center mb-10 shadow-xl shadow-blue-500/20">
            <FolderSearch size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-black mb-4 tracking-tighter">Explorador MP3</h1>
          <p className="text-gray-500 mb-12 text-lg">
            Escaneo automático de tu memoria local para organizar tu música al instante.
          </p>
          <button 
            onClick={startAutoScan}
            className="w-full py-5 bg-white text-black font-black rounded-3xl text-xl active:scale-95 transition-all shadow-xl"
          >
            Escanear Carpeta
          </button>
          <input 
            type="file" 
            ref={folderInputRef} 
            className="hidden" 
            // @ts-ignore
            webkitdirectory="" 
            directory="" 
            multiple 
            onChange={handleFolderSelect} 
          />
        </div>
      </div>
    );
  }

  if (isScanning) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black">
        <div className="relative w-40 h-40 mb-10">
          <div className="absolute inset-0 border-2 border-blue-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity size={40} className="text-blue-500 animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-black tracking-tight mb-2">Indexando archivos...</h2>
        <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">Extrayendo metadatos de audio</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden select-none font-sans relative">
      <audio 
        ref={audioRef} 
        src={currentTrack?.url} 
        onTimeUpdate={() => setProgress(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={nextTrack}
      />

      {/* Main UI */}
      <main className={`flex-1 flex flex-col transition-all duration-500 ${isPlayerOpen ? 'scale-95 blur-sm' : 'scale-100'}`}>
        <header className="px-8 pt-16 pb-6 flex flex-col gap-6 sticky top-0 bg-black/80 backdrop-blur-2xl z-20 border-b border-white/5">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-black tracking-tighter">Mi Música</h1>
            <div className="flex gap-2">
              <button onClick={() => setIsEqOpen(true)} className="p-3 bg-[#111] rounded-full text-blue-500 border border-white/5">
                <SlidersHorizontal size={22} />
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-[#111] rounded-full text-gray-500 border border-white/5">
                <Settings size={22} />
              </button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
            <input 
              type="text"
              placeholder="Buscar en la biblioteca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111] border border-white/5 rounded-2xl py-4 pl-14 pr-6 outline-none text-lg focus:ring-1 ring-blue-500/30 transition-all"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 pb-40 pt-4">
          <div className="space-y-1">
            {filteredTracks.map((track) => {
              const globalIdx = tracks.findIndex(t => t.id === track.id);
              const isCurrent = globalIdx === currentTrackIndex;
              return (
                <div 
                  key={track.id}
                  onClick={() => playTrack(globalIdx)}
                  className={`flex items-center gap-4 p-4 rounded-[28px] cursor-pointer active:scale-[0.98] transition-all ${isCurrent ? 'bg-white/5 border border-white/10' : 'hover:bg-white/5'}`}
                >
                  <div className="w-14 h-14 bg-[#111] rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/5">
                    {isCurrent && isPlaying ? (
                       <div className="flex gap-1 items-end h-5">
                         <div className="w-1 bg-blue-500 animate-[bounce_0.6s_infinite_0.1s] rounded-full"></div>
                         <div className="w-1 bg-blue-500 animate-[bounce_0.6s_infinite_0.3s] rounded-full"></div>
                         <div className="w-1 bg-blue-500 animate-[bounce_0.6s_infinite_0.2s] rounded-full"></div>
                       </div>
                    ) : (
                      <Music size={24} className={isCurrent ? 'text-blue-500' : 'text-gray-800'} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-lg font-bold truncate ${isCurrent ? 'text-blue-500' : 'text-gray-200'}`}>{track.name}</h4>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Local Audio</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Mini Player */}
      {currentTrack && !isPlayerOpen && (
        <div 
          onClick={() => setIsPlayerOpen(true)}
          className="fixed bottom-6 left-6 right-6 h-22 bg-[#111]/90 backdrop-blur-2xl border border-white/10 rounded-[35px] flex items-center px-4 gap-4 shadow-2xl z-40 active:scale-95 transition-all animate-in slide-in-from-bottom"
        >
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
            <Music size={24} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-base font-black truncate">{currentTrack.name}</h5>
            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Reproduciendo</p>
          </div>
          <button 
            onClick={e => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
            className="w-12 h-12 flex items-center justify-center bg-white rounded-full text-black"
          >
            {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
          </button>
        </div>
      )}

      {/* REPRODUCTOR COMPLETO */}
      {isPlayerOpen && currentTrack && (
        <div className="fixed inset-0 z-50 bg-[#000] flex flex-col animate-in slide-in-from-bottom duration-500">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-black pointer-events-none" />
          
          <div className="p-10 pt-16 flex items-center justify-between z-10">
            <button onClick={() => setIsPlayerOpen(false)} className="p-4 bg-white/5 rounded-full">
              <ChevronDown size={32} />
            </button>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.4em] text-gray-600 font-black mb-1">Native Audio</p>
              <p className="text-sm font-bold">Modo Premium</p>
            </div>
            <button onClick={() => setIsEqOpen(true)} className="p-4 bg-white/5 rounded-full text-blue-500">
              <SlidersHorizontal size={28} />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center px-12 z-10">
            <div className="w-full aspect-square max-w-[340px] bg-[#0a0a0a] rounded-[60px] shadow-2xl flex items-center justify-center relative border border-white/5">
              <Music size={120} strokeWidth={1} className="text-[#111]" />
              {isPlaying && (
                <div className="absolute bottom-12 flex gap-1.5 h-12 items-end">
                   <div className="w-1.5 bg-blue-500 animate-[bounce_0.6s_infinite_0.1s] rounded-full"></div>
                   <div className="w-1.5 bg-blue-500 animate-[bounce_0.6s_infinite_0.3s] rounded-full"></div>
                   <div className="w-1.5 bg-blue-500 animate-[bounce_0.6s_infinite_0.2s] rounded-full"></div>
                   <div className="w-1.5 bg-blue-500 animate-[bounce_0.6s_infinite_0.4s] rounded-full"></div>
                </div>
              )}
            </div>
          </div>

          <div className="px-12 pb-24 z-10">
            <div className="mb-10">
              <h2 className="text-4xl font-black tracking-tighter mb-2 line-clamp-2 leading-[1.1]">{currentTrack.name}</h2>
              <p className="text-xl text-gray-600 font-bold">Archivo MP3 Local</p>
            </div>

            <div className="mb-10 space-y-4">
              <div className="relative h-2 flex items-center">
                <input 
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={progress}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (audioRef.current) audioRef.current.currentTime = val;
                    setProgress(val);
                  }}
                  className="w-full h-1.5 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                />
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-blue-500 rounded-full pointer-events-none"
                  style={{ width: `${(progress / (duration || 1)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-black font-mono text-gray-600">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 mb-10">
              <Shuffle size={24} className="text-gray-700" />
              <div className="flex items-center gap-8">
                <button onClick={prevTrack} className="active:scale-90 transition-transform">
                  <SkipBack size={48} className="fill-white" />
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all"
                >
                  {isPlaying ? <Pause size={48} className="fill-current" /> : <Play size={48} className="fill-current ml-2" />}
                </button>
                <button onClick={nextTrack} className="active:scale-90 transition-transform">
                  <SkipForward size={48} className="fill-white" />
                </button>
              </div>
              <Repeat size={24} className="text-gray-700" />
            </div>

            <div className="flex items-center gap-6 text-gray-600 bg-[#0a0a0a] p-5 rounded-[30px] border border-white/5">
              <VolumeX size={20} />
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />
              <Volume2 size={20} />
            </div>
          </div>
        </div>
      )}

      {/* ECUALIZADOR PANEL */}
      {isEqOpen && (
        <div className="fixed inset-0 z-[60] bg-black/98 backdrop-blur-3xl flex flex-col animate-in fade-in">
           <div className="p-10 pt-16 flex items-center justify-between">
             <button onClick={() => setIsEqOpen(false)} className="p-4 bg-white/5 rounded-full">
                <X size={28} />
             </button>
             <h3 className="text-2xl font-black">Ecualizador Pro</h3>
             <button onClick={() => applyPreset('Flat')} className="p-4 bg-white/5 rounded-full text-blue-500">
                <RotateCcw size={28} />
             </button>
           </div>

           <div className="flex-1 flex flex-col justify-center px-10 pb-20">
              <div className="flex justify-between items-end h-[300px] mb-16 gap-4">
                {eqGains.map((gain, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 h-full gap-4">
                    <div className="relative h-full w-2 bg-white/5 rounded-full flex items-center justify-center overflow-hidden">
                       <div className="absolute bottom-0 w-full bg-blue-500/20" style={{ height: `${((gain + 12) / 24) * 100}%` }}></div>
                       <input 
                         type="range"
                         min="-12"
                         max="12"
                         step="1"
                         value={gain}
                         onChange={(e) => updateEq(i, parseInt(e.target.value))}
                         className="absolute inset-0 w-[300px] -rotate-90 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white"
                         style={{ transform: 'rotate(-90deg)' }}
                       />
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 uppercase">
                      {['60', '230', '910', '4k', '14k'][i]}
                    </span>
                    <span className="text-xs font-black text-blue-500">{gain > 0 ? `+${gain}` : gain}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                 {Object.keys(PRESETS).map((p) => (
                   <button 
                     key={p}
                     onClick={() => applyPreset(p as any)}
                     className={`py-4 rounded-2xl font-black text-xs border transition-all ${activePreset === p ? 'bg-blue-600 border-blue-400' : 'bg-[#111] border-white/5 text-gray-500'}`}
                   >
                     {p}
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* AJUSTES PANEL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-in slide-in-from-right">
           <header className="p-10 pt-16 flex items-center gap-6 border-b border-white/5">
             <button onClick={() => setIsSettingsOpen(false)} className="p-4 bg-white/5 rounded-full">
                <ChevronDown className="rotate-90" />
             </button>
             <h3 className="text-3xl font-black">Ajustes</h3>
           </header>

           <div className="flex-1 overflow-y-auto p-8 space-y-10">
              <section>
                <h4 className="text-[10px] font-black text-gray-700 uppercase tracking-[0.3em] mb-6">Biblioteca</h4>
                <div className="space-y-3">
                   <div className="bg-[#111] p-6 rounded-[35px] flex items-center justify-between border border-white/5">
                      <div className="flex items-center gap-4">
                        <HardDrive className="text-blue-500" />
                        <div>
                          <p className="font-bold">Tamaño Total</p>
                          <p className="text-xs text-gray-600">{librarySize} en uso</p>
                        </div>
                      </div>
                      <BarChart3 size={20} className="text-gray-800" />
                   </div>
                   <button 
                    onClick={() => { setTracks([]); setHasPermission(false); setIsSettingsOpen(false); }}
                    className="w-full bg-red-500/5 p-6 rounded-[35px] flex items-center gap-4 text-red-500 border border-red-500/10 active:scale-95 transition-all"
                   >
                      <Trash2 />
                      <span className="font-bold">Resetear Biblioteca</span>
                   </button>
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-black text-gray-700 uppercase tracking-[0.3em] mb-6">Optimización</h4>
                <div className="bg-[#111] p-6 rounded-[35px] flex items-center justify-between border border-white/5">
                    <div className="flex items-center gap-4">
                      <Moon className="text-indigo-400" />
                      <p className="font-bold">Ahorro de batería</p>
                    </div>
                    <div className="w-12 h-6 bg-blue-600 rounded-full flex items-center px-1">
                       <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                    </div>
                </div>
              </section>

              <div className="p-10 text-center opacity-20">
                 <p className="text-[10px] font-black uppercase tracking-widest mb-2">Build 2024.1.0</p>
                 <p className="text-xs font-bold">Hecho para AppCreator24</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
