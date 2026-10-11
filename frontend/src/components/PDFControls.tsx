import React from "react";
import { FileCode } from "lucide-react";

interface PDFControlsProps {
  outputFormat: string;
  onOutputFormatChange: (fmt: string) => void;
  compressionLevel: "low" | "balanced" | "maximum";
  onCompressionLevelChange: (lvl: "low" | "balanced" | "maximum") => void;
  optimizeImages: boolean;
  onOptimizeImagesChange: (val: boolean) => void;
  removeMetadata: boolean;
  onRemoveMetadataChange: (val: boolean) => void;
  preserveText: boolean;
  onPreserveTextChange: (val: boolean) => void;
  pdfImageMode?: "separate" | "stitch" | "first_page";
  onPdfImageModeChange?: (mode: "separate" | "stitch" | "first_page") => void;
  pageCount?: number;
}

export const PDFControls: React.FC<PDFControlsProps> = ({
  outputFormat,
  onOutputFormatChange,
  compressionLevel,
  onCompressionLevelChange,
  optimizeImages,
  onOptimizeImagesChange,
  removeMetadata,
  onRemoveMetadataChange,
  preserveText,
  onPreserveTextChange,
  pdfImageMode = "separate",
  onPdfImageModeChange,
  pageCount,
}) => {
  return (
    <div className="box-card-subtle mb-4">
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <FileCode size={18} color="var(--strong-raspberry)" />
        <h3 style={{ fontSize: "0.95rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          PDF Tuning & Conversion
        </h3>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem" }}>
          Output Format
        </label>
        <select
          value={outputFormat}
          onChange={(e) => onOutputFormatChange(e.target.value)}
          className="sharp-select"
        >
          <optgroup label="── DOCUMENT FORMATS ──">
            <option value="original">PDF (.pdf) - Compressed Document</option>
            <option value="txt">TXT (.txt) - Extract Searchable Text</option>
          </optgroup>

          <optgroup label="── RENDER TO IMAGE ──">
            <option value="jpg">JPG / JPEG (.jpg) - Render to Image</option>
            <option value="png">PNG (.png) - High-Res Crisp Render</option>
            <option value="webp">WEBP (.webp) - Modern Compact Render</option>
          </optgroup>
        </select>
      </div>

      {(outputFormat === "jpg" || outputFormat === "png" || outputFormat === "webp") && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 700 }}>
              Multi-Page Export Mode
            </label>
            {pageCount && pageCount > 1 && (
              <span className="sharp-tag sharp-tag-raspberry" style={{ fontSize: "0.7rem" }}>
                {pageCount} Pages Detected
              </span>
            )}
          </div>
          <select
            value={pdfImageMode}
            onChange={(e) => onPdfImageModeChange?.(e.target.value as "separate" | "stitch" | "first_page")}
            className="sharp-select"
          >
            <option value="separate">All Pages as ZIP (Individual {outputFormat.toUpperCase()} files)</option>
            <option value="stitch">Stitch All Pages into One Long Image</option>
            <option value="first_page">First Page Only (Single Thumbnail)</option>
          </select>
          <span style={{ fontSize: "0.72rem", color: "var(--secondary-text)", display: "block", marginTop: "0.35rem" }}>
            {pdfImageMode === "separate"
              ? "Exports all document pages into high-res images packaged in a clean ZIP download."
              : pdfImageMode === "stitch"
              ? "Vertically joins all pages into a continuous scrolling image."
              : "Renders only page 1 of the document."}
          </span>
        </div>
      )}

      {(!outputFormat || outputFormat === "original" || outputFormat === "pdf") && (
        <>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem" }}>
              Compression Profile
            </label>
            <select
              value={compressionLevel}
              onChange={(e) => onCompressionLevelChange(e.target.value as "low" | "balanced" | "maximum")}
              className="sharp-select"
            >
              <option value="low">Low Compression (Highest Visual Quality)</option>
              <option value="balanced">Balanced (Recommended for uploads & forms)</option>
              <option value="maximum">Maximum Compression (Smallest file size)</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <label className="sharp-checkbox-label">
              <input
                type="checkbox"
                checked={optimizeImages}
                onChange={(e) => onOptimizeImagesChange(e.target.checked)}
                className="sharp-checkbox"
              />
              <span>Recompress embedded raster images</span>
            </label>

            <label className="sharp-checkbox-label">
              <input
                type="checkbox"
                checked={removeMetadata}
                onChange={(e) => onRemoveMetadataChange(e.target.checked)}
                className="sharp-checkbox"
              />
              <span>Strip document metadata & author traces</span>
            </label>

            <label className="sharp-checkbox-label">
              <input
                type="checkbox"
                checked={preserveText}
                onChange={(e) => onPreserveTextChange(e.target.checked)}
                className="sharp-checkbox"
              />
              <span>Preserve searchable vector text (No flat rasterization)</span>
            </label>
          </div>
        </>
      )}
    </div>
  );
};
