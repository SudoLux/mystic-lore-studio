import type { jsPDF as JsPdf } from 'jspdf';
import type {
  EditorialExportBlockSnapshot,
  EditorialExportFabricAssetSnapshot,
  EditorialExportImageAssetSnapshot,
  EditorialExportResult,
  EditorialExportSceneSnapshot,
  EditorialExportSnapshot,
} from './editorialExport';
import { getImageBlob } from './imageBlobStore';
import type { EditorialJsonObject, EditorialJsonValue } from '../types/editorial';

export type EditorialPdfExportInput = Readonly<{
  fileName?: string;
  snapshot: EditorialExportSnapshot;
}>;

type PdfColor = readonly [number, number, number];

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY: PdfColor = [48, 43, 37];
const MUTED: PdfColor = [112, 104, 94];
const PAPER: PdfColor = [248, 245, 238];
const RULE: PdfColor = [210, 201, 186];

/** Renders a complete PDF from an immutable export snapshot without reading live app state. */
export async function renderEditorialCollectionPdf(snapshot: EditorialExportSnapshot): Promise<Uint8Array> {
  const { jsPDF } = await import('jspdf');
  const document = new jsPDF({ compress: true, format: 'a4', orientation: 'portrait', unit: 'pt' });
  const composer = new EditorialPdfComposer(document, snapshot);
  await composer.render();
  return new Uint8Array(document.output('arraybuffer'));
}

/** Renders and downloads an Editorial Collection PDF in the browser. */
export async function exportEditorialCollectionToPdf({
  fileName,
  snapshot,
}: EditorialPdfExportInput): Promise<EditorialExportResult> {
  const bytes = await renderEditorialCollectionPdf(snapshot);
  const filename = normalizePdfFilename(fileName || snapshot.collection.title);
  downloadPdf(bytes, filename);
  return {
    filename,
    format: 'pdf',
    message: `${filename} was exported successfully.`,
  };
}

class EditorialPdfComposer {
  private readonly accent: PdfColor;
  private pageNumber = 1;
  private y = MARGIN;

  constructor(
    private readonly document: JsPdf,
    private readonly snapshot: EditorialExportSnapshot,
  ) {
    this.accent = hexToRgb(snapshot.collection.cover.accentColor || snapshot.theme.colors.accent, [184, 139, 52]);
  }

  async render() {
    await this.renderCover();
    if (this.snapshot.scenes.length === 0) {
      this.addPage();
      this.renderSectionHeading('Collection Notes', 'This collection does not contain any scenes yet.');
      this.renderNotice('No scenes were available at export time. Add scenes in the Editorial Builder, then export again.');
    } else {
      for (const scene of this.snapshot.scenes) {
        this.addPage();
        await this.renderScene(scene);
      }
    }
    this.renderWarningAppendix();
    this.addFooters();
  }

