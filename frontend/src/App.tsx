import { MapControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as localforage from "localforage";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDropzone } from "react-dropzone";
import * as THREE from "three";

import { ImagePlaceholder } from "./components/ImagePlaceholder.tsx";
import { useImageSegment } from "./queries/use-image-segment.ts";
import { useImageUpload } from "./queries/use-image-upload.ts";
import { apiUrl } from "./queries/util.ts";
import hintPointFragmentShader from "./shaders/hint-point/hint-point.frag?raw";
import hintPointVertexShader from "./shaders/hint-point/hint-point.vert?raw";
import maskFragmentShader from "./shaders/mask/mask.frag?raw";
import maskVertexShader from "./shaders/mask/mask.vert?raw";
import { HintPoint } from "./types.ts";

const localforageImageKey = "uploaded-image";

const initialCameraZoom = Math.min(window.innerWidth, window.innerHeight) * 0.9;

function App(): ReactNode {
  const [, setImageUrl] = useState<string | undefined>(undefined);
  const [imageTexture, setImageTexture] = useState<THREE.Texture | undefined>(
    undefined,
  );

  const { data: imageIdResponse, mutate: uploadImage } = useImageUpload();
  const imageId = imageIdResponse?.data;

  const [hintPoints, setHintPoints] = useState<HintPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | undefined>(
    undefined,
  );

  const setImage = useCallback(
    (imageBlob: Blob): void => {
      const newImageUrl = URL.createObjectURL(imageBlob);

      setHintPoints([]);
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

      uploadImage(imageBlob);

      localforage
        .setItem(localforageImageKey, imageBlob)
        .catch((e) => console.warn(e));
    },
    [uploadImage],
  );

  const didInitialLoadRef = useRef(false);
  useEffect(() => {
    if (didInitialLoadRef.current) return;

    localforage.getItem(localforageImageKey).then((blob) => {
      if (blob instanceof Blob) {
        setImage(blob);
      }
    });

    didInitialLoadRef.current = true;
  }, [setImage]);

  const [maskTexture, setMaskTexture] = useState<THREE.Texture | undefined>(
    undefined,
  );

  const maskShaderUniformsRef = useRef({ maskTexture: { value: maskTexture } });
  maskShaderUniformsRef.current.maskTexture.value = maskTexture;

  const { data: maskIdResponse, mutate: segmentImage } = useImageSegment();
  const maskId = maskIdResponse?.data.at(0);

  useEffect(() => {
    if (imageId === undefined || maskId === undefined) {
      return;
    }

    const maskUrl = `${apiUrl}/api/image/get_mask/${imageId}/${maskId}`;
    new THREE.TextureLoader().loadAsync(maskUrl).then((texture) => {
      setMaskTexture((oldTexture) => {
        if (oldTexture !== undefined) {
          oldTexture.dispose();
        }

        return texture;
      });
    });
  }, [imageId, maskId]);

  const addHintPoint = useCallback(
    (x: number, y: number): void => {
      if (imageId === undefined) return;

      const newHintPoints = [...hintPoints, { x, y }];

      setSelectedPoint(hintPoints.length);
      setHintPoints(newHintPoints);

      segmentImage({
        imageId,
        hints: { previous_mask_id: maskId ?? null, points: newHintPoints },
      });
    },
    [hintPoints, imageId, maskId, segmentImage],
  );

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
          {maskTexture !== undefined && (
            <mesh position={new THREE.Vector3(0, 0, 0.5)}>
              <planeGeometry args={planeDimensions} />
              <shaderMaterial
                transparent={true}
                vertexShader={maskVertexShader}
                fragmentShader={maskFragmentShader}
                uniforms={maskShaderUniformsRef.current}
              />
            </mesh>
          )}
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
              <shaderMaterial
                transparent={true}
                vertexShader={hintPointVertexShader}
                fragmentShader={hintPointFragmentShader}
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
