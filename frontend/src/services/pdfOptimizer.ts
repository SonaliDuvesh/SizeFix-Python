import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from "pdf-lib";
import * as pako from "pako";
import type { ProcessRequestOptions, ProcessResult } from "../types";
import { formatBytes, parseTargetBytes } from "./sizeParser";

function extractTextFromPdfBytes(buffer: Uint8Array, pageCount: number): string {
  const latin1 = new TextDecoder("latin1");
  const raw = latin1.decode(buffer);
  const regex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  const lines: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = regex.exec(raw)) !== null) {
    const sIdx = raw.indexOf("stream", m.index);
    let start = sIdx + 6;
    if (buffer[start] === 13) start++;
    if (buffer[start] === 10) start++;
    let end = raw.indexOf("endstream", start);
    if (buffer[end - 1] === 10) end--;
    if (buffer[end - 1] === 13) end--;

    if (start < end && end <= buffer.length) {
      const chunk = buffer.subarray(start, end);
      let decomp = "";
      try {
        decomp = new TextDecoder("utf-8").decode(pako.inflate(chunk));
      } catch {
        decomp = latin1.decode(chunk);
      }

      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tm: RegExpExecArray | null;
      while ((tm = tjRegex.exec(decomp)) !== null) {
        lines.push(tm[1].replace(/\\([()\\])/g, "$1"));
      }

      const tjArrRegex = /\[([^\]]*)\]\s*TJ/g;
      while ((tm = tjArrRegex.exec(decomp)) !== null) {
        const inner = tm[1];
        const partRegex = /\(([^)]*)\)|<([0-9a-fA-F]+)>/g;
        let pm: RegExpExecArray | null;
        const parts: string[] = [];
        while ((pm = partRegex.exec(inner)) !== null) {
          if (pm[1] !== undefined) {
            parts.push(pm[1].replace(/\\([()\\])/g, "$1"));
          } else if (pm[2] !== undefined) {
            const hex = pm[2];
            let s = "";
            for (let i = 0; i < hex.length; i += 2) {
              s += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            }
            parts.push(s);
          }
        }
        if (parts.length > 0) lines.push(parts.join(""));
      }

      const hexTjRegex = /<([0-9a-fA-F]+)>\s*Tj/g;
      while ((tm = hexTjRegex.exec(decomp)) !== null) {
        const hex = tm[1];
        let s = "";
        for (let i = 0; i < hex.length; i += 2) {
          s += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        lines.push(s);
      }
    }
  }

  const cleanText = lines.map((l) => l.trim()).filter(Boolean).join("\n");
  if (cleanText) return cleanText;
  return `--- Extracted Document ---\nPages: ${pageCount}\n(No plain text streams detected; file may contain scanned or rasterized imagery).`;
}

function unfilterPngPredictor(
  data: Uint8Array,
  width: number,
  height: number,
  bytesPerPixel: number
): Uint8Array {
  const stride = 1 + width * bytesPerPixel;
  const out = new Uint8Array(width * height * bytesPerPixel);
  let prevRow = new Uint8Array(width * bytesPerPixel);

  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    if (rowStart + stride > data.length) break;
    const filterType = data[rowStart];
    const currentRow = new Uint8Array(width * bytesPerPixel);

    for (let i = 0; i < width * bytesPerPixel; i++) {
      const raw = data[rowStart + 1 + i];
      const left = i >= bytesPerPixel ? currentRow[i - bytesPerPixel] : 0;
      const up = prevRow[i];
      const upLeft = i >= bytesPerPixel ? prevRow[i - bytesPerPixel] : 0;

      let val = raw;
      if (filterType === 1) {
        val = (raw + left) & 0xff;
      } else if (filterType === 2) {
        val = (raw + up) & 0xff;
      } else if (filterType === 3) {
        val = (raw + Math.floor((left + up) / 2)) & 0xff;
      } else if (filterType === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        let pr = left;
        if (pb < pa && pb <= pc) pr = up;
        else if (pc < pa && pc < pb) pr = upLeft;
        val = (raw + pr) & 0xff;
      }
      currentRow[i] = val;
      out[y * width * bytesPerPixel + i] = val;
    }
    prevRow = currentRow;
  }
  return out;
}

