import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { apiUrl } from "./util.ts";
import { HintPoint, Hints } from "../types.ts";

export function useImageSegment(
  imageId: number | undefined,
  hintPoints: HintPoint[],
) {
  return useMutation({
    mutationKey: ["image/segment", imageId, hintPoints],
    enabled: imageId !== undefined && hintPoints.length > 0,
    mutationFn: async () =>
      axios.post<number[]>(`${apiUrl}/api/image/segment/${imageId}`, {
        previous_mask_id: undefined,
        points: hintPoints,
      } satisfies Hints),
  });
}
