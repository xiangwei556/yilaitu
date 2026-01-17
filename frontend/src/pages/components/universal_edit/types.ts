export enum EditorMode {
  PENCIL = 'pencil',
  ERASER = 'eraser',
  DRAG = 'drag',
  SMART_SELECT = 'smart-select',
}

export enum GenerationType {
  INSTRUCT = 'instruct',
  INPAINT = 'inpaint',
}

export interface Point {
  x: number;
  y: number;
}

export interface CanvasState {
  undoStack: string[];
  redoStack: string[];
}
