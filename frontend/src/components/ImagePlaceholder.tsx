import { IconPhoto } from "@tabler/icons-react";
import { ReactNode } from "react";

export const ImagePlaceholder = (): ReactNode => {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center gap-4">
      <IconPhoto size="5rem" />
      <div className="text-xl">Drag & drop an image here to start</div>
    </div>
  );
};
