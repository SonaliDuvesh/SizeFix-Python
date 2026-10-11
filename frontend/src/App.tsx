import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Zap } from "lucide-react";
import { Header } from "./components/Header";
import { DropZone } from "./components/DropZone";
import { FileCard } from "./components/FileCard";
import { TargetSizeControl } from "./components/TargetSizeControl";
import { TargetModeSelector } from "./components/TargetModeSelector";
import { ImageControls } from "./components/ImageControls";
import { PDFControls } from "./components/PDFControls";
import { ProcessingState } from "./components/ProcessingState";
import { ResultsComparison } from "./components/ResultsComparison";
import { ErrorBanner } from "./components/ErrorBanner";
import { HelpModal } from "./components/HelpModal";
import { ApiService } from "./services/api";
import type { FileAnalysisResult, ProcessResult, TargetUnit, TargetMode } from "./types";

export const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | undefined>(undefined);
  const [analysis, setAnalysis] = useState<FileAnalysisResult | null>(null);

  const [targetValue, setTargetValue] = useState<string>("");
  const [targetUnit, setTargetUnit] = useState<TargetUnit>("KB");
  const [targetMode, setTargetMode] = useState<TargetMode>("maximum");

  const [quality, setQuality] = useState<number>(80);
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);
  const [outputFormat, setOutputFormat] = useState<string>("original");
  const [removeMetadata, setRemoveMetadata] = useState<boolean>(true);
  const [progressive, setProgressive] = useState<boolean>(true);

  const [pdfCompressionLevel, setPdfCompressionLevel] = useState<"low" | "balanced" | "maximum">("balanced");
  const [pdfOptimizeImages, setPdfOptimizeImages] = useState<boolean>(true);
  const [pdfRemoveMeta, setPdfRemoveMeta] = useState<boolean>(true);
  const [pdfPreserveText, setPdfPreserveText] = useState<boolean>(true);
  const [pdfImageMode, setPdfImageMode] = useState<"separate" | "stitch" | "first_page">("separate");

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [darkMode]);

  const handleFileSelect = async (file: File) => {
    setErrorMessage(null);
    setProcessResult(null);
    setSelectedFile(file);
    setOutputFormat("original");

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isImg = file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "avif", "gif", "bmp", "tiff", "svg", "heic", "heif"].includes(ext);

    if (isImg) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(undefined);
    }

    if (file.size > 0) {
      if (file.size >= 1024 * 1024 * 1024) {
        setTargetValue((file.size / (1024 * 1024 * 1024)).toFixed(2));
        setTargetUnit("GB");
      } else if (file.size >= 1024 * 1024) {
        setTargetValue((file.size / (1024 * 1024)).toFixed(2));
        setTargetUnit("MB");
      } else {
        setTargetValue((file.size / 1024).toFixed(2));
        setTargetUnit("KB");
      }
    }

    setIsAnalyzing(true);
    try {
      const res = await ApiService.analyzeFile(file);
      setAnalysis(res);

      if (res.dimensions) {
        setWidth(String(res.dimensions.width));
        setHeight(String(res.dimensions.height));
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to analyze the selected file.");
      setSelectedFile(null);
      setAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setAnalysis(null);
    setProcessResult(null);
    setFilePreviewUrl(undefined);
    setWidth("");
    setHeight("");
    setOutputFormat("original");
    setErrorMessage(null);
  };

  const handleOptimize = async () => {
    if (!selectedFile || !analysis) return;
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf") || analysis.category === "document";
      const isPdfToImage = isPdf && (outputFormat === "jpg" || outputFormat === "jpeg" || outputFormat === "png" || outputFormat === "webp");
      const options = {
        target_size: targetValue ? `${targetValue} ${targetUnit}` : undefined,
        target_mode: targetMode,
        output_format: outputFormat !== "original" ? outputFormat : undefined,
        quality: isPdf && !isPdfToImage ? undefined : quality,
        width: width ? parseInt(width, 10) : undefined,
        height: height ? parseInt(height, 10) : undefined,
        maintain_aspect_ratio: maintainAspect,
        remove_metadata: isPdf ? pdfRemoveMeta : removeMetadata,
        progressive: progressive,
        pdf_compression_level: pdfCompressionLevel,
        pdf_optimize_images: pdfOptimizeImages,
        pdf_preserve_text: pdfPreserveText,
        pdf_image_mode: isPdfToImage ? pdfImageMode : undefined,
      };

      const res = await ApiService.processFile(selectedFile, options);
      setProcessResult(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to optimize file. Please verify settings and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app-container">
      <Header
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
        onOpenHelp={() => setHelpOpen(true)}
      />

      {errorMessage && (
        <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}

      {!processResult && (
        <div className={`main-workspace-grid ${!selectedFile ? "single-col" : ""}`}>
          
          <div>
            {!selectedFile ? (
              <DropZone onFileSelect={handleFileSelect} disabled={isAnalyzing} />
            ) : (
              analysis && (
                <>
                  <FileCard
                    analysis={analysis}
                    filePreviewUrl={filePreviewUrl}
                    onReplaceFile={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.onchange = (e: any) => {
                        if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                      };
                      input.click();
                    }}
                    onRemoveFile={handleClearFile}
                  />

                  {isProcessing && (
                    <ProcessingState category={analysis.category} />
                  )}

                  {!isProcessing && (
                    <div className="box-card-subtle" style={{ background: "var(--bg-card)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                        <Sparkles size={16} color="var(--strong-raspberry)" />
                        <h4 style={{ fontSize: "0.85rem", textTransform: "uppercase" }}>Optimization Engine</h4>
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "var(--secondary-text)" }}>
                        Adaptive binary-search quality tuning and micro-scaling execute seamlessly with SizeFix-Python to reach your target size with highest fidelity.
                      </p>
                    </div>
                  )}
                </>
              )
            )}
          </div>

          {selectedFile && analysis && (
            <div className="box-card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "2px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                <Zap size={20} color="var(--strong-raspberry)" />
                <h2 style={{ fontSize: "1.1rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Configuration & Settings
                </h2>
              </div>

              <TargetSizeControl
                targetValue={targetValue}
                targetUnit={targetUnit}
                onValueChange={setTargetValue}
                onUnitChange={setTargetUnit}
                originalSizeBytes={analysis.size_bytes}
              />

              <TargetModeSelector
                mode={targetMode}
                onModeChange={setTargetMode}
              />

              {analysis.category === "image" ? (
                <ImageControls
                  quality={quality}
                  onQualityChange={setQuality}
                  width={width}
                  height={height}
                  onWidthChange={setWidth}
                  onHeightChange={setHeight}
                  maintainAspect={maintainAspect}
                  onMaintainAspectChange={setMaintainAspect}
                  outputFormat={outputFormat}
                  onOutputFormatChange={setOutputFormat}
                  originalDimensions={analysis.dimensions}
                  removeMetadata={removeMetadata}
                  onRemoveMetadataChange={setRemoveMetadata}
                  progressive={progressive}
                  onProgressiveChange={setProgressive}
                />
              ) : analysis.category === "document" ? (
                <PDFControls
                  outputFormat={outputFormat}
                  onOutputFormatChange={setOutputFormat}
                  compressionLevel={pdfCompressionLevel}
                  onCompressionLevelChange={setPdfCompressionLevel}
                  optimizeImages={pdfOptimizeImages}
                  onOptimizeImagesChange={setPdfOptimizeImages}
                  removeMetadata={pdfRemoveMeta}
                  onRemoveMetadataChange={setPdfRemoveMeta}
                  preserveText={pdfPreserveText}
                  onPreserveTextChange={setPdfPreserveText}
                  pdfImageMode={pdfImageMode}
                  onPdfImageModeChange={setPdfImageMode}
                  pageCount={analysis.pdf_pages}
                />
              ) : null}

              <button
                type="button"
                onClick={handleOptimize}
                disabled={isProcessing}
                className="btn-primary"
                style={{
                  width: "100%",
                  padding: "1rem",
                  fontSize: "1.1rem",
                  marginTop: "0.5rem",
                  boxShadow: "4px 4px 0px var(--border-color)",
                }}
              >
                <span>{isProcessing ? "PROCESSING..." : "OPTIMIZE FILE NOW"}</span>
                <ArrowRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}

      {processResult && !isProcessing && (
        <ResultsComparison
          result={processResult}
          originalPreviewUrl={filePreviewUrl}
          onReset={handleClearFile}
        />
      )}

      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
};

export default App;
