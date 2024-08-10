export type HintPoint = {
  x: number;
  y: number;
};

export type Hints = {
  previous_mask_id: number | null;
  points: HintPoint[];
};
