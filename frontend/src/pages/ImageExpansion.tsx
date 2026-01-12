import React, { useState, useRef } from 'react';
import { LeftPanel } from './components/image_expansion/LeftPanel';
import { RightPanel } from './components/model-generation/RightPanel';

export const ImageExpansion: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateSuccess, setShowGenerateSuccess] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [taskId, setTaskId] = useState('');
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const leftPanelResetRef = useRef<(() => void) | null>(null);

  const handleContinueCreating = () => {
    if (leftPanelResetRef.current) {
      leftPanelResetRef.current();
    }
    setShowGenerateSuccess(false);
    setIsGenerating(false);
    setGeneratedImages([]);
    setTaskId('');
  };

  const handleGeneratedData = (images: string[], taskId: string, generationParams?: any) => {
    console.log('handleGeneratedData called with:', images, taskId, generationParams);
    setGeneratedImages(images);
    setTaskId(taskId);
    setShowGenerateSuccess(true);
    
    if (generationParams) {
      const tempRecord = {
        id: parseInt(taskId) || 0,
        params: {
          uploaded_image: generationParams.uploaded_image,
          selected_ratio: generationParams.selected_ratio,
          custom_width: generationParams.custom_width,
          custom_height: generationParams.custom_height
        },
        model_id: 1,
        model_name: '无损扩图',
        images: images.map((url, index) => ({
          file_path: url,
          url: url,
          index: index + 1
        })),
        status: 'completed',
        create_time: new Date().toISOString()
      };
      setCurrentRecord(tempRecord);
      console.log('Temporary record created:', tempRecord);
    }
    
    console.log('State updated - generatedImages:', images, 'taskId:', taskId);
  };

  return (
    <div className="flex gap-[1px] p-0 h-full items-start" style={{ maxHeight: 'calc(100vh - 56px)' }}>
      <LeftPanel 
        isGenerating={isGenerating}
        setIsGenerating={setIsGenerating}
        showGenerateSuccess={showGenerateSuccess}
        setShowGenerateSuccess={setShowGenerateSuccess}
        onResetRef={leftPanelResetRef}
        onGeneratedData={handleGeneratedData}
      />
      <RightPanel 
        isGenerating={isGenerating} 
        generatedImages={generatedImages}
        taskId={taskId}
        currentRecord={currentRecord}
      />
    </div>
  );
};
