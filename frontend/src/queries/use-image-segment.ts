import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { apiUrl } from "./util.ts";
import { HintPoint } from "../types.ts";

export function useImageSegment(
  imageId: number | undefined,
  hintPoints: HintPoint[],
) {
  return useQuery({
    queryKey: ["image/segment", imageId, hintPoints],
    enabled: imageId !== undefined && hintPoints.length > 0,
    queryFn: async () =>
      axios.post(`${apiUrl}/api/image/segment/${imageId}`, {
        points: hintPoints,
      }),
  });
}
