
export type ToolType = 'brush' | 'smart-select' | 'eraser' | 'pan';
export type SegAlgorithm = 'connected' | 'global' | 'edge-aware';

export interface Point {
  x: number;
  y: number;
}

export interface TransformState {
  scale: number;
  x: number;
  y: number;
}

export interface InpaintHistory {
  imageUrl: string;
  maskUrl: string;
  prompt: string;
  timestamp: number;
}