  private async renderCover() {
    const background = hexToRgb(this.snapshot.theme.colors.background, [12, 12, 12]);
    const foreground = readableForeground(background);
    this.document.setFillColor(...background);
    this.document.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
    this.document.setDrawColor(...this.accent);
    this.document.setLineWidth(1.25);
    this.document.line(MARGIN, 58, MARGIN + 76, 58);

    this.document.setFont('helvetica', 'bold');
    this.document.setFontSize(9);
    this.document.setTextColor(...this.accent);
    this.document.text(
      pdfText(this.snapshot.collection.cover.label || templateLabel(this.snapshot.collection.templateType)),
      MARGIN,
      82,
    );

    const coverAsset = this.findImage(this.snapshot.collection.cover.imageReference);
    const imageTop = 112;
    const imageHeight = 330;
    if (coverAsset) {
      await this.renderImage(coverAsset, MARGIN, imageTop, CONTENT_WIDTH, imageHeight, this.snapshot.collection.cover.fit);
    } else {
      this.renderImagePlaceholder(MARGIN, imageTop, CONTENT_WIDTH, imageHeight, 'Collection cover image unavailable', true);
    }

    let titleY = 496;
    this.document.setTextColor(...foreground);
    this.document.setFont('times', 'bold');
    this.document.setFontSize(34);
    titleY = this.drawWrapped(pdfText(this.snapshot.collection.title), MARGIN, titleY, CONTENT_WIDTH, 38);

    if (this.snapshot.collection.subtitle) {
      this.document.setFont('helvetica', 'normal');
      this.document.setFontSize(15);
      this.document.setTextColor(...mix(foreground, background, 0.72));
      titleY = this.drawWrapped(pdfText(this.snapshot.collection.subtitle), MARGIN, titleY + 12, CONTENT_WIDTH, 21);
    }

    if (this.snapshot.collection.description) {
      this.document.setFontSize(10.5);
      this.document.setTextColor(...mix(foreground, background, 0.62));
      titleY = this.drawWrapped(pdfText(this.snapshot.collection.description), MARGIN, titleY + 18, CONTENT_WIDTH, 15, 4);
    }

    this.document.setDrawColor(...mix(this.accent, background, 0.7));
    this.document.line(MARGIN, Math.min(titleY + 18, 710), PAGE_WIDTH - MARGIN, Math.min(titleY + 18, 710));

    const metaY = Math.min(titleY + 42, 744);
    this.document.setFont('helvetica', 'bold');
    this.document.setFontSize(8);
    this.document.setTextColor(...this.accent);
    this.document.text('THEME', MARGIN, metaY);
    this.document.text('EXPORTED', MARGIN + 190, metaY);
    this.document.text('STUDIO', MARGIN + 360, metaY);
    this.document.setFont('helvetica', 'normal');
    this.document.setTextColor(...mix(foreground, background, 0.72));
    this.document.text(pdfText(this.snapshot.theme.name), MARGIN, metaY + 17);
    this.document.text(formatExportDate(this.snapshot.exportedAt), MARGIN + 190, metaY + 17);
    this.document.text(pdfText(this.snapshot.collection.brandName), MARGIN + 360, metaY + 17);
  }

  private async renderScene(scene: EditorialExportSceneSnapshot) {
    this.renderSceneHeader(scene);
    const renderedFabrics = new Set<string>();

    if (scene.blocks.length === 0) {
      this.renderNotice('This scene contains no blocks.');
    }

    for (const block of scene.blocks) {
      await this.renderBlock(block, renderedFabrics);
    }

    const remainingFabrics = scene.fabricReferences.filter((id) => !renderedFabrics.has(id));
    if (remainingFabrics.length > 0) {
      this.ensureSpace(66);
      this.renderSmallLabel('REFERENCED FABRICS');
      for (const fabricId of remainingFabrics) {
        this.renderFabric(this.findFabric(fabricId));
      }
    }

    const sceneWarnings = this.snapshot.warnings.filter((warning) => warning.sceneId === scene.sceneId);
    if (sceneWarnings.length > 0) {
      this.ensureSpace(44 + sceneWarnings.length * 18);
      this.renderSmallLabel('EXPORT NOTES');
      sceneWarnings.forEach((warning) => this.renderInlineWarning(warning.message));
    }
  }

  private renderSceneHeader(scene: EditorialExportSceneSnapshot) {
    this.document.setFont('helvetica', 'bold');
    this.document.setFontSize(8);
    this.document.setTextColor(...this.accent);
    this.document.text(`SCENE ${scene.index + 1} / ${this.snapshot.scenes.length}  -  ${pdfText(scene.sceneType).toUpperCase()}`, MARGIN, this.y);
    this.y += 22;
    this.document.setFont('times', 'bold');
    this.document.setFontSize(27);
    this.document.setTextColor(...BODY);
    this.y = this.drawWrapped(pdfText(scene.title), MARGIN, this.y, CONTENT_WIDTH, 31);
    if (scene.subtitle) {
      this.document.setFont('helvetica', 'normal');
      this.document.setFontSize(12);
      this.document.setTextColor(...MUTED);
      this.y = this.drawWrapped(pdfText(scene.subtitle), MARGIN, this.y + 5, CONTENT_WIDTH, 17);
    }
    if (scene.description) {
      this.document.setFontSize(9.5);
      this.y = this.drawWrapped(pdfText(scene.description), MARGIN, this.y + 8, CONTENT_WIDTH, 14);
    }
    this.document.setDrawColor(...this.accent);
    this.document.setLineWidth(0.75);
    this.document.line(MARGIN, this.y + 14, PAGE_WIDTH - MARGIN, this.y + 14);
    this.y += 34;
  }

