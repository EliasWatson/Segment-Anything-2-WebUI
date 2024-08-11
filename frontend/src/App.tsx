import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { useImageUpload } from "./queries/use-image-upload.ts";
import { HintPoint } from "./types.ts";
import { useImageSegment } from "./queries/use-image-segment.ts";
import { apiUrl } from "./queries/util.ts";
import { Canvas } from "@react-three/fiber";

function App(): ReactNode {
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageElement = imageRef.current;

  const [hintPoints, setHintPoints] = useState<HintPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | undefined>(
    undefined,
  );

  const { data: imageIdResponse, mutate: uploadImage } = useImageUpload();
  const imageId = imageIdResponse?.data;

  const setImage = useCallback(
    (image: Blob | undefined) => {
      if (imageUrl !== undefined) {
        URL.revokeObjectURL(imageUrl);
      }

      setHintPoints([]);

      if (image === undefined) {
        setImageUrl(undefined);
        return;
      }

      uploadImage(image);
      setImageUrl(URL.createObjectURL(image));
    },
    [imageUrl, uploadImage],
  );

  const { data: maskIdResponse, mutate: segmentImage } = useImageSegment();
  const maskId = maskIdResponse?.data.at(0);

  const maskUrl = useMemo(() => {
    if (imageId === undefined || maskId === undefined) {
      return undefined;
    }

    return `${apiUrl}/api/image/get_mask/${imageId}/${maskId}`;
  }, [imageId, maskId]);

  return <Canvas></Canvas>;
}

export default App;
