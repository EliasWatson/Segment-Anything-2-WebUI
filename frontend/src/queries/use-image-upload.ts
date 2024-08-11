import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { apiUrl } from "./util.ts";

export function useImageUpload() {
  return useMutation({
    mutationFn: (image: Blob) => {
      const formData = new FormData();
      formData.append("file", image);
      return axios.post<number>(`${apiUrl}/api/image/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
  });
}
