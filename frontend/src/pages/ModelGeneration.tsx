import React, { useState, useRef } from 'react';
import { LeftPanel } from '../components/model-generation/LeftPanel';
import { ImageRecordPanel } from '../components/model-generation/ImageRecordPanel';
import { RightPanel } from '../components/model-generation/RightPanel';

export const ModelGeneration: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateSuccess, setShowGenerateSuccess] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [taskId, setTaskId] = useState('');
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const leftPanelResetRef = useRef<(() => void) | null>(null);
  const leftPanelLoadFromRecordRef = useRef<((record: any) => void) | null>(null);
  const imageRecordPanelRefreshRef = useRef<(() => void) | null>(null);
  const findRecordRef = useRef<((taskId: string) => any) | null>(null);
  const updateRecordRef = useRef<((recordId: number, updates: any) => void) | null>(null);

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
    setCurrentRecord(record);
    if (record.images && Array.isArray(record.images)) {
      const imageUrls = record.images.map((img: any) => img.file_path || img.url || img);
      setGeneratedImages(imageUrls);
      setTaskId(record.id?.toString() || '');
      setShowGenerateSuccess(true);
    }
  };

  const handleFeedback = (feedback: string, feedbackId: number) => {
    if (currentRecord) {
      const updatedRecord = { ...currentRecord, feedback_id: feedbackId };
      setCurrentRecord(updatedRecord);
      
      if (updateRecordRef.current) {
        updateRecordRef.current(currentRecord.id, { feedback_id: feedbackId });
      }
    } else if (taskId && findRecordRef.current) {
      const record = findRecordRef.current(taskId);
      if (record) {
        const updatedRecord = { ...record, feedback_id: feedbackId };
        setCurrentRecord(updatedRecord);
        
        if (updateRecordRef.current) {
          updateRecordRef.current(record.id, { feedback_id: feedbackId });
        }
      }
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
        onLoadFromRecord={handleRecordClick}
        onLoadFromRecordRef={leftPanelLoadFromRecordRef}
        refreshImageRecordsRef={imageRecordPanelRefreshRef}
      />
      <ImageRecordPanel onContinueCreating={handleContinueCreating} onRecordClick={handleRecordClick} refreshRef={imageRecordPanelRefreshRef} findRecordRef={findRecordRef} updateRecordRef={updateRecordRef} />
      <RightPanel 
        isGenerating={isGenerating} 
        generatedImages={generatedImages}
        taskId={taskId}
        currentRecord={currentRecord}
        findRecordRef={findRecordRef}
        onFeedback={handleFeedback}
      />
    </div>
  );
};