async function decodeImageToCanvas(
  rawBytes: Uint8Array,
  filterName: string,
  width: number,
  height: number,
  colorSpace: string
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number } | null> {
  if (filterName === "/DCTDecode") {
    const blob = new Blob([rawBytes as BlobPart], { type: "image/jpeg" });
    if (typeof createImageBitmap !== "undefined") {
      try {
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
          const w = bitmap.width;
          const h = bitmap.height;
          bitmap.close();
          return { canvas, width: w, height: h };
        }
      } catch {
        // Fall back to Image
      }
    }

    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve({ canvas, width: canvas.width, height: canvas.height });
        } else {
          resolve(null);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  let pixelData = rawBytes;
  if (filterName === "/FlateDecode") {
    try {
      pixelData = pako.inflate(rawBytes);
    } catch {
      return null;
    }
  }

  if (pixelData.length > 4) {
    if (
      (pixelData[0] === 0xff && pixelData[1] === 0xd8) ||
      (pixelData[0] === 0x89 && pixelData[1] === 0x50 && pixelData[2] === 0x4e && pixelData[3] === 0x47)
    ) {
      const mime = pixelData[0] === 0xff ? "image/jpeg" : "image/png";
      const blob = new Blob([pixelData as BlobPart], { type: mime });
      if (typeof createImageBitmap !== "undefined") {
        try {
          const bitmap = await createImageBitmap(blob);
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(bitmap, 0, 0);
            const w = bitmap.width;
            const h = bitmap.height;
            bitmap.close();
            return { canvas, width: w, height: h };
          }
        } catch {
          // Continue to raw parsing
        }
      }
    }
  }

  if (width > 0 && height > 0) {
    const isGray = colorSpace === "/DeviceGray";
    const bytesPerPixel = isGray ? 1 : 3;

    let uncompressed = pixelData;
    if (pixelData.length === (1 + width * bytesPerPixel) * height) {
      uncompressed = unfilterPngPredictor(pixelData, width, height, bytesPerPixel);
    }

    if (uncompressed.length >= width * height * bytesPerPixel) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const imgData = ctx.createImageData(width, height);
      let srcIdx = 0;
      let dstIdx = 0;

      if (isGray) {
        for (let i = 0; i < width * height; i++) {
          const v = uncompressed[srcIdx++];
          imgData.data[dstIdx++] = v;
          imgData.data[dstIdx++] = v;
          imgData.data[dstIdx++] = v;
          imgData.data[dstIdx++] = 255;
        }
      } else {
        for (let i = 0; i < width * height; i++) {
          imgData.data[dstIdx++] = uncompressed[srcIdx++];
          imgData.data[dstIdx++] = uncompressed[srcIdx++];
          imgData.data[dstIdx++] = uncompressed[srcIdx++];
          imgData.data[dstIdx++] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return { canvas, width, height };
    }
  }

  return null;
}

async function compressCanvasToJpeg(
  sourceCanvas: HTMLCanvasElement,
  srcW: number,
  srcH: number,
  quality: number,
  maxDim?: number,
  scaleMultiplier: number = 1.0
): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  let targetW = Math.max(1, Math.round(srcW * scaleMultiplier));
  let targetH = Math.max(1, Math.round(srcH * scaleMultiplier));

  if (maxDim && (targetW > maxDim || targetH > maxDim)) {
    const scale = Math.min(maxDim / targetW, maxDim / targetH);
    targetW = Math.max(1, Math.round(targetW * scale));
    targetH = Math.max(1, Math.round(targetH * scale));
  }

  let renderCanvas = sourceCanvas;
  if (targetW !== srcW || targetH !== srcH) {
    renderCanvas = document.createElement("canvas");
    renderCanvas.width = targetW;
    renderCanvas.height = targetH;
    const ctx = renderCanvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sourceCanvas, 0, 0, targetW, targetH);
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    renderCanvas.toBlob(resolve, "image/jpeg", quality);
  });
  if (!blob) return null;

  const ab = await blob.arrayBuffer();
  return {
    bytes: new Uint8Array(ab),
    width: targetW,
    height: targetH,
  };
}

