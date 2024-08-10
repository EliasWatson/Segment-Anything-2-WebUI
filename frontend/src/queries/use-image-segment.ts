import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { apiUrl } from "./util.ts";
import { HintPoint, Hints } from "../types.ts";
import { useCallback } from "react";

export function useImageSegment() {
  return useMutation({
    mutationFn: useCallback(
      ({ imageId, hintPoints }: { imageId: number; hintPoints: HintPoint[] }) =>
        axios.post<number[]>(`${apiUrl}/api/image/segment/${imageId}`, {
          previous_mask_id: null,
          points: hintPoints,
        } satisfies Hints),
      [],
    ),
  });
}
