export enum EditorMode {
  PENCIL = 'pencil',
  ERASER = 'eraser',
  DRAG = 'drag',
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
