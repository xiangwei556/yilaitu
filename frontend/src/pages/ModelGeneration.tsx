import React from 'react';
import { LeftPanel } from '../components/model-generation/LeftPanel';
import { ImageRecordPanel } from '../components/model-generation/ImageRecordPanel';
import { RightPanel } from '../components/model-generation/RightPanel';

export const ModelGeneration: React.FC = () => {
  return (
    <div className="flex gap-[1px] p-0 h-full items-start overflow-hidden">
      <LeftPanel />
      <ImageRecordPanel />
      <RightPanel />
    </div>
  );
};
