import React, { useState, useRef } from 'react';
import { LeftPanel } from './components/model-generation/LeftPanel';
import { ImageRecordPanel } from './components/model-generation/ImageRecordPanel';
import { RightPanel } from './components/model-generation/RightPanel';

export const ModelGeneration: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateSuccess, setShowGenerateSuccess] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [taskId, setTaskId] = useState('');
  const leftPanelResetRef = useRef<(() => void) | null>(null);
  const leftPanelLoadFromRecordRef = useRef<((record: any) => void) | null>(null);

  const handleContinueCreating = () => {
    if (leftPanelResetRef.current) {
      leftPanelResetRef.current();
    }
    setShowGenerateSuccess(false);
    setIsGenerating(false);
    setGeneratedImages([]);
    setTaskId('');
  };

  const handleGeneratedData = (images: string[], taskId: string) => {
    console.log('handleGeneratedData called with:', images, taskId);
    setGeneratedImages(images);
    setTaskId(taskId);
    setShowGenerateSuccess(true);
    console.log('State updated - generatedImages:', images, 'taskId:', taskId);
  };

  const handleRecordClick = (record: any) => {
    if (leftPanelLoadFromRecordRef.current) {
      leftPanelLoadFromRecordRef.current(record);
    }
    if (record.images && Array.isArray(record.images)) {
      setGeneratedImages(record.images);
      setTaskId(record.id?.toString() || '');
      setShowGenerateSuccess(true);
    }
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
        onLoadFromRecordRef={leftPanelLoadFromRecordRef}
      />
      <ImageRecordPanel onContinueCreating={handleContinueCreating} onRecordClick={handleRecordClick} />
      <RightPanel 
        isGenerating={isGenerating} 
        generatedImages={generatedImages}
        taskId={taskId}
      />
    </div>
  );
};
