
import React, { useState, useRef } from 'react';
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import { EditorMode, GenerationType, Point } from './types';
import { generateInpaint } from './services/geminiService';

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>("https://lh3.googleusercontent.com/aida-public/AB6AXuBXQ4WKCL9u82oUmzL03r-1D81Xm2NZ5abWXlIWo5YtE0xzHVck4a_fd59tzaCjbI9SFap8RRhY69vT94FJr0gJH7xSABRzObrtVYl7lboi0omei-64qLusxqf8Swz4uhwt2INSrw7LXbUZ2xI3kgg-6g6sXbYWGIfHgyjQlU3CWgV0C67Ni9PKEOD2Doubm8gW0exfwaMcNdrfosTcMAom0YEPTtLLB20t4fd3_VICUkTpukDRaepbZAxWJI2JJiypY9oBmTmaqR2u");
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<EditorMode>(EditorMode.PENCIL);
  const [genType, setGenType] = useState<GenerationType>(GenerationType.INPAINT);
  const [brushSize, setBrushSize] = useState(25);
  const [scale, setScale] = useState(1.0);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [undoTrigger, setUndoTrigger] = useState(0);
  const [redoTrigger, setRedoTrigger] = useState(0);
  const [clearTrigger, setClearTrigger] = useState(0);

  const doodleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImage(ev.target?.result as string);
        setMode(EditorMode.PENCIL);
        setScale(1.0);
        setPanOffset({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!image || !prompt || !doodleCanvasRef.current) return;
    setIsGenerating(true);
    setError(null);
    try {
      const doodleData = doodleCanvasRef.current.toDataURL('image/png');
      const result = await generateInpaint(image, doodleData, prompt);
      if (result) {
        setImage(result);
        setClearTrigger(prev => prev + 1);
        setPrompt('');
      } else {
        setError("生成失败，请重试。");
      }
    } catch (err: any) {
      setError(err.message || "发生意外错误。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full font-display bg-background-light dark:bg-background-dark text-gray-900 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-30 relative flex-shrink-0">
        <div className="flex items-center space-x-2">
          <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">衣来图</h1>
        </div>
        <div className="flex items-center space-x-4 text-sm font-medium text-gray-600 dark:text-gray-300">
          <div className="flex items-center space-x-6 mr-2">
            <a className="hover:text-primary transition-colors cursor-pointer">联系客服</a>
            <a className="hover:text-primary transition-colors cursor-pointer">帮助中心</a>
            <a className="hover:text-primary transition-colors cursor-pointer">小程序</a>
          </div>
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700"></div>
          <div className="relative group ml-2 cursor-pointer">
            <button className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative outline-none">
              <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">notifications</span>
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900"></span>
            </button>
          </div>
          <div className="flex items-center bg-primary/5 dark:bg-primary/20 rounded-full pl-5 pr-1 py-1 border border-primary/10 dark:border-primary/30 ml-3">
            <div className="flex items-center mr-3 gap-1.5">
              <span className="material-symbols-outlined text-[20px] text-yellow-500 drop-shadow-sm">monetization_on</span>
              <div className="flex flex-col items-start leading-none justify-center">
                <span className="text-[10px] text-primary/70 dark:text-primary/60 font-medium mb-0.5">我的积分</span>
                <span className="text-sm font-bold text-primary dark:text-primary-300">1,250</span>
              </div>
            </div>
            <a className="px-4 py-2 text-xs font-bold text-white bg-primary rounded-full shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 transition-all flex items-center cursor-pointer">
              <span className="material-symbols-outlined text-sm mr-1">diamond</span>
              开通会员
            </a>
          </div>
          <div className="ml-3">
            <button className="flex items-center justify-center w-9 h-9 rounded-full ring-2 ring-gray-100 dark:ring-gray-700 hover:ring-primary/30 transition-all overflow-hidden focus:outline-none group">
              <img alt="User Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8yBPT0ZRKatvwk4PbtsuE2E1pa_aKPg7O7xr9K4g6cbvyyl5SKkslyELO6z7OjkmJo6uptCrevDiBdCvqqs8FtI0GwqV4U4PtJ1YnHt5WuBmzh1PQfwVjU4h1BFNhutdVLXvkj__QCVBEZr0afyj4cQjlkMimslZK2Po5Q7MmHjrReFOwuQ-ANUTP6VP74DyYrPD26NwzrBwcI0kmQcHz6pcDspZGdpVYaIIxxHDzkB6nWYXjzGV0PK6P_-qJQJfTmOJvcwE7hI_1"/>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside className="w-60 bg-white dark:bg-gray-900 p-4 flex flex-col justify-between flex-shrink-0 border-r border-gray-100 dark:border-gray-800 z-20">
          <nav className="flex flex-col space-y-2">
            {[
              { icon: 'home', label: '首页' },
              { icon: 'auto_awesome', label: '模特图生成' },
              { icon: 'texture', label: '白底图生成' },
              { icon: 'swap_horiz', label: '模特换装' },
              { icon: 'face_retouching_natural', label: '模特换脸' },
              { icon: 'accessibility_new', label: '姿势裂变' },
              { icon: 'color_lens', label: '服装换色' },
              { icon: 'photo_size_select_large', label: '扩图' },
              { icon: 'hd', label: '变清晰' },
              { icon: 'auto_fix_high', label: '万能改图', active: true },
              { icon: 'badge', label: '模特管理', sym: true },
              { icon: 'history', label: '生图记录' }
            ].map((item) => (
              <a key={item.label} className={`flex items-center px-4 py-3 rounded-lg transition-colors cursor-pointer ${item.active ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <span className={`${item.sym ? 'material-symbols-outlined' : 'material-icons-outlined'} mr-3`}>{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* History Aside */}
        <aside className="w-16 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-shrink-0 z-10">
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 text-center">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 writing-vertical-lr mx-auto block py-2">生图记录</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center p-2 space-y-3">
            {[
              "https://lh3.googleusercontent.com/aida-public/AB6AXuBBBWee5XJU3NfGHSrlQMvTy_wQiHz3hiKYRU__m0_2YdDto-Udsmhg7OreW1ggLP36NHjnOeiqxUC3lIg1-6FfgCh5U9nydgK_m9GlUD-ozH8RbcDaHXorPkmeO1qINfiBA5wkMunBEKVSPxcttUKQU7N_5LP1-9xc17AoSXumxl5mewBD6SnpNuXgffBoZ9uz7C5sQgly2KvHBJZ9tsFMVIuxRCr94ymZYcTL6VAcSaBKnNCCuRyI6kAfYv_KYNnrynmVAXaa3aSf",
              "https://lh3.googleusercontent.com/aida-public/AB6AXuBXQ4WKCL9u82oUmzL03r-1D81Xm2NZ5abWXlIWo5YtE0xzHVck4a_fd59tzaCjbI9SFap8RRhY69vT94FJr0gJH7xSABRzObrtVYl7lboi0omei-64qLusxqf8Swz4uhwt2INSrw7LXbUZ2xI3kgg-6g6sXbYWGIfHgyjQlU3CWgV0C67Ni9PKEOD2Doubm8gW0exfwaMcNdrfosTcMAom0YEPTtLLB20t4fd3_VICUkTpukDRaepbZAxWJI2JJiypY9oBmTmaqR2u"
            ].map((src, i) => (
              <div key={i} className={`w-10 h-10 rounded-lg overflow-hidden border cursor-pointer relative group transition-all ${i===0 ? 'border-primary/50' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                <img alt="History" className="w-full h-full object-cover" src={src}/>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col bg-background-light dark:bg-background-dark p-6 overflow-hidden relative">
          <div className="flex flex-col h-full gap-4">
            <div className="flex-1 flex items-center justify-center overflow-hidden relative rounded-2xl min-h-0 bg-transparent">
              <Toolbar 
                mode={mode} setMode={setMode}
                brushSize={brushSize} setBrushSize={setBrushSize}
                onUndo={() => setUndoTrigger(prev => prev + 1)}
                onRedo={() => setRedoTrigger(prev => prev + 1)}
                onClear={() => setClearTrigger(prev => prev + 1)}
                canUndo={true} canRedo={true}
              />

              <div className="relative max-h-full max-w-full group flex items-center justify-center w-full h-full">
                <Editor 
                  image={image} mode={mode}
                  brushSize={brushSize}
                  scale={scale}
                  panOffset={panOffset}
                  setPanOffset={setPanOffset}
                  undoTrigger={undoTrigger} redoTrigger={redoTrigger} clearTrigger={clearTrigger}
                  onStateChange={(canvas) => doodleCanvasRef.current = canvas}
                />
                
                {isGenerating && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-40 flex flex-col items-center justify-center rounded-lg">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="mt-4 text-primary font-bold">AI 正在努力生成中...</span>
                  </div>
                )}
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-full shadow-soft border border-gray-200 dark:border-gray-700/50 flex items-center p-1 gap-2 z-30">
                <button 
                  onClick={() => setScale(prev => Math.min(5, prev + 0.2))}
                  className="tooltip w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  <span className="tooltip-text">放大</span>
                </button>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-300 w-12 text-center select-none">{Math.round(scale * 100)}%</div>
                <button 
                  onClick={() => setScale(prev => Math.max(1, prev - 0.2))}
                  className="tooltip w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">remove</span>
                  <span className="tooltip-text">缩小</span>
                </button>
                <button 
                  onClick={() => { setScale(1); setPanOffset({x:0,y:0}); }}
                  className="tooltip w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">restart_alt</span>
                  <span className="tooltip-text">复位</span>
                </button>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                <button 
                  onClick={() => setMode(EditorMode.DRAG)}
                  className={`tooltip w-8 h-8 flex items-center justify-center rounded-full transition-colors ${mode === EditorMode.DRAG ? 'text-primary' : 'text-gray-600'}`}
                >
                  <span className="material-symbols-outlined">pan_tool</span>
                  <span className="tooltip-text">拖动</span>
                </button>
              </div>
            </div>

            <div className="flex-shrink-0 z-20 w-full max-w-4xl mx-auto">
              <div className="bg-white dark:bg-gray-900 p-4 rounded-[2rem] shadow-soft border border-gray-100 dark:border-gray-800 flex flex-col gap-4">
                <div className="w-full relative bg-gray-50 dark:bg-gray-800 rounded-2xl border border-transparent focus-within:border-primary/30 focus-within:bg-white dark:focus-within:bg-gray-900 transition-all duration-300">
                  <div className="flex items-center h-[52px] py-3 px-4">
                    <span className="text-primary font-bold text-sm mt-px mr-1 shrink-0 select-none">局部重绘</span>
                    <input 
                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400" 
                      placeholder="描述想重绘的内容" 
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center gap-4 px-1">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">image</span>
                      <span>添加图片</span>
                    </button>
                    <div className="bg-gray-50 dark:bg-gray-800 p-1 rounded-full flex items-center w-[300px] relative">
                      <button 
                        onClick={() => setGenType(GenerationType.INSTRUCT)}
                        className={`flex-1 px-5 py-2 text-sm transition-all rounded-full z-10 ${genType === GenerationType.INSTRUCT ? 'font-bold text-primary bg-white dark:bg-gray-700 shadow-sm ring-1 ring-black/5' : 'font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                      >
                        指令改图
                      </button>
                      <button 
                        onClick={() => setGenType(GenerationType.INPAINT)}
                        className={`flex-1 px-5 py-2 text-sm transition-all rounded-full z-10 ${genType === GenerationType.INPAINT ? 'font-bold text-primary bg-white dark:bg-gray-700 shadow-sm ring-1 ring-black/5' : 'font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                      >
                        局部重绘
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-1 justify-end">
                    <button 
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt || !image}
                      className={`w-full max-w-xs h-11 px-6 bg-primary hover:bg-primary-hover text-white rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 ${isGenerating || !prompt || !image ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="font-bold text-base">立即生成</span>
                      <div className="flex items-center bg-white/20 rounded-full px-2 py-0.5">
                        <span className="text-xs font-bold mr-0.5">4</span>
                        <img src="/yidou.svg" alt="icon" className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
              {error && <p className="text-center text-red-500 text-xs mt-2">{error}</p>}
            </div>
          </div>
        </main>
      </div>

      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
};

export default App;
