
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2Icon, PlusCircleIcon, Upload, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useAvatarCache } from "@/hooks/ui/useAvatarCache";
import { toast } from "sonner";

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onAvatarUpdate?: (url: string) => void;
  size?: "sm" | "mid" | "md" | "lg";
  className?: string;
}

export const AvatarUpload = ({
  currentAvatarUrl,
  onAvatarUpdate,
  size = "md",
  className = "",
}: AvatarUploadProps) => {
  const { user } = useAuthManager();
  const { avatarUrl, updateAvatarUrl } = useAvatarCache();
  const [uploading, setUploading] = useState(false);

  const sizeClasses = {
    sm: "h-8 w-8",
    mid: "h-9 w-9",
    md: "h-12 w-12",
    lg: "h-24 w-24",
  };

  const uploadAvatar = async (file: File) => {
    if (!user?.id) {
      toast.error("You must be logged in to upload an avatar");
      return;
    }

    setUploading(true);

    try {
      console.log("Starting avatar upload for user:", user.id);
      console.log("File details:", { name: file.name, size: file.size, type: file.type });
      
      // Create file name with user ID and timestamp
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      console.log("Uploading file with name:", fileName);

      // Upload file to Supabase Storage with contentType
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", uploadData);

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const newAvatarUrl = urlData.publicUrl;
      console.log("Public URL:", newAvatarUrl);

      // Update the user's profile with the new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", user.id);

      if (updateError) {
        console.error("Profile update error:", updateError);
        throw updateError;
      }

      console.log("Profile updated successfully");
      
      // Update cache and notify parent
      updateAvatarUrl(newAvatarUrl);
      onAvatarUpdate?.(newAvatarUrl);
      toast.success("Avatar updated successfully!");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      
      // Provide more specific error messages
      if (error.message?.includes('Row Level Security')) {
        toast.error("Permission denied. Please try logging out and back in.");
      } else if (error.message?.includes('413')) {
        toast.error("File too large. Please choose a smaller image.");
      } else if (error.message?.includes('415')) {
        toast.error("Invalid file type. Please choose an image file.");
      } else {
        toast.error(`Failed to upload avatar: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    uploadAvatar(file);
  };

  // Use cached avatar URL, fallback to prop
  const displayUrl = avatarUrl || currentAvatarUrl;

  return (
    <div className={`relative inline-block group ${className}`}>
      <Avatar className={`${sizeClasses[size]} !rounded-lg`}>
        <AvatarImage src={displayUrl} alt="Avatar" className="non-invertable" />
        <AvatarFallback className="!rounded-lg">
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <button
        type="button"
        onClick={() => document.getElementById("avatar-upload")?.click()}
        disabled={uploading}
        className={`
      absolute -end-1 -bottom-1 inline-flex items-center justify-center rounded-full
      transition-transform duration-300 ease-out
      group-hover:scale-110 group-hover:rotate-6
      focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50
      disabled:opacity-50
    `}
      >
        {uploading ? (
          <Loader2Icon className="animate-spin size-5 fill-neutral-100 text-neutral-900" />
        ) : (
          <PlusCircleIcon className="size-5 fill-neutral-100 text-neutral-900" />
        )}
        <span className="sr-only">Upload avatar</span>
      </button>

      <Input
        id="avatar-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
    </div>
  );
};