async function compressEmbeddedPdfImages(
  pdfDoc: PDFDocument,
  quality: number,
  maxDim?: number,
  scaleMultiplier: number = 1.0
): Promise<number> {
  let count = 0;

  for (const [ref, obj] of pdfDoc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream && obj.dict) {
      const subtype = obj.dict.get(PDFName.of("Subtype"))?.toString();
      if (subtype === "/Image") {
        try {
          const filter = obj.dict.get(PDFName.of("Filter"))?.toString() || "";
          const colorSpace = obj.dict.get(PDFName.of("ColorSpace"))?.toString() || "/DeviceRGB";
          const origW = Number(obj.dict.get(PDFName.of("Width"))?.toString() || 0);
          const origH = Number(obj.dict.get(PDFName.of("Height"))?.toString() || 0);
          const rawBytes = obj.asUint8Array();

          if (!rawBytes || rawBytes.length === 0) continue;

          const decoded = await decodeImageToCanvas(rawBytes, filter, origW, origH, colorSpace);
          if (!decoded) continue;

          const compressed = await compressCanvasToJpeg(
            decoded.canvas,
            decoded.width,
            decoded.height,
            quality,
            maxDim,
            scaleMultiplier
          );

          if (compressed && compressed.bytes.byteLength < rawBytes.byteLength) {
            const newDict = obj.dict.clone();
            newDict.set(PDFName.of("Width"), PDFNumber.of(compressed.width));
            newDict.set(PDFName.of("Height"), PDFNumber.of(compressed.height));
            newDict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
            newDict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
            newDict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
            newDict.set(PDFName.of("Length"), PDFNumber.of(compressed.bytes.byteLength));
            newDict.delete(PDFName.of("DecodeParms"));
            newDict.delete(PDFName.of("Mask"));

            const newStream = PDFRawStream.of(newDict, compressed.bytes);
            pdfDoc.context.assign(ref, newStream);
            count++;
          }
        } catch {
          // If a particular image cannot be re-encoded, preserve it intact
          continue;
        }
      }
    }
  }

  return count;
}

async function savePdfOptimized(pdfDoc: PDFDocument): Promise<Uint8Array> {
  try {
    return await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
  } catch {
    return await pdfDoc.save({ useObjectStreams: false, addDefaultPage: false });
  }
}

