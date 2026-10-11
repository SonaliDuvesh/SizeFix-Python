import React from "react";
import { FileText, X, RefreshCw, Layers } from "lucide-react";
import type { FileAnalysisResult } from "../types";

interface FileCardProps {
  analysis: FileAnalysisResult;
  filePreviewUrl?: string;
  onReplaceFile: () => void;
  onRemoveFile: () => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  analysis,
  filePreviewUrl,
  onReplaceFile,
  onRemoveFile,
}) => {
  const isImage = analysis.category === "image";
  const isPdf = analysis.category === "document";

  return (
    <div className="box-card mb-6" style={{ padding: "1.25rem", borderLeft: "6px solid var(--strong-raspberry)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "center", flex: 1, minWidth: "260px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              border: "2px solid var(--border-color)",
              background: "var(--bg-surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
              boxShadow: "2px 2px 0px var(--border-color)",
            }}
          >
            {isImage && filePreviewUrl ? (
              <img
                src={filePreviewUrl}
                alt="Preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : isPdf ? (
              <FileText size={36} color="var(--strong-raspberry)" />
            ) : (
              <Layers size={36} color="var(--secondary-text)" />
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span className="sharp-tag sharp-tag-raspberry">{analysis.extension.toUpperCase()}</span>
              <span style={{ fontSize: "1.05rem", fontWeight: 800, wordBreak: "break-all" }}>
                {analysis.filename}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
              <span className="mono" style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--strong-raspberry)" }}>
                {analysis.size_human}
              </span>

              {analysis.dimensions && (
                <span className="mono" style={{ fontSize: "0.85rem", color: "var(--secondary-text)" }}>
                  {analysis.dimensions.width} × {analysis.dimensions.height} px
                </span>
              )}

              {analysis.color_mode && (
                <span className="sharp-tag" style={{ fontSize: "0.7rem", background: "var(--bg-surface)" }}>
                  {analysis.color_mode}
                </span>
              )}

              {analysis.is_animated && (
                <span className="sharp-tag sharp-tag-raspberry" style={{ fontSize: "0.7rem" }}>
                  🎞️ {analysis.frame_count ? `${analysis.frame_count} frames` : "Animated"}
                </span>
              )}

              {analysis.pdf_pages && (
                <span className="sharp-tag" style={{ fontSize: "0.7rem", background: "var(--bg-surface)" }}>
                  {analysis.pdf_pages} {analysis.pdf_pages === 1 ? "page" : "pages"}
                </span>
              )}
            </div>

            {analysis.recommendations && analysis.recommendations.format && (
              <p style={{ fontSize: "0.8rem", color: "var(--secondary-text)", marginTop: "0.25rem", fontStyle: "italic" }}>
                Tip: {analysis.recommendations.format}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={onReplaceFile}
            className="btn-secondary"
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
            title="Replace with another file"
          >
            <RefreshCw size={14} /> Replace
          </button>
          <button
            onClick={onRemoveFile}
            className="btn-secondary"
            style={{ padding: "0.4rem 0.6rem", fontSize: "0.75rem", color: "var(--strong-raspberry)" }}
            title="Remove file"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