  private async renderBlock(block: EditorialExportBlockSnapshot, renderedFabrics: Set<string>) {
    switch (block.blockType) {
      case 'heading':
        this.renderHeading(block);
        break;
      case 'paragraph':
      case 'text':
      case 'credits':
        this.renderParagraph(block.text || block.notes || '');
        break;
      case 'quote':
        this.renderQuote(block);
        break;
      case 'callout':
        this.renderCallout(block);
        break;
      case 'image':
        await this.renderImageBlock(block);
        break;
      case 'gallery':
        await this.renderGalleryBlock(block);
        break;
      case 'fabricSwatch':
      case 'materials':
        this.renderFabricBlock(block, renderedFabrics);
        break;
      case 'measurementTable':
      case 'specifications':
        this.renderMeasurementBlock(block);
        break;
      case 'divider':
        this.renderDivider(block.label);
        break;
      case 'spacer':
        this.y += 20;
        break;
      default:
        this.renderNotice(`Block type "${pdfText(block.blockType)}" is not yet formatted for PDF. Its available text follows.`);
        if (block.text) this.renderParagraph(block.text);
    }
  }

  private renderHeading(block: EditorialExportBlockSnapshot) {
    const text = block.text || block.label || 'Untitled section';
    this.document.setFont('times', 'bold');
    this.document.setFontSize(20);
    this.document.setTextColor(...BODY);
    this.ensureSpace(48);
    this.y = this.drawWrapped(pdfText(text), MARGIN, this.y, CONTENT_WIDTH, 24);
    this.y += 10;
  }

  private renderParagraph(text: string) {
    if (!text.trim()) return;
    this.document.setFont('helvetica', 'normal');
    this.document.setFontSize(10.5);
    this.document.setTextColor(...BODY);
    this.drawFlowingText(pdfText(text), 15);
    this.y += 9;
  }

  private renderQuote(block: EditorialExportBlockSnapshot) {
    const text = block.text || 'Editorial quote';
    const lines = this.document.splitTextToSize(pdfText(text), CONTENT_WIDTH - 42) as string[];
    const height = lines.length * 19 + (block.label ? 36 : 22);
    this.ensureSpace(height + 12);
    this.document.setFillColor(241, 236, 226);
    this.document.setDrawColor(...this.accent);
    this.document.roundedRect(MARGIN, this.y, CONTENT_WIDTH, height, 5, 5, 'FD');
    this.document.setFont('times', 'italic');
    this.document.setFontSize(14);
    this.document.setTextColor(...BODY);
    this.document.text(lines, MARGIN + 22, this.y + 27, { lineHeightFactor: 1.35 });
    if (block.label) {
      this.document.setFont('helvetica', 'bold');
      this.document.setFontSize(8);
      this.document.setTextColor(...this.accent);
      this.document.text(pdfText(block.label).toUpperCase(), MARGIN + 22, this.y + height - 15);
    }
    this.y += height + 16;
  }

  private renderCallout(block: EditorialExportBlockSnapshot) {
    const content = objectValue(block.content);
    const title = stringValue(content?.title) || block.label || 'Studio Note';
    const body = stringValue(content?.body) || block.text || block.notes || '';
    const bodyLines = this.document.splitTextToSize(pdfText(body), CONTENT_WIDTH - 38) as string[];
    const height = 44 + bodyLines.length * 14;
    this.ensureSpace(height + 12);
    this.document.setFillColor(238, 242, 239);
    this.document.setDrawColor(...mix(this.accent, PAPER, 0.46));
    this.document.roundedRect(MARGIN, this.y, CONTENT_WIDTH, height, 5, 5, 'FD');
    this.document.setFont('helvetica', 'bold');
    this.document.setFontSize(9);
    this.document.setTextColor(...this.accent);
    this.document.text(pdfText(title).toUpperCase(), MARGIN + 18, this.y + 22);
    this.document.setFont('helvetica', 'normal');
    this.document.setFontSize(9.5);
    this.document.setTextColor(...BODY);
    this.document.text(bodyLines, MARGIN + 18, this.y + 42, { lineHeightFactor: 1.4 });
    this.y += height + 16;
  }