export async function processPdfInBrowser(
  file: File,
  options: ProcessRequestOptions
): Promise<ProcessResult> {
  const originalSize = file.size;
  const originalFilename = file.name;
  const arrayBuffer = await file.arrayBuffer();

  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
  });

  const pageCount = pdfDoc.getPageCount();

  // If TXT format is requested, extract searchable text with precision sizing
  if (options.output_format === "txt") {
    const uint8Buf = new Uint8Array(arrayBuffer);
    const textContent = extractTextFromPdfBytes(uint8Buf, pageCount);
    const targetBytes = parseTargetBytes(options.target_size, options.target_value, options.target_unit);
    const targetMode = options.target_mode || "maximum";

    let finalBytes = new TextEncoder().encode(textContent);
    let targetReached = true;
    let reason = `Extracted text across ${pageCount} page(s)`;

    if (targetBytes && targetBytes > 0) {
      if (targetMode === "exact") {
        if (finalBytes.byteLength < targetBytes) {
          const padNeeded = targetBytes - finalBytes.byteLength;
          const headerStr = "\n\n--- [SizeFix Target Size Pad] ---\n";
          const headerBytes = new TextEncoder().encode(headerStr);
          const padded = new Uint8Array(targetBytes);
          padded.set(finalBytes, 0);

          if (padNeeded >= headerBytes.byteLength) {
            padded.set(headerBytes, finalBytes.byteLength);
            padded.fill(0x20, finalBytes.byteLength + headerBytes.byteLength, targetBytes);
          } else {
            padded.fill(0x20, finalBytes.byteLength, targetBytes);
          }
          finalBytes = padded;
          targetReached = true;
          reason = `Extracted text and padded to exact target (${formatBytes(targetBytes)})`;
        } else if (finalBytes.byteLength > targetBytes) {
          targetReached = false;
          reason = `Extracted text (${formatBytes(finalBytes.byteLength)}) exceeds exact target (${formatBytes(targetBytes)})`;
        }
      } else if (targetMode === "maximum") {
        if (finalBytes.byteLength > targetBytes) {
          const notice = new TextEncoder().encode("\n\n[...Truncated to meet target maximum limit...]");
          if (targetBytes > notice.byteLength) {
            const trimmed = new Uint8Array(targetBytes);
            trimmed.set(finalBytes.subarray(0, targetBytes - notice.byteLength), 0);
            trimmed.set(notice, targetBytes - notice.byteLength);
            finalBytes = trimmed;
          } else {
            finalBytes = finalBytes.subarray(0, targetBytes);
          }
          targetReached = true;
          reason = `Extracted text trimmed to meet maximum limit (${formatBytes(targetBytes)})`;
        } else {
          targetReached = true;
          reason = `Extracted text (${formatBytes(finalBytes.byteLength)}) is within maximum limit (${formatBytes(targetBytes)})`;
        }
      } else if (targetMode === "range") {
        targetReached = Math.abs(finalBytes.byteLength - targetBytes) / targetBytes <= 0.1;
      }
    }

    const textBlob = new Blob([finalBytes as BlobPart], { type: "text/plain;charset=utf-8" });
    const outputSize = textBlob.size;
    const blobUrl = URL.createObjectURL(textBlob);
    const savedBytes = originalSize - outputSize;
    const compressionRatio = originalSize > 0 ? (originalSize - outputSize) / originalSize : 0;
    const outFilename = `extracted_${originalFilename.replace(/\.[^/.]+$/, "")}.txt`;

    return {
      success: true,
      original_filename: originalFilename,
      output_filename: outFilename,
      original_size: originalSize,
      original_size_human: formatBytes(originalSize),
      output_size: outputSize,
      output_size_human: formatBytes(outputSize),
      target_size: targetBytes || undefined,
      target_size_human: targetBytes ? formatBytes(targetBytes) : undefined,
      target_reached: targetReached,
      compression_ratio: compressionRatio,
      saved_bytes: savedBytes,
      saved_bytes_human: formatBytes(Math.abs(savedBytes)),
      format: "TXT",
      mode: targetMode,
      reason,
      pages: pageCount,
      blob_url: blobUrl,
      download_url: blobUrl,
    };
  }

  const outFilename = `optimized_${originalFilename.replace(/\.[^/.]+$/, "")}.pdf`;
  const targetBytes = parseTargetBytes(options.target_size, options.target_value, options.target_unit);
  const targetMode = options.target_mode || "maximum";

  let finalUint8Array: Uint8Array = new Uint8Array(arrayBuffer);
  let imagesOptimized = 0;
  let targetReached = true;
  let reason = "PDF structure compressed and optimized";

  // Sanitize document catalog metadata if requested
  const sanitizeDoc = (doc: PDFDocument) => {
    if (options.remove_metadata !== false) {
      try {
        doc.setTitle("");
        doc.setAuthor("");
        doc.setSubject("");
        doc.setKeywords([]);
        doc.setProducer("SizeFix Engine");
        doc.setCreator("SizeFix Engine");
      } catch {
        // Ignore metadata clearance error
      }
    }
  };

  if (targetBytes && targetBytes > 0 && targetBytes < originalSize) {
    // Adaptive multi-stage search to hit target size
    const qualityStages = [
      { quality: 0.85, maxDim: 2000 },
      { quality: 0.70, maxDim: 1500 },
      { quality: 0.55, maxDim: 1100 },
      { quality: 0.40, maxDim: 800 },
      { quality: 0.25, maxDim: 500 },
    ];

    let bestBytes: Uint8Array | null = null;
    let bestDiff = Infinity;
    let bestImgCount = 0;

    for (const stage of qualityStages) {
      try {
        const iterDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        sanitizeDoc(iterDoc);

        let imgCount = 0;
        if (options.pdf_optimize_images !== false) {
          imgCount = await compressEmbeddedPdfImages(iterDoc, stage.quality, stage.maxDim);
        }

        const candidateBytes = await savePdfOptimized(iterDoc);
        const curSize = candidateBytes.byteLength;
        const diff = Math.abs(curSize - targetBytes);

        if (diff < bestDiff) {
          bestDiff = diff;
          bestBytes = candidateBytes;
          bestImgCount = imgCount;
        }

        if (targetMode === "maximum" && curSize <= targetBytes) {
          bestBytes = candidateBytes;
          bestImgCount = imgCount;
          break;
        } else if (targetMode === "exact" && diff / targetBytes <= 0.03) {
          bestBytes = candidateBytes;
          bestImgCount = imgCount;
          break;
        }
      } catch {
        continue;
      }
    }

    if (bestBytes && bestBytes.byteLength < originalSize) {
      finalUint8Array = bestBytes;
      imagesOptimized = bestImgCount;
    } else {
      // Fall back to standard compression if search did not yield smaller bytes
      sanitizeDoc(pdfDoc);
      if (options.pdf_optimize_images !== false) {
        imagesOptimized = await compressEmbeddedPdfImages(pdfDoc, 0.65, 1400);
      }
      const saved = await savePdfOptimized(pdfDoc);
      if (saved.byteLength < originalSize) {
        finalUint8Array = saved;
      }
    }

    if (targetMode === "maximum") {
      targetReached = finalUint8Array.byteLength <= targetBytes;
      reason = targetReached
        ? `PDF compressed within maximum target limit (${formatBytes(finalUint8Array.byteLength)})`
        : `Closest achievable PDF size is ${formatBytes(finalUint8Array.byteLength)} (${formatBytes(finalUint8Array.byteLength - targetBytes)} above target)`;
    } else if (targetMode === "range") {
      targetReached = Math.abs(finalUint8Array.byteLength - targetBytes) / targetBytes <= 0.1;
      reason = targetReached
        ? `PDF compressed to target range (${formatBytes(finalUint8Array.byteLength)})`
        : `PDF compressed to optimal structure (${formatBytes(finalUint8Array.byteLength)})`;
    }
  } else {
    // Normal compression without target size or target size >= original
    const level = options.pdf_compression_level || "balanced";
    const qualityMap: Record<string, { quality: number; maxDim?: number; scaleMultiplier: number }> = {
      low: { quality: 0.85, maxDim: 2000, scaleMultiplier: 1.0 },
      balanced: { quality: 0.65, maxDim: 1200, scaleMultiplier: 0.80 },
      maximum: { quality: 0.35, maxDim: 800, scaleMultiplier: 0.60 },
    };

    let { quality, maxDim, scaleMultiplier } = qualityMap[level] || qualityMap.balanced;
    if (options.pdf_compression_level === undefined && options.quality !== undefined) {
      quality = Math.max(0.1, Math.min(1.0, options.quality / 100));
    }

    sanitizeDoc(pdfDoc);
    if (options.pdf_optimize_images !== false) {
      imagesOptimized = await compressEmbeddedPdfImages(pdfDoc, quality, maxDim, scaleMultiplier);
    }

    const saved = await savePdfOptimized(pdfDoc);
    if (saved.byteLength < originalSize) {
      finalUint8Array = saved;
      reason = `PDF structure and ${imagesOptimized} embedded image(s) compressed using '${level}' profile`;
    } else if (imagesOptimized > 0) {
      finalUint8Array = saved;
      reason = `PDF optimized (${imagesOptimized} embedded image(s) processed)`;
    } else {
      // If PDF was already tight with no images, keep original bytes so it never grows
      finalUint8Array = new Uint8Array(arrayBuffer);
      reason = "PDF already fully compacted to optimal structure";
    }
  }

  // Exact target size expansion (padding) when requested
  if (targetBytes && targetBytes > 0) {
    if (targetMode === "exact" && finalUint8Array.byteLength < targetBytes) {
      const padNeeded = targetBytes - finalUint8Array.byteLength;
      if (padNeeded > 0) {
        const headerStr = "\n% SizeFix_PADDING ";
        const headerBytes = new TextEncoder().encode(headerStr);
        const padded = new Uint8Array(targetBytes);
        padded.set(finalUint8Array, 0);

        if (padNeeded >= headerBytes.byteLength) {
          padded.set(headerBytes, finalUint8Array.byteLength);
          padded.fill(0x30, finalUint8Array.byteLength + headerBytes.byteLength, targetBytes);
        } else {
          padded.fill(0x20, finalUint8Array.byteLength, targetBytes);
        }
        finalUint8Array = padded;
        targetReached = true;
        reason = `Padded to exact target byte size (${formatBytes(targetBytes)})`;
      }
    } else if (targetMode === "exact") {
      targetReached = Math.abs(finalUint8Array.byteLength - targetBytes) / targetBytes <= 0.03;
    }
  }

  const exactBuffer = finalUint8Array.buffer.slice(
    finalUint8Array.byteOffset,
    finalUint8Array.byteOffset + finalUint8Array.byteLength
  ) as ArrayBuffer;
  const outputBlob = new Blob([exactBuffer], { type: "application/pdf" });
  const outputSize = outputBlob.size;
  const blobUrl = URL.createObjectURL(outputBlob);
  const savedBytes = originalSize - outputSize;
  const compressionRatio = originalSize > 0 ? (originalSize - outputSize) / originalSize : 0;

  return {
    success: true,
    original_filename: originalFilename,
    output_filename: outFilename,
    original_size: originalSize,
    original_size_human: formatBytes(originalSize),
    output_size: outputSize,
    output_size_human: formatBytes(outputSize),
    target_size: targetBytes || undefined,
    target_size_human: targetBytes ? formatBytes(targetBytes) : undefined,
    target_reached: targetReached,
    compression_ratio: compressionRatio,
    saved_bytes: savedBytes,
    saved_bytes_human: formatBytes(Math.abs(savedBytes)),
    format: "PDF",
    mode: targetMode,
    reason,
    pages: pageCount,
    blob_url: blobUrl,
    download_url: blobUrl,
  };
}
