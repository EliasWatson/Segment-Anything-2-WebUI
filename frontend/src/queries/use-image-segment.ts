import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useCallback } from "react";

import { Hints } from "../types.ts";
import { apiUrl } from "./util.ts";

export function useImageSegment() {
  return useMutation({
    mutationFn: useCallback(
      ({ imageId, hints }: { imageId: number; hints: Hints }) =>
        axios.post<number[]>(`${apiUrl}/api/image/segment/${imageId}`, hints),
      [],
    ),
  });
}
