import type {
  FileAnalysisResult,
  ProcessRequestOptions,
  ProcessResult,
  SupportedFormatsResponse,
} from "../types";
import { analyzeFileInBrowser } from "./fileAnalyzer";
import { processImageInBrowser } from "./imageOptimizer";
import { processPdfInBrowser } from "./pdfOptimizer";

const rawBase = (import.meta.env.VITE_API_BASE as string | undefined)?.trim() || "";
const cleanedBase = rawBase.replace(/^["']|["']$/g, "").trim().replace(/\/+$/, "");
const API_BASE = cleanedBase.replace(/\/api(\/v1)?$/, "");

// Standard headers to bypass ngrok free tier interstitial warning page
const NGROK_HEADERS: Record<string, string> = {
  "ngrok-skip-browser-warning": "true",
};

export class ApiService {
  static async checkHealth(): Promise<{ status: string; service: string }> {
    try {
      const res = await fetch(`${API_BASE}/health`, {
        headers: NGROK_HEADERS,
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Backend unavailable; fallback to local status
    }
    return {
      status: "ok",
      service: "SizeFix-Python In-Browser Engine (Client-Side Pure TypeScript)",
    };
  }

  static async getSupportedFormats(): Promise<SupportedFormatsResponse> {
    try {
      const res = await fetch(`${API_BASE}/supported-formats`, {
        headers: NGROK_HEADERS,
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Backend unavailable; fallback
    }
    return {
      images: ["jpg", "jpeg", "png", "webp", "avif", "gif", "bmp", "svg"],
      documents: ["pdf", "txt"],
      planned_formats: ["docx", "xlsx", "pptx", "zip"],
      supported_operations: [
        "reduce_file_size",
        "increase_file_size",
        "resize_dimensions",
        "adjust_quality",
        "format_conversion",
        "target_exact_size",
        "target_maximum_size",
        "target_size_range",
        "pdf_compression",
      ],
    };
  }

  static async analyzeFile(file: File): Promise<FileAnalysisResult> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        body: formData,
        headers: NGROK_HEADERS,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Backend unavailable or timed out; fallback to browser analyzer
    }
    return await analyzeFileInBrowser(file);
  }

  static async processFile(
    file: File,
    options: ProcessRequestOptions
  ): Promise<ProcessResult> {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isPdf = ext === "pdf" || file.type === "application/pdf";

    // Attempt high-performance Python backend processing via Render / ngrok / local proxy
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (options.target_size) formData.append("target_size", options.target_size);
      if (options.target_value !== undefined) formData.append("target_value", String(options.target_value));
      if (options.target_unit) formData.append("target_unit", options.target_unit);
      if (options.target_mode) formData.append("target_mode", options.target_mode);
      if (options.output_format && options.output_format !== "original") {
        formData.append("output_format", options.output_format);
      }
      if (options.quality !== undefined) formData.append("quality", String(options.quality));
      if (options.width !== undefined) formData.append("width", String(options.width));
      if (options.height !== undefined) formData.append("height", String(options.height));
      if (options.maintain_aspect_ratio !== undefined)
        formData.append("maintain_aspect_ratio", String(options.maintain_aspect_ratio));
      if (options.remove_metadata !== undefined)
        formData.append("remove_metadata", String(options.remove_metadata));
      if (options.progressive !== undefined)
        formData.append("progressive", String(options.progressive));
      if (options.pdf_compression_level)
        formData.append("pdf_compression_level", options.pdf_compression_level);
      if (options.pdf_optimize_images !== undefined)
        formData.append("pdf_optimize_images", String(options.pdf_optimize_images));
      if (options.pdf_downsample_dpi)
        formData.append("pdf_downsample_dpi", String(options.pdf_downsample_dpi));
      if (options.pdf_preserve_text !== undefined)
        formData.append("pdf_preserve_text", String(options.pdf_preserve_text));
      if (options.pdf_image_mode)
        formData.append("pdf_image_mode", options.pdf_image_mode);
      formData.append("response_mode", "file");

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);

      const res = await fetch(`${API_BASE}/process`, {
        method: "POST",
        body: formData,
        headers: NGROK_HEADERS,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const metaStr = res.headers.get("X-Processing-Result") || res.headers.get("x-processing-result");
        if (metaStr) {
          const parsed = JSON.parse(metaStr) as ProcessResult;
          parsed.blob_url = blobUrl;
          parsed.download_url = blobUrl;
          return parsed;
        }

        // If custom header was stripped by intermediate proxy, build result directly from blob
        const outFormat = (options.output_format && options.output_format !== "original")
          ? options.output_format.toLowerCase()
          : ext;
        const dlFilename = `optimized_${file.name.replace(/\.[^/.]+$/, "")}.${outFormat}`;
        return {
          success: true,
          original_filename: file.name,
          output_filename: dlFilename,
          original_size: file.size,
          original_size_human: `${(file.size / 1024).toFixed(1)} KB`,
          output_size: blob.size,
          output_size_human: `${(blob.size / 1024).toFixed(1)} KB`,
          target_reached: true,
          compression_ratio: file.size > 0 ? (file.size - blob.size) / file.size : 0,
          saved_bytes: file.size - blob.size,
          saved_bytes_human: `${(Math.abs(file.size - blob.size) / 1024).toFixed(1)} KB`,
          format: outFormat,
          mode: options.target_mode || "maximum",
          blob_url: blobUrl,
          download_url: blobUrl,
        };
      } else {
        let errMessage = `Processing failed with status ${res.status}`;
        try {
          const errJson = await res.json();
          errMessage = errJson.message || errJson.detail || errMessage;
        } catch {
          // Ignore json parse error
        }
        throw new Error(errMessage);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes("Failed to fetch") && !err.message.includes("NetworkError") && err.name !== "AbortError") {
        throw err;
      }
      // Only fall back to browser engine if backend network is genuinely unreachable
    }

    if (isPdf) {
      return await processPdfInBrowser(file, options);
    } else {
      return await processImageInBrowser(file, options);
    }
  }

  static getDownloadUrl(fileIdOrBlobUrl: string): string {
    if (fileIdOrBlobUrl.startsWith("blob:") || fileIdOrBlobUrl.startsWith("http")) {
      return fileIdOrBlobUrl;
    }
    return `${API_BASE}/download/${fileIdOrBlobUrl}`;
  }
}
