import { AppShell, Text, Group, rem, Image, Flex } from "@mantine/core";
import { type ReactNode, useCallback, useState } from "react";
import { Dropzone, FileWithPath, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";
import { useImageUpload } from "./queries/use-image-upload.ts";

function App(): ReactNode {
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

  const { data: imageIdResponse, mutate: uploadImage } = useImageUpload();
  const imageId = imageIdResponse?.data;

  const setImage = useCallback(
    (image: FileWithPath | undefined) => {
      if (imageUrl !== undefined) {
        URL.revokeObjectURL(imageUrl);
      }

      if (image === undefined) {
        setImageUrl(undefined);
        return;
      }

      uploadImage(image);
      setImageUrl(URL.createObjectURL(image));
    },
    [imageUrl, uploadImage],
  );

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
          <div>{imageId}</div>
          {imageUrl && <Image src={imageUrl} />}
        </Flex>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
