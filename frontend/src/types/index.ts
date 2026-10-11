export type TargetUnit = "B" | "KB" | "MB" | "GB";
export type TargetMode = "maximum" | "exact" | "range";

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface FileAnalysisResult {
  filename: string;
  extension: string;
  mime_type: string;
  size_bytes: number;
  size_human: string;
  category: "image" | "document" | "unsupported";
  is_supported: boolean;
  dimensions?: ImageDimensions;
  color_mode?: string;
  has_alpha?: boolean;
  is_animated?: boolean;
  frame_count?: number;
  pdf_pages?: number;
  pdf_metadata?: Record<string, any>;
  supported_operations: string[];
  recommendations?: Record<string, string>;
}

export interface ProcessRequestOptions {
  target_size?: string;
  target_value?: number;
  target_unit?: TargetUnit;
  target_mode?: TargetMode;
  min_size?: string;
  max_size?: string;
  output_format?: string;
  quality?: number;
  width?: number;
  height?: number;
  maintain_aspect_ratio?: boolean;
  remove_metadata?: boolean;
  progressive?: boolean;
  pdf_compression_level?: "low" | "balanced" | "maximum";
  pdf_optimize_images?: boolean;
  pdf_downsample_dpi?: number;
  pdf_preserve_text?: boolean;
  pdf_image_mode?: "separate" | "stitch" | "first_page";
}

export interface ProcessResult {
  success: boolean;
  original_filename: string;
  output_filename: string;
  original_size: number;
  original_size_human: string;
  output_size: number;
  output_size_human: string;
  target_size?: number;
  target_size_human?: string;
  target_reached: boolean;
  compression_ratio: number;
  saved_bytes: number;
  saved_bytes_human: string;
  format: string;
  mode: string;
  closest_size?: number;
  difference_bytes?: number;
  reason?: string;
  quality?: number;
  width?: number;
  height?: number;
  original_width?: number;
  original_height?: number;
  pages?: number;
  images_optimized?: number;
  output_file_id?: string;
  download_url?: string;
  blob_url?: string;
  error_code?: string;
  message?: string;
}

export interface SupportedFormatsResponse {
  images: string[];
  documents: string[];
  planned_formats: string[];
  supported_operations: string[];
}
