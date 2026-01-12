import React, { useState, useRef } from 'react';
import { ImagePlus, Coins } from 'lucide-react';
import clsx from 'clsx';

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
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [editInstruction, setEditInstruction] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(2);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuantityClick = (quantity: number) => {
    setSelectedQuantity(quantity);
  };

  const handleGenerate = () => {
    if (!uploadedImage) {
      alert('请先上传图片');
      return;
    }

    if (!editInstruction.trim()) {
      alert('请输入修改指令');
      return;
    }

    console.log('=== 用户选择的内容 ===');
    console.log('上传的图片:', uploadedImage);
    console.log('修改指令:', editInstruction);
    console.log('生成的图片数量:', selectedQuantity);
    console.log('====================');

    setIsGenerating(true);

    const generationParams = {
      uploaded_image: uploadedImage,
      edit_instruction: editInstruction,
      quantity: selectedQuantity
    };

    setTimeout(() => {
      const mockImages = Array.from({ length: selectedQuantity }, (_, i) => 
        `https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=universal%20edit%20${i + 1}&image_size=portrait_3_4`
      );
      const mockTaskId = Date.now().toString();
      onGeneratedData(mockImages, mockTaskId, generationParams);
      setIsGenerating(false);
      setShowGenerateSuccess(true);
    }, 2000);
  };

  const handleReset = () => {
    setUploadedImage('');
    setEditInstruction('');
    setSelectedQuantity(2);
  };

  React.useImperativeHandle(onResetRef, () => handleReset);

  return (
    <div className="relative flex flex-col h-full bg-white w-[400px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h1 className="text-lg font-semibold">万能改图</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 custom-scrollbar">
        <div className="space-y-4">
          <div 
            onClick={handleUploadClick}
            className={clsx(
              "rounded-xl p-6 text-center flex flex-col items-center justify-center h-48 transition-colors cursor-pointer",
              uploadedImage 
                ? "bg-white border-2 border-[#3713ec]" 
                : "bg-[#3713ec]/5 border-2 border-dashed border-[#3713ec]/30 hover:bg-[#3713ec]/10 hover:border-[#3713ec]/50"
            )}
          >
            {uploadedImage ? (
              <img 
                src={uploadedImage} 
                alt="上传的图片" 
                className="w-full h-full object-contain"
              />
            ) : (
              <>
                <div className="flex justify-center mb-3">
                  <div className="w-14 h-14 rounded-full bg-[#3713ec]/10 flex items-center justify-center">
                    <ImagePlus className="w-8 h-8 text-[#3713ec]" />
                  </div>
                </div>
                <p className="font-medium text-gray-900">上传图片</p>
                <p className="text-xs text-gray-500 mt-1">点击/拖拽图片至此处</p>
              </>
            )}
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-base font-semibold">修改指令</h2>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <textarea 
              className="w-full bg-slate-50 border-0 rounded-lg text-sm p-3 placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-[#3713ec]/20 outline-none"
              placeholder="描述你想修改的内容，比如：将背景图改成咖啡馆场景"
              rows={8}
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold">请选择图片数量</h2>
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4].map((quantity) => (
              <button
                key={quantity}
                onClick={() => handleQuantityClick(quantity)}
                className={clsx(
                  "min-w-[4.5rem] h-9 px-4 rounded-full text-sm font-medium flex items-center justify-center transition-all border",
                  selectedQuantity === quantity
                    ? "bg-[#EBE9FD] border-[#3713ec] text-[#3713ec] font-bold shadow-sm"
                    : "bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200"
                )}
              >
                {quantity}张
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="px-4 pt-4 pb-6 border-t border-gray-100">
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full text-white text-base font-semibold py-3.5 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-[#3713ec]/30 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#3713ec' }}
        >
          {isGenerating ? '生成中...' : '立即生成'}
          <span className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-sm font-normal">
            30
            <Coins className="w-4 h-4" />
          </span>
        </button>
      </div>
    </div>
  );
};
