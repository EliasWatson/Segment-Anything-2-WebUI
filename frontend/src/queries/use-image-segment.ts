import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { apiUrl } from "./util.ts";
import { Hints } from "../types.ts";
import { useCallback } from "react";

export function useImageSegment() {
  return useMutation({
    mutationFn: useCallback(
      ({ imageId, hints }: { imageId: number; hints: Hints }) =>
        axios.post<number[]>(`${apiUrl}/api/image/segment/${imageId}`, hints),
      [],
    ),
  });
}