  private async renderImageBlock(block: EditorialExportBlockSnapshot) {
    if (block.imageReferences.length === 0) {
      this.renderImagePlaceholder(MARGIN, this.y, CONTENT_WIDTH, 190, 'Image unavailable');
      this.y += 208;
      return;
    }
    for (const reference of block.imageReferences) {
      await this.renderImageWithCaption(this.findImage(reference), block.caption || this.findImage(reference)?.caption);
    }
  }

  private async renderGalleryBlock(block: EditorialExportBlockSnapshot) {
    if (block.imageReferences.length === 0) {
      this.renderImagePlaceholder(MARGIN, this.y, CONTENT_WIDTH, 160, 'Gallery images unavailable');
      this.y += 178;
      return;
    }
    for (const reference of block.imageReferences) {
      const image = this.findImage(reference);
      await this.renderImageWithCaption(image, image?.caption);
    }
  }

  private async renderImageWithCaption(asset?: EditorialExportImageAssetSnapshot, caption?: string) {
    const maxHeight = 300;
    const ratio = asset?.width && asset?.height ? asset.width / asset.height : 4 / 3;
    const height = Math.min(maxHeight, CONTENT_WIDTH / Math.max(ratio, 0.4));
    this.ensureSpace(Math.min(height, maxHeight) + (caption ? 34 : 18));
    await this.renderImage(asset, MARGIN, this.y, CONTENT_WIDTH, height, 'contain');
    this.y += height;
    if (caption) {
      this.document.setFont('helvetica', 'italic');
      this.document.setFontSize(8.5);
      this.document.setTextColor(...MUTED);
      this.y = this.drawWrapped(pdfText(caption), MARGIN, this.y + 12, CONTENT_WIDTH, 12, 2);
    }
    this.y += 18;
  }

  private renderFabricBlock(block: EditorialExportBlockSnapshot, rendered: Set<string>) {
    const references = block.fabricReferences.length > 0 ? block.fabricReferences : [];
    if (references.length === 0) {
      const content = objectValue(block.content);
      this.renderFabricFallback({
        color: stringValue(content?.colorHex),
        composition: stringValue(content?.composition),
        name: stringValue(content?.name) || block.label || 'Fabric reference',
        notes: stringValue(content?.notes) || block.notes,
      });
      return;
    }
    references.forEach((fabricId) => {
      rendered.add(fabricId);
      this.renderFabric(this.findFabric(fabricId));
    });
  }

  private renderFabric(fabric?: EditorialExportFabricAssetSnapshot) {
    if (!fabric) {
      this.renderFabricFallback({ name: 'Unavailable fabric', notes: 'The linked fabric record could not be resolved.' });
      return;
    }
    const quantity = fabric.quantity.availableYards === undefined ? '' : `${formatNumber(fabric.quantity.availableYards)} yd available`;
    const details = [fabric.category, fabric.color.name || fabric.color.family, quantity].filter(Boolean).join('  |  ');
    this.renderFabricFallback({
      color: fabric.color.hex,
      composition: details,
      name: fabric.name,
      notes: fabric.notes || (!fabric.available ? 'Source unavailable. Saved collection details are shown.' : undefined),
    });
  }

  private renderFabricFallback({ color, composition, name, notes }: { color?: string; composition?: string; name: string; notes?: string }) {
    const notesLines = notes ? this.document.splitTextToSize(pdfText(notes), CONTENT_WIDTH - 84) as string[] : [];
    const height = 58 + notesLines.length * 12;
    this.ensureSpace(height + 10);
    this.document.setFillColor(244, 240, 232);
    this.document.setDrawColor(...RULE);
    this.document.roundedRect(MARGIN, this.y, CONTENT_WIDTH, height, 5, 5, 'FD');
    this.document.setFillColor(...hexToRgb(color, [143, 120, 84]));
    this.document.circle(MARGIN + 25, this.y + 27, 10, 'F');
    this.document.setFont('helvetica', 'bold');
    this.document.setFontSize(10.5);
    this.document.setTextColor(...BODY);
    this.document.text(pdfText(name), MARGIN + 48, this.y + 23);
    if (composition) {
      this.document.setFont('helvetica', 'normal');
      this.document.setFontSize(8.5);
      this.document.setTextColor(...MUTED);
      this.document.text(pdfText(composition), MARGIN + 48, this.y + 39);
    }
    if (notesLines.length > 0) {
      this.document.setFontSize(8.5);
      this.document.text(notesLines, MARGIN + 48, this.y + 55, { lineHeightFactor: 1.35 });
    }
    this.y += height + 12;
  }

