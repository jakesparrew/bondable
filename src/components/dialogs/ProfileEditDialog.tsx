
"use client"

import { useId, useState } from "react"
import { CheckIcon, ImagePlusIcon, XIcon } from "lucide-react"
import { useCharacterLimit } from "@/hooks/utils/use-character-limit"
import { useFileUpload } from "@/hooks/utils/use-file-upload"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useTranslation } from "react-i18next"

interface ProfileEditDialogProps {
  userType: "therapist" | "client";
  children: React.ReactNode;
}

// Using placeholder images as requested
const initialBgImage = [
  {
    name: "profile-bg.jpg",
    size: 1528737,
    type: "image/jpeg",
    url: "/placeholder.svg",
    id: "profile-bg-123456789",
  },
]

const initialAvatarImage = [
  {
    name: "avatar.jpg",
    size: 1528737,
    type: "image/jpeg",
    url: "/placeholder.svg",
    id: "avatar-123456789",
  },
]

export default function ProfileEditDialog({ userType, children }: ProfileEditDialogProps) {
  const id = useId()
  const { t } = useTranslation()

  const maxLength = 180
  const {
    value,
    characterCount,
    handleChange,
    maxLength: limit,
  } = useCharacterLimit({
    maxLength,
    initialValue: userType === "therapist"
      ? "Licensed therapist specializing in cognitive behavioral therapy and mindfulness-based interventions."
      : "Looking forward to my therapy journey and personal growth.",
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-0 overflow-y-visible p-0 sm:max-w-lg bg-card border-border [&>button:last-child]:top-3.5">
        <DialogHeader className="contents space-y-0 text-left">
          <DialogTitle className="border-b border-border px-6 py-4 text-base text-foreground">
            {t("edit_profile")}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          {t("make_changes_to_profile")}
        </DialogDescription>
        <div className="overflow-y-auto">
          <ProfileBg />
          <Avatar />
          <div className="px-6 pt-4 pb-6">
            <form className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`${id}-first-name`} className="text-muted-foreground">{t("first_name")}</Label> <span className="text-destructive">*</span>
                  <Input
                    id={`${id}-first-name`}
                    placeholder={t("john")}
                    defaultValue=""
                    type="text"
                    required
                    className="bg-background border-border text-foreground rounded-md"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`${id}-last-name`} className="text-muted-foreground">{t("last_name")}</Label> <span className="text-destructive">*</span>
                  <Input
                    id={`${id}-last-name`}
                    placeholder={t("doe")}
                    defaultValue=""
                    type="text"
                    required
                    className="bg-background border-border text-foreground rounded-md"
                  />
                </div>
              </div>

              {userType === "therapist" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor={`${id}-specialization`} className="text-muted-foreground">{t("specialization")}</Label>
                    <Input
                      id={`${id}-specialization`}
                      placeholder={t("cbt_family_therapy")}
                      type="text"
                      className="bg-background border-border text-foreground rounded-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${id}-credentials`} className="text-muted-foreground">{t("credentials")}</Label>
                    <Input
                      id={`${id}-credentials`}
                      placeholder={t("lcsw_phd")}
                      type="text"
                      className="bg-background border-border text-foreground rounded-md"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor={`${id}-bio`} className="text-muted-foreground">
                  {userType === "therapist" ? t("professional_bio") : t("about_me")}
                </Label>
                <Textarea
                  id={`${id}-bio`}
                  placeholder={userType === "therapist"
                    ? t("share_professional_background")
                    : t("share_about_yourself")
                  }
                  defaultValue={value}
                  maxLength={maxLength}
                  onChange={handleChange}
                  aria-describedby={`${id}-description`}
                  className="bg-background border-border text-foreground rounded-md"
                />
                <p
                  id={`${id}-description`}
                  className="text-muted-foreground mt-2 text-right text-xs"
                  role="status"
                  aria-live="polite"
                >
                  <span className="tabular-nums">{limit - characterCount}</span>{" "}
                  {t("characters_left")}
                </p>
              </div>
            </form>
          </div>
        </div>
        <DialogFooter className="border-t border-border px-6 py-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-muted-foreground rounded-md">
              {t("cancel")}
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button type="button" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
              {t("save_changes")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProfileBg() {
  const { t } = useTranslation()
  const [{ files }, { removeFile, openFileDialog, getInputProps }] =
    useFileUpload({
      acceptedTypes: ["image/*"],
      initialFiles: initialBgImage,
    })

  const currentImage = files[0] ? (files[0].file instanceof File ? URL.createObjectURL(files[0].file) : files[0].file.url) : null

  return (
    <div className="h-32">
      <div className="bg-card relative flex size-full items-center justify-center overflow-hidden rounded-t-lg">
        {currentImage && (
          <img
            className="size-full object-cover"
            src={currentImage}
            alt={t("profile_background")}
            width={512}
            height={96}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <button
            type="button"
            className="focus-visible:border-ring focus-visible:ring-ring/50 z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-[hsl(174_62%_16%_/_0.6)] text-primary-foreground transition-[color,box-shadow] outline-none hover:bg-[hsl(174_62%_16%_/_0.8)] focus-visible:ring-[3px]"
            onClick={openFileDialog}
            aria-label={currentImage ? t("change_image") : t("upload_image")}
          >
            <ImagePlusIcon size={16} aria-hidden="true" />
          </button>
          {currentImage && (
            <button
              type="button"
              className="focus-visible:border-ring focus-visible:ring-ring/50 z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-[hsl(174_62%_16%_/_0.6)] text-primary-foreground transition-[color,box-shadow] outline-none hover:bg-[hsl(174_62%_16%_/_0.8)] focus-visible:ring-[3px]"
              onClick={() => removeFile(files[0]?.id)}
              aria-label={t("remove_image")}
            >
              <XIcon size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <input
        {...getInputProps()}
        className="sr-only"
        aria-label={t("upload_image_file")}
      />
    </div>
  )
}

function Avatar() {
  const { t } = useTranslation()
  const [{ files }, { openFileDialog, getInputProps }] = useFileUpload({
    acceptedTypes: ["image/*"],
    initialFiles: initialAvatarImage,
  })

  const currentImage = files[0] ? (files[0].file instanceof File ? URL.createObjectURL(files[0].file) : files[0].file.url) : null

  return (
    <div className="-mt-10 px-6">
      <div className="border-border bg-card relative flex size-20 items-center justify-center overflow-hidden rounded-full border-4 shadow-xs shadow-black/10">
        {currentImage && (
          <img
            src={currentImage}
            className="size-full object-cover"
            width={80}
            height={80}
            alt={t("profile_image")}
          />
        )}
        <button
          type="button"
          className="focus-visible:border-ring focus-visible:ring-ring/50 absolute flex size-8 cursor-pointer items-center justify-center rounded-full bg-[hsl(174_62%_16%_/_0.6)] text-primary-foreground transition-[color,box-shadow] outline-none hover:bg-[hsl(174_62%_16%_/_0.8)] focus-visible:ring-[3px]"
          onClick={openFileDialog}
          aria-label={t("change_profile_picture")}
        >
          <ImagePlusIcon size={16} aria-hidden="true" />
        </button>
        <input
          {...getInputProps()}
          className="sr-only"
          aria-label={t("upload_profile_picture")}
        />
      </div>
    </div>
  )
}
