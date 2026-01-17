
import React, { useState, useCallback, useRef } from 'react';
import { ToolType, SegAlgorithm, InpaintHistory } from './types';
import EditorCanvas from './components/EditorCanvas';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HistoryBar from './components/HistoryBar';
import { generateInpaintedImage } from './services/geminiService';

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolType>('smart-select');
  const [segAlgo, setSegAlgo] = useState<SegAlgorithm>('edge-aware');
  const [brushSize, setBrushSize] = useState(30);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<InpaintHistory[]>([]);
  const [zoom, setZoom] = useState(100);
  
  const canvasRef = useRef<{ 
    getMaskDataUrl: () => string | null; 
    clearMask: () => void;
    undo: () => void;
    resetTransform: () => void;
    fitToScreen: () => void;
    canUndo: boolean;
  } | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        if (canvasRef.current) canvasRef.current.clearMask();
        setZoom(100);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(500, prev + 10));
  const handleZoomOut = () => setZoom(prev => Math.max(10, prev - 10));

  const handleGenerate = async () => {
    if (!image || !prompt || isProcessing) return;
    const maskDataUrl = canvasRef.current?.getMaskDataUrl();
    if (!maskDataUrl) {
      alert("请先选择或涂抹重绘区域");
      return;
    }

    setIsProcessing(true);
    try {
      const resultImageUrl = await generateInpaintedImage(image, maskDataUrl, prompt);
      if (resultImageUrl) {
        setHistory(prev => [{
          imageUrl: resultImageUrl,
          maskUrl: maskDataUrl,
          prompt,
          timestamp: Date.now()
        }, ...prev]);
        setImage(resultImageUrl);
        canvasRef.current?.clearMask();
        setPrompt('');
      }
    } catch (error) {
      console.error("Inpainting failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full select-none bg-background-light dark:bg-background-dark">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <HistoryBar history={history} onSelect={(item) => setImage(item.imageUrl)} />
        
        <main className="flex-1 flex flex-col p-6 overflow-hidden relative">
          <div className="flex flex-col h-full gap-4">
            
            <div className="flex-1 flex items-center justify-center overflow-hidden relative rounded-3xl bg-white/40 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800/50 shadow-inner">
              {image ? (
                <>
                  <EditorCanvas 
                    ref={canvasRef}
                    imageUrl={image} 
                    tool={tool} 
                    segAlgo={segAlgo}
                    brushSize={brushSize}
                    setBrushSize={setBrushSize}
                    setTool={setTool}
                    zoom={zoom}
                    onZoomChange={setZoom}
                  />
                  
                  {/* 缩放控制条 */}
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl px-4 py-2 rounded-full shadow-2xl border border-white/20 z-30 gap-4">
                    <div className="flex items-center gap-1 border-r border-gray-200/50 dark:border-gray-700/50 pr-4">
                      <button 
                        onClick={handleZoomOut} 
                        className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full transition-all"
                        title="缩小"
                      >
                        <span className="material-symbols-outlined text-xl">zoom_out</span>
                      </button>
                      <span className="text-xs font-black w-14 text-center text-gray-700 dark:text-gray-300 tabular-nums">
                        {Math.round(zoom)}%
                      </span>
                      <button 
                        onClick={handleZoomIn} 
                        className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full transition-all"
                        title="放大"
                      >
                        <span className="material-symbols-outlined text-xl">zoom_in</span>
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => canvasRef.current?.resetTransform()}
                        className="text-[10px] font-black px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-all"
                      >
                        1:1
                      </button>
                      <button 
                        onClick={() => canvasRef.current?.fitToScreen()}
                        className="text-[10px] font-black px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-all"
                      >
                        自适应
                      </button>
                    </div>
                  </div>

                  {/* 左侧：智能工具栏 */}
                  <div className="absolute top-8 left-8 flex flex-col gap-4 z-30">
                     <div className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl p-2 rounded-3xl shadow-2xl border border-white/20 flex flex-col gap-1.5">
                        {[
                          { id: 'smart-select', icon: 'auto_fix', label: '智能点选' },
                          { id: 'brush', icon: 'brush', label: '自由涂抹' },
                        ].map(t => (
                          <button 
                            key={t.id}
                            onClick={() => setTool(t.id as ToolType)}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${tool === t.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-100'}`}
                          >
                            <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                            {t.label}
                          </button>
                        ))}
                     </div>

                     <div className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl p-3 rounded-3xl shadow-2xl border border-white/20">
                        <p className="text-[10px] font-black text-primary/40 mb-3 px-1 uppercase tracking-widest flex items-center gap-1">
                          <span className="w-1 h-1 bg-primary rounded-full"></span>
                          边缘感知策略
                        </p>
                        <div className="flex flex-col gap-1">
                          {[
                            { id: 'edge-aware', name: '深度感知 (Lab)', desc: '基于视觉色差的高精度填充' },
                            { id: 'connected', name: '连通区域', desc: '选中物理相连的色块' },
                            { id: 'global', name: '全图匹配', desc: '跨区域选中相似颜色' }
                          ].map(algo => (
                            <button 
                              key={algo.id}
                              onClick={() => setSegAlgo(algo.id as SegAlgorithm)}
                              className={`text-left px-4 py-3 rounded-2xl transition-all ${segAlgo === algo.id ? 'bg-primary/5 text-primary' : 'hover:bg-gray-100'}`}
                            >
                              <div className="text-xs font-black">{algo.name}</div>
                              <div className={`text-[10px] mt-0.5 ${segAlgo === algo.id ? 'text-primary/60' : 'text-gray-400'}`}>{algo.desc}</div>
                            </button>
                          ))}
                        </div>
                     </div>
                  </div>

                  {/* 右侧：操作手柄 */}
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl rounded-full shadow-2xl border border-white/20 py-8 px-4 z-30 gap-8">
                    <div className="flex flex-col gap-5">
                       <button 
                         onClick={() => setTool('brush')}
                         className={`p-3 rounded-full transition-all ${tool === 'brush' ? 'bg-primary text-white scale-110 shadow-lg' : 'text-gray-400 hover:text-primary'}`}
                       >
                         <span className="material-symbols-outlined text-[28px]">brush</span>
                       </button>

                       <div className="group relative h-40 flex items-center justify-center">
                          <div className="h-full w-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative">
                             <div className="absolute bottom-0 w-full bg-primary transition-all duration-300" style={{ height: `${(brushSize/150)*100}%` }}></div>
                          </div>
                          <input 
                            className="absolute inset-0 opacity-0 cursor-pointer h-full" 
                            max="150" min="5" 
                            type="range" 
                            style={{ transform: 'rotate(-90deg)', width: '160px' }}
                            value={brushSize} 
                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                          />
                       </div>

                       <button 
                         onClick={() => setTool('eraser')}
                         className={`p-3 rounded-full transition-all ${tool === 'eraser' ? 'bg-primary text-white scale-110 shadow-lg' : 'text-gray-400 hover:text-primary'}`}
                       >
                         <span className="material-symbols-outlined text-[28px]">ink_eraser</span>
                       </button>
                    </div>

                    <div className="w-10 h-px bg-gray-200/50 dark:bg-gray-700/50"></div>

                    <div className="flex flex-col gap-4">
                       <button 
                         onClick={() => canvasRef.current?.undo()}
                         disabled={!canvasRef.current?.canUndo}
                         className={`p-3 rounded-full transition-all ${canvasRef.current?.canUndo ? 'text-gray-600 hover:bg-primary/10 hover:text-primary' : 'text-gray-200'}`}
                       >
                         <span className="material-symbols-outlined text-[28px]">undo</span>
                       </button>
                       <button 
                         onClick={() => canvasRef.current?.clearMask()}
                         className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                       >
                         <span className="material-symbols-outlined text-[28px]">delete_sweep</span>
                       </button>
                    </div>
                  </div>

                  {/* 底部：快捷提示 */}
                  <div className="absolute bottom-8 right-8 flex gap-3 z-30 opacity-60 hover:opacity-100 transition-opacity">
                     <div className="flex gap-1">
                       <span className="px-2 py-1 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 text-[10px] font-bold text-gray-500">[ / ] 调节大小</span>
                       <span className="px-2 py-1 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 text-[10px] font-bold text-gray-500">Space 拖拽</span>
                       <span className="px-2 py-1 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800 text-[10px] font-bold text-gray-500">Ctrl+Z 撤销</span>
                     </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-8">
                  <div className="w-24 h-24 rounded-[3rem] bg-primary/5 border-2 border-primary/10 flex items-center justify-center animate-pulse shadow-2xl shadow-primary/10">
                    <span className="material-symbols-outlined text-primary text-5xl">auto_fix_high</span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-black mb-2 tracking-tight">AI 智能重绘</h3>
                    <p className="text-sm text-gray-400 font-medium max-w-xs">基于 CIELAB 色差感知与 Gemini 超视觉模型</p>
                  </div>
                  <label className="group relative inline-flex items-center justify-center px-10 py-4 font-black text-white transition-all duration-300 bg-primary rounded-full cursor-pointer hover:bg-primary-hover shadow-2xl shadow-primary/30 hover:shadow-primary/50">
                    <span>上传图片开启创作</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </div>
              )}
            </div>

            {/* 输入交互区 */}
            <div className="flex-shrink-0 w-full max-w-5xl mx-auto">
              <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl p-6 rounded-[3rem] shadow-2xl border border-white/20 flex flex-col gap-6">
                <div className="w-full relative bg-gray-50/80 dark:bg-gray-800/80 rounded-[2rem] border-2 border-transparent focus-within:border-primary/20 focus-within:bg-white dark:focus-within:bg-gray-950 transition-all duration-500 group">
                  <div className="flex items-start min-h-[120px] py-6 px-8">
                    <div className="mr-6 flex flex-col items-center gap-2 mt-1">
                       <span className="material-symbols-outlined text-primary text-2xl group-focus-within:animate-bounce">edit_note</span>
                       <div className="h-8 w-[2px] bg-primary/10 rounded-full"></div>
                    </div>
                    <textarea 
                      className="w-full bg-transparent border-none focus:ring-0 resize-none h-full p-0 text-lg text-gray-900 dark:text-gray-100 placeholder-gray-300 font-bold leading-relaxed custom-scrollbar" 
                      placeholder="想对选中区域做什么？例如：把这件上衣改成带有刺绣图案的深蓝色西装..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-3 overflow-hidden p-1">
                      {[1,2,3].map(i => <img key={i} className="inline-block h-8 w-8 rounded-full ring-4 ring-white dark:ring-gray-900" src={`https://picsum.photos/40/40?random=${i+10}`} alt=""/>)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Powered By</span>
                      <span className="text-xs font-black text-primary">Gemini 2.5 Flash Image</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleGenerate}
                    disabled={!image || !prompt || isProcessing}
                    className={`min-w-[240px] h-16 px-10 rounded-full shadow-2xl transition-all duration-500 flex items-center justify-center gap-4 font-black text-xl tracking-tight
                      ${!image || !prompt || isProcessing ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none' : 'bg-primary hover:bg-primary-hover text-white shadow-primary/40 active:scale-95'}
                    `}
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>正在重绘...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-2xl">auto_fix_high</span>
                        <span>立即生成</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <style>{`
        @keyframes hud-fade {
          0% { opacity: 0; transform: translateY(10px) scale(0.9); }
          10% { opacity: 1; transform: translateY(0) scale(1); }
          80% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-10px) scale(0.9); }
        }
        .animate-hud {
          animation: hud-fade 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
