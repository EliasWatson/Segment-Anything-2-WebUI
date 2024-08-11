import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { MapControls } from "@react-three/drei";
import { useDropzone } from "react-dropzone";

const initialCameraZoom = Math.min(window.innerWidth, window.innerHeight) * 0.8;

function App(): ReactNode {
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [imageTexture, setImageTexture] = useState<THREE.Texture | undefined>(
    undefined,
  );

  useEffect(() => {
    if (imageUrl === undefined) return;

    new THREE.TextureLoader().loadAsync(imageUrl).then((texture) => {
      setImageTexture((oldTexture) => {
        if (oldTexture !== undefined) {
          oldTexture.dispose();
        }

        return texture;
      });
    });
  }, [imageUrl]);

  // const imageRef = useRef<HTMLImageElement | null>(null);
  // const imageElement = imageRef.current;
  //
  // const [hintPoints, setHintPoints] = useState<HintPoint[]>([]);
  // const [selectedPoint, setSelectedPoint] = useState<number | undefined>(
  //   undefined,
  // );
  //
  // const { data: imageIdResponse, mutate: uploadImage } = useImageUpload();
  // const imageId = imageIdResponse?.data;
  //
  // const setImage = useCallback(
  //   (image: Blob | undefined) => {
  //     if (imageUrl !== undefined) {
  //       URL.revokeObjectURL(imageUrl);
  //     }
  //
  //     setHintPoints([]);
  //
  //     if (image === undefined) {
  //       setImageUrl(undefined);
  //       return;
  //     }
  //
  //     uploadImage(image);
  //     setImageUrl(URL.createObjectURL(image));
  //   },
  //   [imageUrl, uploadImage],
  // );
  //
  // const { data: maskIdResponse, mutate: segmentImage } = useImageSegment();
  // const maskId = maskIdResponse?.data.at(0);
  //
  // const maskUrl = useMemo(() => {
  //   if (imageId === undefined || maskId === undefined) {
  //     return undefined;
  //   }
  //
  //   return `${apiUrl}/api/image/get_mask/${imageId}/${maskId}`;
  // }, [imageId, maskId]);

  const planeDimensions = useMemo((): [number, number] => {
    if (imageTexture === undefined) {
      return [1, 1];
    }

    const imageWidth = imageTexture.image.width;
    const imageHeight = imageTexture.image.height;
    return imageWidth > imageHeight
      ? [1, imageHeight / imageWidth]
      : [imageWidth / imageHeight, 1];
  }, [imageTexture]);

  const onDrop = useCallback((acceptedFiles: File[]): void => {
    if (acceptedFiles.length > 0) {
      setImageUrl((imageUrl) => {
        if (imageUrl !== undefined) {
          URL.revokeObjectURL(imageUrl);
        }

        return URL.createObjectURL(acceptedFiles[0]);
      });
    }
  }, []);
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    noClick: true,
    accept: { "image/*": [] },
  });

  return (
    <div className="w-full h-full" {...getRootProps()}>
      <input {...getInputProps()} />
      <Canvas
        frameloop="demand"
        orthographic
        camera={{
          position: [0, 0, 50],
          zoom: initialCameraZoom,
          up: [0, 0, 1],
          far: 10000,
        }}
      >
        <mesh>
          <planeGeometry args={planeDimensions} />
          {imageTexture && <meshBasicMaterial map={imageTexture} />}
        </mesh>
        <MapControls enableRotate={false} />
      </Canvas>
    </div>
  );
}

export default App;
