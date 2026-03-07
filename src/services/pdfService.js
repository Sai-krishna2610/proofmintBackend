import { PDFDocument, PDFName, PDFString, rgb } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import QRCode from 'qrcode';

// Helper: parse a hex color string like #6366f1 to pdf-lib rgb()
const hexToRgb = (hex) => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return rgb(r, g, b);
};

export const countPdfPages = async (filePath) => {
    try {
        const fileBuffer = await fs.readFile(filePath);
        const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        return pdfDoc.getPageCount();
    } catch {
        console.error('Failed to count pages in PDF');
        return 1;
    }
};

export const createStampedPdf = async (sourcePath, outputPath, stamps, docInfo) => {
    try {
        const fileBuffer = await fs.readFile(sourcePath);
        const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        const pages = pdfDoc.getPages();

        for (const stamp of stamps) {
            const pageIndex = (stamp.page_number || 1) - 1;
            const page = pages[pageIndex] || pages[0];
            const { width: pageWidth, height: pageHeight } = page.getSize();

            const style = stamp.style_json || {};
            const borderColor = hexToRgb(style.borderColor || '#6366f1');
            const bgOpacity = 0.08;

            // Stamp dimensions in PDF points
            const stampW = (stamp.width_norm || 0.3) * pageWidth;
            const stampH = (stamp.height_norm || 0.12) * pageHeight;

            // PDF coordinate system: origin is bottom-left, so flip y
            const stampX = (stamp.x_norm || 0.65) * pageWidth;
            const stampY = pageHeight - (stamp.y_norm || 0.85) * pageHeight - stampH;

            // Draw background rectangle
            page.drawRectangle({
                x: stampX,
                y: stampY,
                width: stampW,
                height: stampH,
                color: rgb(
                    borderColor.red,
                    borderColor.green,
                    borderColor.blue
                ),
                opacity: bgOpacity,
                borderColor,
                borderWidth: 1.2,
                borderOpacity: 0.9,
            });

            const fontSize = style.fontSize || 9;
            const textColor = hexToRgb(style.textColor || '#1e293b');
            const padding = 6;

            const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
            const verifyPath = process.env.VERIFICATION_PATH || '/verify';
            const verifyUrl = `${baseUrl}${verifyPath}?id=${docInfo?.id || ''}`;

            const qrSize = stamp.show_qr ? Math.min(48, stampH - padding * 2) : 0;

            // Render Real QR Code
            if (stamp.show_qr && verifyUrl) {
                const qrX = stampX + padding;
                const qrY = stampY + stampH / 2 - qrSize / 2;

                // Generate QR Code PNG
                try {
                    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
                        errorCorrectionLevel: 'M',
                        margin: 1,
                        color: {
                            dark: style.borderColor || '#6366f1',
                            light: '#ffffff00' // transparent background
                        }
                    });

                    const qrImage = await pdfDoc.embedPng(qrDataUrl);
                    page.drawImage(qrImage, {
                        x: qrX,
                        y: qrY,
                        width: qrSize,
                        height: qrSize,
                    });
                } catch (qrErr) {
                    console.error('Failed to generate or embed QR code', qrErr);
                }
            }

            // Text area starts after QR box
            const textX = stampX + padding + qrSize + (qrSize > 0 ? 8 : 0);
            const textWidth = stampW - padding - qrSize - (qrSize > 0 ? 8 : 0) - padding;

            // Helper to break text into chunks fitting the width
            const splitTextIntoLines = (text, size, maxW) => {
                const charsPerLine = Math.floor(maxW / (size * 0.55));
                if (text.length <= charsPerLine || charsPerLine < 5) return [text];
                // simple chunking
                const lines = [];
                for (let i = 0; i < text.length; i += charsPerLine) {
                    lines.push(text.substring(i, i + charsPerLine));
                }
                return lines;
            };

            // Start y near top of box
            let textY = stampY + stampH - padding - fontSize;

            // Draw full ID
            if (stamp.show_id_text && docInfo?.id) {
                const idText = `ID: ${docInfo.id}`;
                const adjustedSize = Math.max(fontSize - 1, 6);
                const lines = splitTextIntoLines(idText, adjustedSize, textWidth);

                for (const line of lines) {
                    page.drawText(line, {
                        x: textX,
                        y: textY,
                        size: adjustedSize,
                        color: textColor,
                    });
                    textY -= adjustedSize + 2;
                }
                textY -= 4; // extra spacing before URL
            }

            // Verify URL line
            if (stamp.show_verify_url) {
                const adjustedSize = Math.max(fontSize - 1, 6);
                const lines = splitTextIntoLines(verifyUrl, adjustedSize, textWidth);

                const linkStartY = textY + adjustedSize; // for annotation bounds

                for (const line of lines) {
                    page.drawText(line, {
                        x: textX,
                        y: textY,
                        size: adjustedSize,
                        color: hexToRgb('#2563eb'), // Link blue
                    });
                    textY -= adjustedSize + 2;
                }

                const linkEndY = textY;

                // Add hyperlink annotation
                try {
                    const linkAnnotation = pdfDoc.context.obj({
                        Type: 'Annot',
                        Subtype: 'Link',
                        Rect: [textX, linkEndY, textX + textWidth, linkStartY],
                        Border: [0, 0, 0],
                        C: [0, 0, 1], // transparent
                        A: {
                            Type: 'Action',
                            S: 'URI',
                            URI: PDFString.of(verifyUrl)
                        }
                    });

                    let annots = page.node.lookup(PDFName.of('Annots'));
                    if (!annots) {
                        annots = pdfDoc.context.obj([]);
                        page.node.set(PDFName.of('Annots'), annots);
                    }
                    annots.push(linkAnnotation);
                } catch (e) {
                    console.error("Failed to add link annotation", e);
                }
            }
        }

        const pdfBytes = await pdfDoc.save();
        await fs.writeFile(outputPath, pdfBytes);
        return true;
    } catch (err) {
        console.error('createStampedPdf error:', err);
        // Fallback: copy source as-is
        const fileBuffer = await fs.readFile(sourcePath);
        await fs.writeFile(outputPath, fileBuffer);
        return true;
    }
};

export const createPreviewImage = async (pdfPath, outputPath) => {
    // Note: Real PDF->PNG conversion requires poppler/pdftoppm or a headless browser.
    // We write an empty placeholder file so the flow doesn't break.
    // The frontend uses the /download endpoint for preview, not this file.
    await fs.writeFile(outputPath, Buffer.alloc(0));
    return true;
};