import React, { useState, useRef } from "react";
import { AlertCircle, Download, RefreshCw, Copy, CheckCheck } from "lucide-react";
import confetti from "canvas-confetti";
import type { ProcessResult } from "../types";
import { ApiService } from "../services/api";

interface ResultsComparisonProps {
  result: ProcessResult;
  originalPreviewUrl?: string;
  onReset: () => void;
}

export const ResultsComparison: React.FC<ResultsComparisonProps> = ({
  result,
  originalPreviewUrl,
  onReset,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const initialAspectRatio =
    result.original_width && result.original_height
      ? result.original_width / result.original_height
      : result.width && result.height
      ? result.width / result.height
      : null;

  const [aspectRatio, setAspectRatio] = useState<number | null>(initialAspectRatio);
  const stageRef = useRef<HTMLDivElement>(null);

  const updatePosition = (clientX: number) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(Math.round(pct * 10) / 10);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging || e.buttons === 1) {
      updatePosition(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    if (result.target_reached || result.saved_bytes > 0) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#E94F7A", "#C92F5B", "#FFD6E2", "#8F2045"],
      });
    }
  }, [result]);

  const downloadUrl =
    result.blob_url ||
    result.download_url ||
    (result.output_file_id ? ApiService.getDownloadUrl(result.output_file_id) : "");

  const isImage = ["jpg", "jpeg", "png", "webp", "avif", "gif", "bmp"].includes(result.format.toLowerCase());
  const isExpanded = (result.saved_bytes ?? 0) < 0 || result.output_size > result.original_size;
  const absPct = Math.abs(result.compression_ratio * 100).toFixed(1);

  const handleCopyInfo = () => {
    const text = `SizeFix-Python Optimization: ${result.original_filename} (${result.original_size_human}) -> ${result.output_size_human} (${isExpanded ? `+${absPct}% larger` : `${absPct}% smaller`})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="box-card mb-6" style={{ padding: "1.75rem" }}>
      
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          background: result.target_reached ? "var(--accent-success-bg)" : "var(--soft-pink-1)",
          color: result.target_reached ? "var(--accent-success)" : "var(--dark-text)",
          border: `2px solid ${result.target_reached ? "var(--accent-success)" : "var(--border-color)"}`,
          padding: "0.85rem 1.25rem",
          boxShadow: "2px 2px 0px var(--border-color)",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {result.target_reached ? (
            <div style={{ background: "var(--accent-success)", color: "#FFFFFF", padding: "2px 6px", fontWeight: 900 }}>
              ✓
            </div>
          ) : (
            <AlertCircle size={20} color="var(--strong-raspberry)" />
          )}

          <span style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "0.95rem" }}>
            {result.target_reached
              ? `TARGET REACHED - ${result.output_size_human} ${result.target_size_human ? `/ ${result.target_size_human}` : ""}`
              : `TARGET ESTIMATE - ${result.output_size_human} (${result.reason || "Optimal encoding reached"})`}
          </span>
        </div>

        {result.target_size_human && (
          <span className="mono" style={{ fontSize: "0.8rem", fontWeight: 700 }}>
            Mode: {result.mode.toUpperCase()}
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <div className="box-card-subtle">
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--secondary-text)", textTransform: "uppercase" }}>
            ORIGINAL FILE
          </span>
          <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 900, marginTop: "0.2rem" }}>
            {result.original_size_human}
          </div>
          {result.original_width && result.original_height && (
            <span style={{ fontSize: "0.8rem", color: "var(--secondary-text)", fontWeight: 600 }}>
              {result.original_width} × {result.original_height} px
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--strong-raspberry)",
            color: "#FFFFFF",
            border: "2px solid var(--border-color)",
            padding: "0.5rem",
            boxShadow: "2px 2px 0px var(--border-color)",
          }}
        >
          <span style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase" }}>
            {isExpanded ? "EXPANDED" : "SAVED"}
          </span>
          <span className="mono" style={{ fontSize: "1.3rem", fontWeight: 900 }}>
            {result.saved_bytes_human}
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 800,
              background: "var(--bg-card)",
              color: "var(--strong-raspberry)",
              border: "1.5px solid var(--border-color)",
              padding: "1px 6px",
              marginTop: "2px",
            }}
          >
            {isExpanded ? `+${absPct}% LARGER` : `${absPct}% SMALLER`}
          </span>
        </div>

        <div className="box-card-subtle" style={{ borderColor: "var(--strong-raspberry)", borderLeftWidth: "6px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--strong-raspberry)", textTransform: "uppercase" }}>
            OPTIMIZED FILE
          </span>
          <div className="mono" style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--strong-raspberry)", marginTop: "0.2rem" }}>
            {result.output_size_human}
          </div>
          {result.width && result.height && (
            <span style={{ fontSize: "0.8rem", color: "var(--secondary-text)", fontWeight: 600 }}>
              {result.width} × {result.height} px ({result.format.toUpperCase()})
            </span>
          )}
          {result.pages && (
            <span style={{ fontSize: "0.8rem", color: "var(--secondary-text)", fontWeight: 600 }}>
              {result.pages} Pages • Deflated & Cleaned
            </span>
          )}
        </div>
      </div>

      {isImage && originalPreviewUrl && downloadUrl && (
        <div style={{ marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Visual Quality Inspection
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--secondary-text)", fontWeight: 600 }}>
              Drag slider to compare Original vs Optimized
            </span>
          </div>

          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              position: "relative",
              height: "380px",
              border: "2px solid var(--border-color)",
              boxShadow: "3px 3px 0px var(--border-color)",
              background: "#12040B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              userSelect: "none",
              WebkitUserSelect: "none",
              cursor: "ew-resize",
              touchAction: "none",
            }}
          >
            {/* Aspect-Ratio Matched Stage - perfectly aligns both images */}
            <div
              ref={stageRef}
              style={{
                position: "relative",
                height: "100%",
                maxWidth: "100%",
                aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
                overflow: "hidden",
                userSelect: "none",
                WebkitUserSelect: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Background: Optimized Image */}
              <img
                src={downloadUrl}
                alt="Optimized Preview"
                draggable={false}
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget;
                  if (naturalWidth && naturalHeight && !aspectRatio) {
                    setAspectRatio(naturalWidth / naturalHeight);
                  }
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "fill",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />

              {/* Foreground: Original Image clipped by slider position */}
              <img
                src={originalPreviewUrl}
                alt="Original Preview"
                draggable={false}
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget;
                  if (naturalWidth && naturalHeight && !aspectRatio) {
                    setAspectRatio(naturalWidth / naturalHeight);
                  }
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "fill",
                  clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                  WebkitClipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />

              {/* Vertical Divider Line */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${sliderPosition}%`,
                  width: "3px",
                  background: "var(--strong-raspberry)",
                  boxShadow: "0 0 8px rgba(0,0,0,0.8)",
                  transform: "translateX(-50%)",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              />

              {/* Center Drag Handle Badge */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: `${sliderPosition}%`,
                  transform: "translate(-50%, -50%)",
                  background: "var(--strong-raspberry)",
                  color: "#FFFFFF",
                  border: "2px solid #FFFFFF",
                  boxShadow: "2px 2px 0px var(--border-color)",
                  padding: "4px 8px",
                  fontWeight: 900,
                  fontSize: "0.75rem",
                  letterSpacing: "0.1em",
                  pointerEvents: "none",
                  zIndex: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <span>◀</span>
                <span>▶</span>
              </div>
            </div>

            {/* Accessible Hidden Slider */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              aria-label="Compare original and optimized image quality"
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: "hidden",
                clip: "rect(0, 0, 0, 0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
            />

            {/* Top Badges */}
            <div style={{ position: "absolute", top: 10, left: 10, pointerEvents: "none", zIndex: 7 }}>
              <span className="sharp-tag" style={{ background: "rgba(0,0,0,0.85)", color: "#FFFFFF", borderColor: "#FFF" }}>
                Original ({result.original_size_human})
              </span>
            </div>
            <div style={{ position: "absolute", top: 10, right: 10, pointerEvents: "none", zIndex: 7 }}>
              <span className="sharp-tag sharp-tag-raspberry" style={{ boxShadow: "2px 2px 0px #000" }}>
                Optimized ({result.output_size_human})
              </span>
            </div>
          </div>
        </div>
      )}

      {result.format.toLowerCase() === "txt" && (
        <div style={{ marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Extracted Searchable Text
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--secondary-text)", fontWeight: 600 }}>
              {result.pages ? `Extracted across ${result.pages} page(s)` : "Text Document"}
            </span>
          </div>
          <div
            className="box-card-subtle"
            style={{
              padding: "1rem",
              background: "var(--bg-card)",
              border: "2px solid var(--border-color)",
              boxShadow: "3px 3px 0px var(--border-color)",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              lineHeight: 1.6,
            }}
          >
            ✓ Text successfully extracted into <strong>{result.output_filename}</strong> ({result.output_size_human}). Click download below to save the full plain text file.
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          paddingTop: "1.25rem",
          borderTop: "2px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", flex: 1, minWidth: "260px" }}>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={result.output_filename || `optimized_${result.original_filename}`}
              className="btn-primary"
              style={{ padding: "0.85rem 1.75rem", fontSize: "1rem", flex: "1 1 auto" }}
            >
              <Download size={20} />
              DOWNLOAD OPTIMIZED FILE
            </a>
          )}

          <button
            type="button"
            onClick={handleCopyInfo}
            className="btn-secondary"
            title="Copy optimization summary"
            style={{ flex: "0 1 auto" }}
          >
            {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
            {copied ? "COPIED" : "COPY DETAILS"}
          </button>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="btn-secondary"
          style={{ width: "auto" }}
        >
          <RefreshCw size={16} /> PROCESS ANOTHER FILE
        </button>
      </div>
    </div>
  );
};
