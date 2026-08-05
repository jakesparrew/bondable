
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ImagePreviewDialogProps {
  src: string;
  alt: string;
  trigger: React.ReactNode;
}

export const ImagePreviewDialog = ({
  src,
  alt,
  trigger,
}: ImagePreviewDialogProps) => {
  const { t } = useTranslation();
  // If src is a blob URL or actual image URL, use it; otherwise use placeholder
  const imageSrc = src && src !== "/placeholder.svg" ? src : "/placeholder.svg";

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-card border-border p-4 rounded-card max-w-lg w-full" disableCloseButton >
        {/* Top row with close button aligned right */}
        <div className="flex justify-end ">
          <DialogClose asChild>
            <button
              className="text-muted-foreground hover:text-foreground"
              aria-label={t("close")}
            >
              <X className="w-5 h-5" />
            </button>
          </DialogClose>
        </div>

        {/* Image content */}
        <div className="flex flex-col items-center">
          <img
            src={imageSrc}
            alt={alt}
            className="object-contain rounded max-h-[70vh]"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              e.currentTarget.src = "/placeholder.svg";
            }}
          />
          <p className="text-muted-foreground text-sm mt-2">{alt}</p>
          {imageSrc === "/placeholder.svg" && (
            <p className="text-muted-foreground text-xs mt-1">{t("image_preview_not_available")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
