import { MapControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as localforage from "localforage";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDropzone } from "react-dropzone";
import * as THREE from "three";

import { ImagePlaceholder } from "./components/ImagePlaceholder.tsx";
import { HintPoint } from "./types.ts";

const localforageImageKey = "uploaded-image";

const initialCameraZoom = Math.min(window.innerWidth, window.innerHeight) * 0.9;

function App(): ReactNode {
  const [, setImageUrl] = useState<string | undefined>(undefined);
  const [imageTexture, setImageTexture] = useState<THREE.Texture | undefined>(
    undefined,
  );

  const setImage = useCallback((imageBlob: Blob): void => {
    const newImageUrl = URL.createObjectURL(imageBlob);

    setImageUrl((imageUrl) => {
      if (imageUrl !== undefined) {
        URL.revokeObjectURL(imageUrl);
      }

      return newImageUrl;
    });

    new THREE.TextureLoader().loadAsync(newImageUrl).then((texture) => {
      setImageTexture((oldTexture) => {
        if (oldTexture !== undefined) {
          oldTexture.dispose();
        }

        return texture;
      });
    });

    localforage
      .setItem(localforageImageKey, imageBlob)
      .catch((e) => console.warn(e));
  }, []);

  useEffect(() => {
    localforage.getItem(localforageImageKey).then((blob) => {
      if (blob instanceof Blob) {
        setImage(blob);
      }
    });
  }, [setImage]);

  const [hintPoints, setHintPoints] = useState<HintPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | undefined>(
    undefined,
  );

  const addHintPoint = useCallback(
    (x: number, y: number): void => {
      setSelectedPoint(hintPoints.length);
      setHintPoints((hintPoints) => [...hintPoints, { x, y }]);
    },
    [hintPoints.length],
  );

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

  const onDrop = useCallback(
    (acceptedFiles: File[]): void => {
      if (acceptedFiles.length > 0) {
        setImage(acceptedFiles[0]);
      }
    },
    [setImage],
  );
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    noClick: true,
    accept: { "image/*": [] },
  });

  return (
    <div className="w-full h-full" {...getRootProps()}>
      <input {...getInputProps()} />
      {imageTexture === undefined ? (
        <ImagePlaceholder />
      ) : (
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
          <mesh
            onClick={(e) => {
              const uv = e.uv;
              if (uv === undefined) return;

              e.stopPropagation();
              addHintPoint(uv.x, uv.y);
            }}
          >
            <planeGeometry args={planeDimensions} />
            <meshBasicMaterial map={imageTexture} />
          </mesh>
          {hintPoints.map(({ x, y }, i) => (
            <mesh
              key={i}
              position={
                new THREE.Vector3(
                  (x - 0.5) * planeDimensions[0],
                  (y - 0.5) * planeDimensions[1],
                  1 + (i / hintPoints.length) * 0.1,
                )
              }
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPoint(i);
              }}
            >
              <planeGeometry
                args={i === selectedPoint ? [0.008, 0.008] : [0.004, 0.004]}
              />
              <meshBasicMaterial
                color={i === selectedPoint ? "orange" : "white"}
              />
            </mesh>
          ))}
          <MapControls enableRotate={false} />
        </Canvas>
      )}
    </div>
  );
}

export default App;
