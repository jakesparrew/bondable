
import { supabase } from "@/integrations/supabase/client";
import console from "@/lib/production-console";

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: 'voice' | 'video' | 'pdf' | 'image';
  file_size: number;
  file_url: string;
  mime_type: string;
  duration_seconds?: number;
  created_at: string;
  updated_at: string;
}

export const messageAttachmentService = {
  // Upload file to storage with better error handling
  async uploadFile(file: File, userId: string, messageId: string): Promise<string> {
    console.log('Uploading file:', { fileName: file.name, size: file.size, type: file.type });
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${messageId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('message-attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    console.log('File uploaded successfully:', data.path);
    return data.path;
  },

  // Create attachment record
  async createAttachment(
    messageId: string,
    fileName: string,
    fileType: 'voice' | 'video' | 'pdf' | 'image',
    fileSize: number,
    fileUrl: string,
    mimeType: string,
    durationSeconds?: number
  ): Promise<MessageAttachment> {
    // Round duration to 3 decimal places to match the database precision
    const roundedDuration = durationSeconds ? Math.round(durationSeconds * 1000) / 1000 : undefined;
    
    console.log('Creating attachment record:', { messageId, fileName, fileType, fileSize });
    
    const { data, error } = await supabase
      .from('message_attachments')
      .insert({
        message_id: messageId,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        file_url: fileUrl,
        mime_type: mimeType,
        duration_seconds: roundedDuration,
      })
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      throw new Error(`Failed to create attachment record: ${error.message}`);
    }

    console.log('Attachment record created:', data.id);
    return data as MessageAttachment;
  },

  // Get attachments for a message
  async getMessageAttachments(messageId: string): Promise<MessageAttachment[]> {
    const { data, error } = await supabase
      .from('message_attachments')
      .select('*')
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching attachments:', error);
      throw new Error(`Failed to fetch attachments: ${error.message}`);
    }

    return (data || []) as MessageAttachment[];
  },

  // Get signed URL for file access with improved error handling
  async getSignedUrl(filePath: string): Promise<string> {
    console.log('Getting signed URL for:', filePath);
    
    const { data, error } = await supabase.storage
      .from('message-attachments')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Signed URL error:', error);
      throw new Error(`Failed to get signed URL: ${error.message}`);
    }

    console.log('Signed URL created successfully');
    return data.signedUrl;
  },

  // Delete attachment with better cleanup
  async deleteAttachment(attachmentId: string): Promise<void> {
    // Get attachment info first
    const { data: attachment, error: fetchError } = await supabase
      .from('message_attachments')
      .select('file_url')
      .eq('id', attachmentId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch attachment: ${fetchError.message}`);
    }

    // Delete from storage first
    const { error: storageError } = await supabase.storage
      .from('message-attachments')
      .remove([attachment.file_url]);

    if (storageError) {
      console.error('Failed to delete file from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete database record
    const { error: deleteError } = await supabase
      .from('message_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      throw new Error(`Failed to delete attachment record: ${deleteError.message}`);
    }
  },

  // Get file type from MIME type
  getFileType(mimeType: string): 'voice' | 'video' | 'pdf' | 'image' {
    if (mimeType.startsWith('audio/')) return 'voice';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
    return 'image'; // fallback
  },

  // Get audio duration (for voice recordings)
  async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      
      audio.addEventListener('error', () => {
        console.error('Error loading audio for duration calculation');
        resolve(0); // Return 0 instead of rejecting
      });
      
      audio.src = URL.createObjectURL(file);
    });
  },
};
