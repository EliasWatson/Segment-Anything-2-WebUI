export type HintPoint = {
  x: number;
  y: number;
};

export type Hints = {
  points: HintPoint[];
};

export type SegmentResult = {
  mask: number[][];
  score: number;
};
