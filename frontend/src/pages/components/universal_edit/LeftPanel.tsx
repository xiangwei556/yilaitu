import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Coins } from 'lucide-react';
import { Editor } from './Editor';
import { Toolbar } from './Toolbar';
import { EditorMode, GenerationType, Point } from './types';

interface LeftPanelProps {
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  showGenerateSuccess: boolean;
  setShowGenerateSuccess: (value: boolean) => void;
  onResetRef: React.MutableRefObject<(() => void) | null>;
  onGeneratedData: (images: string[], taskId: string, generationParams?: any) => void;
  onLoadFromRecord?: (record: any) => void;
  onLoadFromRecordRef?: React.MutableRefObject<((record: any) => void) | null>;
  refreshImageRecordsRef?: React.MutableRefObject<(() => void) | null>;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  isGenerating,
  setIsGenerating,
  showGenerateSuccess,
  setShowGenerateSuccess,
  onResetRef,
  onGeneratedData,
  onLoadFromRecord,
  onLoadFromRecordRef,
  refreshImageRecordsRef
}) => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<EditorMode>(EditorMode.PENCIL);
  const [genType, setGenType] = useState<GenerationType>(GenerationType.INPAINT);
  const [brushSize, setBrushSize] = useState(25);
  const [scale, setScale] = useState(1.0);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);

  const [undoTrigger, setUndoTrigger] = useState(0);
  const [redoTrigger, setRedoTrigger] = useState(0);
  const [clearTrigger, setClearTrigger] = useState(0);

  const doodleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.state && (location.state as any).initialImage) {
      setImage((location.state as any).initialImage);
      // Clear the state so it doesn't persist if we navigate away and back without a new image
      // window.history.replaceState({}, document.title); 
    }
  }, [location]);

  // 生图记录
  const [historyImages] = useState([
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBBBWee5XJU3NfGHSrlQMvTy_wQiHz3hiKYRU__m0_2YdDto-Udsmhg7OreW1ggLP36NHjnOeiqxUC3lIg1-6FfgCh5U9nydgK_m9GlUD-ozH8RbcDaHXorPkmeO1qINfiBA5wkMunBEKVSPxcttUKQU7N_5LP1-9xc17AoSXumxl5mewBD6SnpNuXgffBoZ9uz7C5sQgly2KvHBJZ9tsFMVIuxRCr94ymZYcTL6VAcSaBKnNCCuRyI6kAfYv_KYNnrynmVAXaa3aSf",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBXQ4WKCL9u82oUmzL03r-1D81Xm2NZ5abWXlIWo5YtE0xzHVck4a_fd59tzaCjbI9SFap8RRhY69vT94FJr0gJH7xSABRzObrtVYl7lboi0omei-64qLusxqf8Swz4uhwt2INSrw7LXbUZ2xI3kgg-6g6sXbYWGIfHgyjQlU3CWgV0C67Ni9PKEOD2Doubm8gW0exfwaMcNdrfosTcMAom0YEPTtLLB20t4fd3_VICUkTpukDRaepbZAxWJI2JJiypY9oBmTmaqR2u"
  ]);

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
    if (!image || !prompt || !doodleCanvasRef.current) {
      setError('请上传图片并输入描述');
      return;
    }
    setIsGenerating(true);
    setError(null);

    try {
      const doodleData = doodleCanvasRef.current.toDataURL('image/png');

      // 模拟 API 调用
      setTimeout(() => {
        const mockImages = Array.from({ length: 2 }, (_, i) =>
          `https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=universal%20edit%20${i + 1}&image_size=portrait_3_4`
        );
        const mockTaskId = Date.now().toString();

        const generationParams = {
          uploaded_image: image,
          edit_instruction: prompt,
          mask_data: doodleData,
          gen_type: genType
        };

        onGeneratedData(mockImages, mockTaskId, generationParams);
        setClearTrigger(prev => prev + 1);
        setPrompt('');
        setIsGenerating(false);
        setShowGenerateSuccess(true);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "发生意外错误。");
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setPrompt('');
    setMode(EditorMode.PENCIL);
    setScale(1.0);
    setPanOffset({ x: 0, y: 0 });
    setClearTrigger(prev => prev + 1);
  };

  React.useImperativeHandle(onResetRef, () => handleReset);

  return (
    <div className="flex h-full overflow-hidden">
      {/* 生图记录侧边栏 */}
      <aside className="w-16 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-shrink-0 z-10">
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 text-center">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 writing-vertical-lr mx-auto block py-2" style={{ writingMode: 'vertical-lr' }}>生图记录</span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin-1px flex flex-col items-center p-2 space-y-3">
          {historyImages.map((src, i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-lg overflow-hidden border cursor-pointer relative group transition-all ${i === 0 ? 'border-primary/50' : 'border-transparent opacity-60 hover:opacity-100'}`}
              onClick={() => setImage(src)}
            >
              <img alt="History" className="w-full h-full object-cover" src={src} />
            </div>
          ))}
        </div>
      </aside>

      {/* 主编辑区域 */}
      <main className="flex-1 flex flex-col bg-background-light dark:bg-background-dark overflow-hidden relative">
        <div className="flex flex-col h-full gap-4 p-6">
          {/* 编辑器区域 */}
          <div className="flex-1 flex items-center justify-center overflow-hidden relative rounded-2xl min-h-0 bg-transparent">
            {image ? (
              <>
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

                {/* 缩放控制栏 */}
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
                    onClick={() => { setScale(1); setPanOffset({ x: 0, y: 0 }); }}
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
              </>
            ) : (
              /* 空白状态 - 上传图片提示 */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full max-w-2xl max-h-[500px] bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-all"
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-4xl text-primary">add_photo_alternate</span>
                </div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">点击上传图片</p>
                <p className="text-sm text-gray-500 mt-2">支持 JPG、PNG 格式</p>
              </div>
            )}
          </div>

          {/* 底部输入控制区 */}
          <div className="flex-shrink-0 z-20 w-full max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-[2rem] shadow-soft border border-gray-100 dark:border-gray-800 flex flex-col gap-4">
              <div className="w-full relative bg-gray-50 dark:bg-gray-800 rounded-2xl border border-transparent focus-within:border-primary/30 focus-within:bg-white dark:focus-within:bg-gray-900 transition-all duration-300">
                <div className="flex items-center h-[52px] py-3 px-4">
                  <span className="text-primary font-bold text-sm mt-px mr-1 shrink-0 select-none">
                    {genType === GenerationType.INPAINT ? '局部重绘' : '指令改图'}
                  </span>
                  <input
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
                    placeholder={genType === GenerationType.INPAINT ? "描述想重绘的内容" : "描述你想要修改的内容"}
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
                    className={`w-full max-w-xs h-11 px-6 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 ${isGenerating || !prompt || !image ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="font-bold text-base">{isGenerating ? '生成中...' : '立即生成'}</span>
                    <div className="flex items-center bg-white/20 rounded-full px-2 py-0.5">
                      <span className="text-xs font-bold mr-0.5">4</span>
                      <Coins className="w-3.5 h-3.5 text-yellow-300" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
            {error && <p className="text-center text-red-500 text-xs mt-2">{error}</p>}
          </div>
        </div>
      </main>

      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
};
