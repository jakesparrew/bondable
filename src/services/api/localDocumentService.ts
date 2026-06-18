import { supabase } from "@/integrations/supabase/client";

export type LocalDocumentType = "image" | "video" | "pdf" | "other";

export interface LocalDocument {
  id: string;
  user_id: string;
  file_name: string;
  file_type: LocalDocumentType;
  mime_type: string;
  file_size: number;
  file_url: string; // storage path within bucket
  created_at: string;
  updated_at: string;
}

const BUCKET = "local-documents";

function getFileType(mime: string): LocalDocumentType {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "other";
}

export const localDocumentService = {
  async uploadFile(file: File, userId: string): Promise<string> {
    const filePath = `${userId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    return filePath;
  },

  async createDocument(params: {
    userId: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    fileSize: number;
  }): Promise<LocalDocument> {
    const { data, error } = await supabase
      .from("local_documents")
      .insert({
        user_id: params.userId,
        file_name: params.fileName,
        file_type: getFileType(params.mimeType),
        mime_type: params.mimeType,
        file_size: params.fileSize,
        file_url: params.filePath,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as LocalDocument;
  },

  async listDocuments(userId: string): Promise<LocalDocument[]> {
    const { data, error } = await supabase
      .from("local_documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as LocalDocument[];
  },

  async getSignedUrl(filePath: string, expiresIn: number = 60 * 60): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },

  async deleteDocument(docId: string, filePath: string): Promise<void> {
    const { error: storageErr } = await supabase.storage.from(BUCKET).remove([filePath]);
    if (storageErr) throw storageErr;
    const { error } = await supabase.from("local_documents").delete().eq("id", docId);
    if (error) throw error;
  },
};