  private renderMeasurementBlock(block: EditorialExportBlockSnapshot) {
    const content = objectValue(block.content);
    const title = stringValue(content?.title) || block.label || 'Technical Reference';
    const columns = arrayValue(content?.columns).map(String);
    const rows = arrayValue(content?.rows).flatMap((row) => {
      const record = objectValue(row);
      return record ? [{ label: stringValue(record.label), values: arrayValue(record.values).map(String) }] : [];
    });
    this.ensureSpace(54);
    this.renderSmallLabel(pdfText(title).toUpperCase());
    if (columns.length > 0) this.renderTableRow(['', ...columns], true);
    rows.forEach((row) => this.renderTableRow([row.label, ...row.values], false));
    if (rows.length === 0 && block.text) this.renderParagraph(block.text);
    this.y += 8;
  }

  private renderTableRow(values: string[], header: boolean) {
    this.ensureSpace(30);
    const width = CONTENT_WIDTH / Math.max(values.length, 1);
    this.document.setFillColor(...(header ? [229, 220, 203] as PdfColor : [247, 244, 237] as PdfColor));
    this.document.setDrawColor(...RULE);
    this.document.rect(MARGIN, this.y, CONTENT_WIDTH, 28, 'FD');
    this.document.setFont('helvetica', header ? 'bold' : 'normal');
    this.document.setFontSize(8);
    this.document.setTextColor(...BODY);
    values.forEach((value, index) => this.document.text(pdfText(value), MARGIN + 8 + width * index, this.y + 18, { maxWidth: width - 12 }));
    this.y += 28;
  }

  private renderDivider(label?: string) {
    this.ensureSpace(32);
    this.document.setDrawColor(...RULE);
    this.document.line(MARGIN, this.y + 12, PAGE_WIDTH - MARGIN, this.y + 12);
    if (label) {
      this.document.setFillColor(...PAPER);
      this.document.setTextColor(...this.accent);
      this.document.setFont('helvetica', 'bold');
      this.document.setFontSize(7.5);
      this.document.text(pdfText(label).toUpperCase(), PAGE_WIDTH / 2, this.y + 15, { align: 'center' });
    }
    this.y += 34;
  }

  private renderWarningAppendix() {
    if (this.snapshot.warnings.length === 0) return;
    this.addPage();
    this.renderSectionHeading('Export Notes', 'References that could not be resolved were replaced with readable fallbacks.');
    this.snapshot.warnings.forEach((warning) => this.renderInlineWarning(`${warning.severity.toUpperCase()}: ${warning.message}`));
  }

  private renderSectionHeading(title: string, description: string) {
    this.document.setFont('times', 'bold');
    this.document.setFontSize(27);
    this.document.setTextColor(...BODY);
    this.document.text(pdfText(title), MARGIN, this.y);
    this.y += 28;
    this.document.setFont('helvetica', 'normal');
    this.document.setFontSize(10);
    this.document.setTextColor(...MUTED);
    this.y = this.drawWrapped(pdfText(description), MARGIN, this.y, CONTENT_WIDTH, 15);
    this.y += 20;
  }

  private renderSmallLabel(label: string) {
    this.document.setFont('helvetica', 'bold');
    this.document.setFontSize(8);
    this.document.setTextColor(...this.accent);
    this.document.text(pdfText(label), MARGIN, this.y);
    this.y += 16;
  }

