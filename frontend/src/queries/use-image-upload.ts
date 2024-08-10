import { useMutation } from "@tanstack/react-query";
import { FileWithPath } from "@mantine/dropzone";
import axios from "axios";
import { apiUrl } from "./util.ts";

export function useImageUpload() {
  return useMutation({
    mutationFn: (image: FileWithPath) => {
      const formData = new FormData();
      formData.append("file", image);
      return axios.post<number>(`${apiUrl}/api/image/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
  });
}
