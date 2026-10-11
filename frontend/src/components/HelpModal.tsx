import React from "react";
import { X, BookOpen, Target, Sliders, RefreshCw, FileText, ShieldCheck, CheckCircle2 } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(53, 20, 31, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        className="box-card"
        style={{
          maxWidth: "760px",
          width: "100%",
          maxHeight: "88vh",
          overflowY: "auto",
          padding: "2rem",
          background: "var(--bg-main)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "2px solid var(--border-color)", paddingBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <BookOpen size={22} color="var(--strong-raspberry)" />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              SizeFix-Python Guide & Use Cases
            </h2>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: "0.3rem 0.5rem" }} title="Close">
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", fontSize: "0.9rem" }}>
          
          {/* SECTION 1: TARGET SIZE MODES (PRIMARY USER FOCUS) */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
              <Target size={18} color="var(--strong-raspberry)" />
              <h3 style={{ fontSize: "1rem", fontWeight: 800, textTransform: "uppercase", color: "var(--strong-raspberry)" }}>
                Optimization Modes & Use Cases
              </h3>
            </div>
            <p style={{ color: "var(--secondary-text)", marginBottom: "0.85rem", fontSize: "0.85rem" }}>
              Choose the mode that matches the requirements of your submission portal or application:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              
              {/* MAXIMUM SIZE */}
              <div className="box-card-subtle" style={{ padding: "0.9rem 1.1rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.35rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--dark-text)" }}>
                    1. Maximum Size (Target Cap)
                  </span>
                  <span className="sharp-tag sharp-tag-success" style={{ fontSize: "0.7rem" }}>
                    Most Popular
                  </span>
                </div>
                <p style={{ marginBottom: "0.4rem" }}>
                  <strong>How it works:</strong> Helps ensure the file size stays within your chosen target (e.g. 100 KB, 500 KB, 2 MB). If your file is already smaller than the target, it preserves its original quality without extra reduction.
                </p>
                <div style={{ background: "var(--bg-card)", padding: "0.5rem 0.75rem", borderLeft: "3px solid var(--strong-raspberry)", fontSize: "0.82rem" }}>
                  <strong>Ideal Use Cases:</strong>
                  <ul style={{ paddingLeft: "1.2rem", marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <li><strong>Government & Exam Portals:</strong> Helpful for portals (such as UPSC, SSC, State PSC, Passport Seva, and Visa forms) requesting files under a specified size (e.g. <em>"Photo under 50 KB"</em>, <em>"Certificate under 200 KB"</em>).</li>
                    <li><strong>Email Attachments:</strong> Compressing PDFs and photos to easily fit within standard email attachment limits (e.g. 20 MB or 25 MB).</li>
                    <li><strong>Job Applications:</strong> Resume and CV uploads that have upload size limits (e.g. <em>"Max 2 MB PDF"</em>).</li>
                  </ul>
                </div>
              </div>

              {/* CLOSEST SIZE */}
              <div className="box-card-subtle" style={{ padding: "0.9rem 1.1rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.35rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--dark-text)" }}>
                    2. Closest Size (Precision Sizing & Size Increase)
                  </span>
                  <span className="sharp-tag" style={{ fontSize: "0.7rem" }}>
                    Precision & Padding
                  </span>
                </div>
                <p style={{ marginBottom: "0.4rem" }}>
                  <strong>How it works:</strong> Aims to match your exact target byte size as closely as possible. If the file is smaller than your target, it safely expands the file to the exact byte count using non-destructive formatting (clean padding without altering visible pixels or pages).
                </p>
                <div style={{ background: "var(--bg-card)", padding: "0.5rem 0.75rem", borderLeft: "3px solid var(--primary-pink)", fontSize: "0.82rem" }}>
                  <strong>Ideal Use Cases:</strong>
                  <ul style={{ paddingLeft: "1.2rem", marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <li><strong>Strict Portals with Minimum Size Gates:</strong> Portals requiring a specific minimum size (e.g. <em>"File size must be at least 50 KB"</em> or <em>"Between 100 KB and 100 KB"</em>). If your scan is only 15 KB, this expands it safely to 100 KB.</li>
                    <li><strong>Automated Ingestion Systems:</strong> Testing upload pipelines, legacy backend validators that check exact byte thresholds, or meeting fixed storage allocation brackets.</li>
                  </ul>
                </div>
              </div>

              {/* SIZE RANGE */}
              <div className="box-card-subtle" style={{ padding: "0.9rem 1.1rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.35rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--dark-text)" }}>
                    3. Size Range (Tolerance Bracket)
                  </span>
                  <span className="sharp-tag" style={{ fontSize: "0.7rem" }}>
                    Balanced Quality
                  </span>
                </div>
                <p style={{ marginBottom: "0.4rem" }}>
                  <strong>How it works:</strong> Optimizes the file to sit comfortably within a ±5% to 10% tolerance band around your target. It preserves maximum visual fidelity without overly aggressive compression.
                </p>
                <div style={{ background: "var(--bg-card)", padding: "0.5rem 0.75rem", borderLeft: "3px solid var(--secondary-text)", fontSize: "0.82rem" }}>
                  <strong>Ideal Use Cases:</strong>
                  <ul style={{ paddingLeft: "1.2rem", marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <li><strong>Web Asset Budgets:</strong> Preparing hero images, blog graphics, or catalog photos targeted for a reasonable web budget (e.g. ~150 KB) without harsh compression artifacts.</li>
                    <li><strong>General Sharing:</strong> Messaging apps, Discord, or team drives where a ballpark size is preferred while keeping maximum crispness.</li>
                  </ul>
                </div>
              </div>

            </div>
          </section>

          {/* SECTION 2: DIMENSION RESIZING */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
              <Sliders size={18} color="var(--strong-raspberry)" />
              <h3 style={{ fontSize: "1rem", fontWeight: 800, textTransform: "uppercase", color: "var(--strong-raspberry)" }}>
                Dimension Resizing & Aspect Ratio
              </h3>
            </div>
            <div className="box-card-subtle" style={{ padding: "0.85rem 1rem", fontSize: "0.85rem" }}>
              <ul style={{ paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <li><strong>Passport & ID Photos:</strong> Set exact pixel requirements (e.g. 600×600 px for US Visa, 350×450 px for Indian passports).</li>
                <li><strong>Social Media & Banners:</strong> Quick resizing for YouTube thumbnails (1280×720 px), Instagram posts (1080×1080 px), or OpenGraph headers (1200×630 px).</li>
                <li><strong>Aspect Ratio Lock:</strong> Enable <em>"Maintain Aspect Ratio"</em> to automatically calculate width or height and prevent stretched or squished faces.</li>
              </ul>
            </div>
          </section>

          {/* SECTION 3: FORMAT CONVERSION */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
              <RefreshCw size={18} color="var(--strong-raspberry)" />
              <h3 style={{ fontSize: "1rem", fontWeight: 800, textTransform: "uppercase", color: "var(--strong-raspberry)" }}>
                Format Conversion Guide
              </h3>
            </div>
            <div className="box-card-subtle" style={{ padding: "0.85rem 1rem", fontSize: "0.85rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.6rem" }}>
                <div>
                  <strong>JPG / JPEG:</strong> Best for real-world photos, portraits, and portal submissions with universal compatibility.
                </div>
                <div>
                  <strong>PNG:</strong> Lossless graphics with transparency support. Ideal for diagrams, logos, and crisp digital art.
                </div>
                <div>
                  <strong>WEBP / AVIF:</strong> Modern web formats offering 30–50% smaller sizes than JPG/PNG with equal visual fidelity.
                </div>
                <div>
                  <strong>PDF to Image:</strong> Converts first document page into crisp JPG, PNG, or WEBP for sharing or quick previews.
                </div>
                <div>
                  <strong>PDF to Searchable TXT:</strong> Extracts pure text from multi-page documents, dropping heavy scan weights.
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: PDF TUNING & PRIVACY */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
              <FileText size={18} color="var(--strong-raspberry)" />
              <h3 style={{ fontSize: "1rem", fontWeight: 800, textTransform: "uppercase", color: "var(--strong-raspberry)" }}>
                PDF Tuning & Metadata Sanitization
              </h3>
            </div>
            <div className="box-card-subtle" style={{ padding: "0.85rem 1rem", fontSize: "0.85rem" }}>
              <ul style={{ paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <li><strong>Recompress Embedded Raster Images:</strong> Shrinks bloated scanned PDFs by intelligently downsampling and recompressing embedded photos while leaving vector typography untouched.</li>
                <li><strong>Strip Document Metadata:</strong> Erases author details, software versions, edit histories, camera EXIF, and GPS tags before sharing files publicly.</li>
                <li><strong>Visual Inspection Comparison:</strong> Use the interactive Before/After split slider on results to verify visual sharpness and text clarity before downloading.</li>
              </ul>
            </div>
          </section>

          {/* SECTION 5: PRIVACY */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <ShieldCheck size={18} color="var(--accent-success)" />
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, textTransform: "uppercase", color: "var(--accent-success)" }}>
                100% In-Browser Privacy
              </h3>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--secondary-text)" }}>
              All image and document processing runs directly inside your browser. No files, personal identity traces, or photos are ever uploaded to cloud servers or third parties.
            </p>
          </section>

        </div>

        <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn-primary" style={{ padding: "0.6rem 1.8rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            <CheckCircle2 size={16} />
            <span>GOT IT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