  private renderNotice(message: string) {
    const lines = this.document.splitTextToSize(pdfText(message), CONTENT_WIDTH - 30) as string[];
    const height = 30 + lines.length * 13;
    this.ensureSpace(height + 10);
    this.document.setFillColor(243, 239, 231);
    this.document.setDrawColor(...RULE);
    this.document.roundedRect(MARGIN, this.y, CONTENT_WIDTH, height, 5, 5, 'FD');
    this.document.setFont('helvetica', 'normal');
    this.document.setFontSize(9);
    this.document.setTextColor(...MUTED);
    this.document.text(lines, MARGIN + 15, this.y + 22, { lineHeightFactor: 1.35 });
    this.y += height + 14;
  }

  private renderInlineWarning(message: string) {
    this.ensureSpace(24);
    this.document.setFillColor(...this.accent);
    this.document.circle(MARGIN + 4, this.y - 3, 2.5, 'F');
    this.document.setFont('helvetica', 'normal');
    this.document.setFontSize(8.5);
    this.document.setTextColor(...MUTED);
    this.y = this.drawWrapped(pdfText(message), MARGIN + 14, this.y, CONTENT_WIDTH - 14, 12);
    this.y += 7;
  }

  private async renderImage(asset: EditorialExportImageAssetSnapshot | undefined, x: number, y: number, width: number, height: number, fit: 'contain' | 'cover') {
    const data = asset ? await resolveImageData(asset) : undefined;
    if (!asset || !data) {
      this.renderImagePlaceholder(x, y, width, height, asset ? `Image unavailable: ${asset.altText || asset.filename || asset.assetId}` : 'Image unavailable');
      return;
    }
    try {
      const sourceRatio = asset.width && asset.height ? asset.width / asset.height : width / height;
      const frameRatio = width / height;
      let drawWidth = width;
      let drawHeight = height;
      if (fit === 'contain') {
        if (sourceRatio > frameRatio) drawHeight = width / sourceRatio;
        else drawWidth = height * sourceRatio;
      } else if (sourceRatio > frameRatio) {
        drawWidth = height * sourceRatio;
      } else {
        drawHeight = width / sourceRatio;
      }
      this.document.setFillColor(25, 24, 22);
      this.document.rect(x, y, width, height, 'F');
      this.document.saveGraphicsState();
      this.document.rect(x, y, width, height);
      this.document.clip();
      this.document.discardPath();
      this.document.addImage(data.dataUrl, data.format, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight, undefined, 'MEDIUM');
      this.document.restoreGraphicsState();
      this.document.setDrawColor(...mix(this.accent, PAPER, 0.45));
      this.document.rect(x, y, width, height, 'S');
    } catch {
      this.renderImagePlaceholder(x, y, width, height, `Image could not be embedded: ${asset.altText || asset.filename || asset.assetId}`);
    }
  }

  private renderImagePlaceholder(x: number, y: number, width: number, height: number, message: string, dark = false) {
    this.document.setFillColor(...(dark ? [22, 25, 27] as PdfColor : [235, 231, 223] as PdfColor));
    this.document.setDrawColor(...mix(this.accent, dark ? [22, 25, 27] : PAPER, 0.52));
    this.document.roundedRect(x, y, width, height, 5, 5, 'FD');
    this.document.setFont('helvetica', 'normal');
    this.document.setFontSize(9);
    this.document.setTextColor(...(dark ? [180, 175, 165] as PdfColor : MUTED));
    this.document.text(pdfText(message), x + width / 2, y + height / 2, { align: 'center', maxWidth: width - 40 });
  }

  private drawFlowingText(text: string, lineHeight: number) {
    const lines = this.document.splitTextToSize(text, CONTENT_WIDTH) as string[];
    for (const line of lines) {
      this.ensureSpace(lineHeight + 5);
      this.document.text(line, MARGIN, this.y);
      this.y += lineHeight;
    }
  }

