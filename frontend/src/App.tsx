import { AppShell, Text, Group, rem, Image, Flex } from "@mantine/core";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { Dropzone, FileWithPath, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";
import { useImageUpload } from "./queries/use-image-upload.ts";
import { HintPoint } from "./types.ts";
import { useImageSegment } from "./queries/use-image-segment.ts";
import { apiUrl } from "./queries/util.ts";

function App(): ReactNode {
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageElement = imageRef.current;

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

  const { data: maskIdResponse, mutate: segmentImage } = useImageSegment();
  const maskId = maskIdResponse?.data.at(0);

  const maskUrl = useMemo(() => {
    if (imageId === undefined || maskId === undefined) {
      return undefined;
    }

    return `${apiUrl}/api/image/get_mask/${imageId}/${maskId}`;
  }, [imageId, maskId]);

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
          <Flex>
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

                  const newHintPoints = [...hintPoints, { x, y }];
                  setHintPoints(newHintPoints);

                  if (imageId !== undefined) {
                    segmentImage({
                      imageId,
                      hints: {
                        previous_mask_id: maskId ?? null,
                        points: newHintPoints,
                      },
                    });
                  }
                }}
              >
                <Image ref={imageRef} src={imageUrl} />
                {imageElement && (
                  <>
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
            {maskUrl !== undefined && <Image src={maskUrl} />}
          </Flex>
        </Flex>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
