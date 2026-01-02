import { useState, useCallback } from 'react';

export interface ModelGenerationState {
  version: 'common' | 'pro';
  outfitType: 'single' | 'match';
  modelType: 'adult' | 'system' | 'my';
  selectedModel: number;
  styleCategory: string;
  selectedStyle: number;
  ratio: string;
  quantity: number;
  uploadedImage: string | null;
  singleOutfitImage: string | null;
  singleOutfitBackImage: string | null;
  topOutfitImage: string | null;
  topOutfitBackImage: string | null;
  bottomOutfitImage: string | null;
  bottomOutfitBackImage: string | null;
  customSceneText: string;
  showCustomSceneInput: boolean;
  showGenerateSuccess: boolean;
  isGenerating: boolean;
}

export const useModelGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateSuccess, setShowGenerateSuccess] = useState(false);

  const handleContinueCreating = useCallback((
    setVersion: (v: 'common' | 'pro') => void,
    setOutfitType: (t: 'single' | 'match') => void,
    setModelType: (t: 'adult' | 'system' | 'my') => void,
    setSelectedModel: (id: number) => void,
    setStyleCategory: (c: string) => void,
    setSelectedStyle: (id: number) => void,
    setRatio: (r: string) => void,
    setQuantity: (q: number) => void,
    setUploadedImage: (img: string | null) => void,
    setSingleOutfitImage: (img: string | null) => void,
    setSingleOutfitBackImage: (img: string | null) => void,
    setTopOutfitImage: (img: string | null) => void,
    setTopOutfitBackImage: (img: string | null) => void,
    setBottomOutfitImage: (img: string | null) => void,
    setBottomOutfitBackImage: (img: string | null) => void,
    setCustomSceneText: (text: string) => void,
    setShowCustomSceneInput: (show: boolean) => void
  ) => {
    setVersion('common');
    setOutfitType('single');
    setModelType('adult');
    setSelectedModel(1);
    setStyleCategory('daily');
    setSelectedStyle(1);
    setRatio('1:1');
    setQuantity(1);
    setUploadedImage(null);
    setSingleOutfitImage(null);
    setSingleOutfitBackImage(null);
    setTopOutfitImage(null);
    setTopOutfitBackImage(null);
    setBottomOutfitImage(null);
    setBottomOutfitBackImage(null);
    setCustomSceneText('');
    setShowCustomSceneInput(false);
    setShowGenerateSuccess(false);
    setIsGenerating(false);
  }, [setShowGenerateSuccess, setIsGenerating]);

  return {
    isGenerating,
    setIsGenerating,
    showGenerateSuccess,
    setShowGenerateSuccess,
    handleContinueCreating
  };
};