  private drawWrapped(text: string, x: number, y: number, width: number, lineHeight: number, maxLines?: number) {
    let lines = this.document.splitTextToSize(text, width) as string[];
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.\s]+$/, '')}...`;
    }
    this.document.text(lines, x, y, { lineHeightFactor: lineHeight / Math.max(this.document.getFontSize(), 1) });
    return y + lines.length * lineHeight;
  }

  private ensureSpace(height: number) {
    if (this.y + height <= PAGE_HEIGHT - 54) return;
    this.addPage();
  }

  private addPage() {
    this.document.addPage('a4', 'portrait');
    this.pageNumber += 1;
    this.document.setFillColor(...PAPER);
    this.document.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
    this.y = MARGIN;
  }

  private addFooters() {
    const pages = this.document.getNumberOfPages();
    for (let page = 2; page <= pages; page += 1) {
      this.document.setPage(page);
      this.document.setDrawColor(...RULE);
      this.document.line(MARGIN, PAGE_HEIGHT - 35, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 35);
      this.document.setFont('helvetica', 'normal');
      this.document.setFontSize(7.5);
      this.document.setTextColor(...MUTED);
      this.document.text(pdfText(this.snapshot.collection.title), MARGIN, PAGE_HEIGHT - 20, { maxWidth: CONTENT_WIDTH - 80 });
      this.document.text(`${page} / ${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 20, { align: 'right' });
    }
  }

  private findImage(reference?: string) {
    return reference ? this.snapshot.imageAssets.find((asset) => asset.assetId === reference) : undefined;
  }

  private findFabric(reference: string) {
    return this.snapshot.fabricAssets.find((asset) => asset.fabricId === reference);
  }
}

async function resolveImageData(asset: EditorialExportImageAssetSnapshot) {
  const source = asset.source.dataUrl || asset.source.remoteUrl || asset.source.externalUrl;
  if (!source) {
    const blobKey = asset.source.previewBlobKey || asset.source.blobKey;
    if (!blobKey) return undefined;
    try {
      const blob = await getImageBlob(blobKey);
      if (!blob) return undefined;
      const mimeType = blob.type || asset.mimeType || 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${encodeBase64(new Uint8Array(await blob.arrayBuffer()))}`;
      return { dataUrl, format: imageFormat(mimeType) };
    } catch {
      return undefined;
    }
  }
  if (source.startsWith('data:')) {
    return { dataUrl: source, format: imageFormat(asset.mimeType || source.slice(5, source.indexOf(';'))) };
  }
  try {
    const response = await fetch(source);
    if (!response.ok) return undefined;
    const mimeType = response.headers.get('content-type') || asset.mimeType || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${encodeBase64(new Uint8Array(await response.arrayBuffer()))}`;
    return { dataUrl, format: imageFormat(mimeType) };
  } catch {
    return undefined;
  }
}

function imageFormat(mimeType: string): 'JPEG' | 'PNG' | 'WEBP' {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('png')) return 'PNG';
  if (normalized.includes('webp')) return 'WEBP';
  return 'JPEG';
}

function encodeBase64(bytes: Uint8Array) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    output += alphabet[first >> 2];
    output += alphabet[((first & 3) << 4) | ((second ?? 0) >> 4)];
    output += index + 1 < bytes.length ? alphabet[((second & 15) << 2) | ((third ?? 0) >> 6)] : '=';
    output += index + 2 < bytes.length ? alphabet[third & 63] : '=';
  }
  return output;
}

function downloadPdf(bytes: Uint8Array, filename: string) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('PDF download is only available in a browser.');
  }
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function normalizePdfFilename(value: string) {
  const safe = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'editorial-collection';
  return `${safe}.pdf`;
}

function pdfText(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '-')
    .replace(/\u00a0/g, ' ');
}

function templateLabel(value: string) {
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function formatExportDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';
  return parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function objectValue(value: EditorialJsonValue | undefined): EditorialJsonObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

function stringValue(value: EditorialJsonValue | undefined) {
  return typeof value === 'string' ? value : '';
}

function arrayValue(value: EditorialJsonValue | undefined): EditorialJsonValue[] {
  return Array.isArray(value) ? value : [];
}

function hexToRgb(value: string | undefined, fallback: PdfColor): PdfColor {
  const match = value?.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) return fallback;
  const numeric = Number.parseInt(match[1], 16);
  return [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255];
}

function readableForeground(background: PdfColor): PdfColor {
  const luminance = (background[0] * 299 + background[1] * 587 + background[2] * 114) / 1000;
  return luminance > 154 ? [51, 42, 34] : [242, 235, 221];
}

function mix(foreground: PdfColor, background: PdfColor, amount: number): PdfColor {
  return foreground.map((value, index) => Math.round(value * amount + background[index] * (1 - amount))) as unknown as PdfColor;
}
