import { AppShell, Text, Group, rem, Image, Flex } from "@mantine/core";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { Dropzone, FileWithPath, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";
import { useImageUpload } from "./queries/use-image-upload.ts";
import { HintPoint } from "./types.ts";
import { useImageSegment } from "./queries/use-image-segment.ts";

function App(): ReactNode {
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageElement = imageRef.current;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvas = canvasRef.current;

  const [hintPoints, setHintPoints] = useState<HintPoint[]>([]);

  const { data: imageIdResponse, mutate: uploadImage } = useImageUpload();
  const imageId = imageIdResponse?.data;

  const setImage = useCallback(
    (image: FileWithPath | undefined) => {
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

  const { data: segmentResultResp } = useImageSegment(imageId, hintPoints);

  if (canvas) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "red";
      ctx.globalAlpha = 0.25;

      if (segmentResultResp) {
        const { mask } = segmentResultResp.data;
        mask.forEach((row, y) =>
          row.forEach((maskValue, x) => {
            if (maskValue > 0.0) {
              ctx.fillRect(x, y, 1, 1);
            }
          }),
        );
      }
    }
  }

  return (
    <AppShell padding="md">
      <AppShell.Main>
        <Flex direction="column" gap="md">
          <Dropzone
            onDrop={(files) => setImage(files.at(0))}
            accept={IMAGE_MIME_TYPE}
            multiple={false}
          >
            <Group
              justify="center"
              gap="xl"
              mih={50}
              style={{ pointerEvents: "none" }}
            >
              <Dropzone.Accept>
                <IconUpload
                  style={{
                    width: rem(52),
                    height: rem(52),
                    color: "var(--mantine-color-blue-6)",
                  }}
                  stroke={1.5}
                />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX
                  style={{
                    width: rem(52),
                    height: rem(52),
                    color: "var(--mantine-color-red-6)",
                  }}
                  stroke={1.5}
                />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconPhoto
                  style={{
                    width: rem(52),
                    height: rem(52),
                    color: "var(--mantine-color-dimmed)",
                  }}
                  stroke={1.5}
                />
              </Dropzone.Idle>
              <div>
                <Text size="xl" inline>
                  Drag an image here or click to select a file
                </Text>
              </div>
            </Group>
          </Dropzone>
          {imageUrl && (
            <div
              className="relative"
              onClick={(e) => {
                if (imageElement === null) return;

                const rect = imageElement.getBoundingClientRect();
                const x = Math.round(
                  ((e.clientX - rect.left) / rect.width) *
                    imageElement.naturalWidth,
                );
                const y = Math.round(
                  ((e.clientY - rect.top) / rect.height) *
                    imageElement.naturalHeight,
                );

                setHintPoints((hintPoints) => [...hintPoints, { x, y }]);
              }}
            >
              <Image ref={imageRef} src={imageUrl} />
              {imageElement && (
                <>
                  <canvas
                    ref={canvasRef}
                    className="absolute left-0 top-0"
                    width={imageElement.naturalWidth}
                    height={imageElement.naturalHeight}
                    style={{
                      width: `${imageElement.width}px`,
                      height: `${imageElement.height}px`,
                    }}
                  />
                  {hintPoints.map(({ x, y }, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 bg-blue-500 border border-white rounded-full drop-shadow cursor-pointer"
                      style={{
                        top: `${((y - 4) / imageElement.naturalHeight) * 100}%`,
                        left: `${((x - 4) / imageElement.naturalWidth) * 100}%`,
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </Flex>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
