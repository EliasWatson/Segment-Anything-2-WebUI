import { AppShell, Text, Group, rem, Image, Flex } from "@mantine/core";
import { type ReactNode, useMemo, useState } from "react";
import { Dropzone, FileWithPath, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";

function App(): ReactNode {
  const [image, setImage] = useState<FileWithPath | undefined>(undefined);
  const imageUrl = useMemo(
    () => (image ? URL.createObjectURL(image) : undefined),
    [image],
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
          {imageUrl && <Image src={imageUrl} />}
        </Flex>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
