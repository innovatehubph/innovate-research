/**
 * PDF Exporter Service
 * Generates branded PDF reports using pdfkit
 */

import PDFDocument from 'pdfkit';
import { Report, ExportOptions } from '../../types';

interface PDFOptions extends ExportOptions {
  includeTableOfContents?: boolean;
  includeCharts?: boolean;
  includeCitations?: boolean;
  pageSize?: 'A4' | 'LETTER';
  margins?: { top: number; bottom: number; left: number; right: number };
}

interface TableData {
  headers: string[];
  rows: string[][];
}

export class PDFExporter {
  private readonly brandColors = {
    primary: '#2563EB',      // InnovateHub Blue
    secondary: '#1E40AF',
    accent: '#3B82F6',
    text: '#1F2937',
    lightGray: '#F3F4F6',
    darkGray: '#6B7280',
  };

  private readonly defaultOptions: PDFOptions = {
    includeTableOfContents: true,
    includeCharts: true,
    includeCitations: true,
    pageSize: 'A4',
    margins: { top: 72, bottom: 72, left: 72, right: 72 },
  };

  /**
   * Generate PDF from report
   */
  async generatePDF(report: Report, options: PDFOptions = {}): Promise<Buffer> {
    const opts = { ...this.defaultOptions, ...options };
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: opts.pageSize,
        margins: opts.margins,
        bufferPages: true,
        info: {
          Title: report.title,
          Author: 'InnovateHub Research',
          Subject: report.query,
          Keywords: report.tags?.join(', ') || '',
          CreationDate: new Date(),
        },
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        // Generate document content
        this.addHeader(doc, report);
        this.addTitlePage(doc, report);
        
        if (opts.includeTableOfContents && report.sections?.length) {
          this.addTableOfContents(doc, report);
        }

        this.addContent(doc, report, opts);

        if (opts.includeCitations && report.sources?.length) {
          this.addCitations(doc, report);
        }

        // Add page numbers to all pages
        this.addPageNumbers(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add branded header to each page
   */
  private addHeader(doc: PDFKit.PDFDocument, report: Report): void {
    const pageWidth = doc.page.width;
    const margins = doc.page.margins;

    // Header bar
    doc.rect(0, 0, pageWidth, 50)
       .fill(this.brandColors.primary);

    // Logo placeholder (text-based)
    doc.fontSize(16)
       .fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .text('InnovateHub', margins.left, 15, { continued: true })
       .font('Helvetica')
       .text(' Research', { continued: false });

    // Report date on right
    doc.fontSize(10)
       .text(
         new Date(report.createdAt).toLocaleDateString('en-US', {
           year: 'numeric',
           month: 'long',
           day: 'numeric',
         }),
         pageWidth - margins.right - 150,
         20,
         { width: 150, align: 'right' }
       );

    doc.moveDown(3);
  }

  /**
   * Add title page
   */
  private addTitlePage(doc: PDFKit.PDFDocument, report: Report): void {
    const pageWidth = doc.page.width;
    const margins = doc.page.margins;
    const contentWidth = pageWidth - margins.left - margins.right;

    doc.moveDown(4);

    // Main title
    doc.fontSize(28)
       .fillColor(this.brandColors.primary)
       .font('Helvetica-Bold')
       .text(report.title, margins.left, doc.y, {
         width: contentWidth,
         align: 'center',
       });

    doc.moveDown(2);

    // Research query
    doc.fontSize(14)
       .fillColor(this.brandColors.darkGray)
       .font('Helvetica-Oblique')
       .text(`"${report.query}"`, {
         width: contentWidth,
         align: 'center',
       });

    doc.moveDown(3);

    // Metadata box
    const boxY = doc.y;
    doc.rect(margins.left + 50, boxY, contentWidth - 100, 120)
       .fill(this.brandColors.lightGray);

    doc.fillColor(this.brandColors.text)
       .font('Helvetica')
       .fontSize(11);

    const metaX = margins.left + 70;
    let metaY = boxY + 20;

    const metadata = [
      ['Report ID', report.id],
      ['Generated', new Date(report.createdAt).toLocaleString()],
      ['Sources', `${report.sources?.length || 0} sources analyzed`],
      ['Model', report.model || 'InnovateHub AI'],
      ['Status', report.status],
    ];

    metadata.forEach(([label, value]) => {
      doc.font('Helvetica-Bold').text(`${label}: `, metaX, metaY, { continued: true });
      doc.font('Helvetica').text(String(value));
      metaY += 18;
    });

    // Tags
    if (report.tags?.length) {
      doc.moveDown(3);
      doc.fontSize(10)
         .fillColor(this.brandColors.accent)
         .text(`Tags: ${report.tags.join(', ')}`, { align: 'center' });
    }

    doc.addPage();
  }

  /**
   * Add table of contents
   */
  private addTableOfContents(doc: PDFKit.PDFDocument, report: Report): void {
    const margins = doc.page.margins;
    const contentWidth = doc.page.width - margins.left - margins.right;

    this.addSectionHeader(doc, 'Table of Contents');

    doc.fontSize(12)
       .fillColor(this.brandColors.text)
       .font('Helvetica');

    report.sections?.forEach((section, index) => {
      const pageNum = index + 3; // Approximate page numbers
      const title = section.title || `Section ${index + 1}`;
      
      // Dotted line between title and page number
      const titleWidth = doc.widthOfString(title);
      const pageNumWidth = doc.widthOfString(String(pageNum));
      const dotsWidth = contentWidth - titleWidth - pageNumWidth - 20;
      const dots = '.'.repeat(Math.floor(dotsWidth / doc.widthOfString('.')));

      doc.text(`${index + 1}. ${title}`, margins.left, doc.y, { continued: true })
         .fillColor(this.brandColors.lightGray)
         .text(` ${dots} `, { continued: true })
         .fillColor(this.brandColors.text)
         .text(String(pageNum));

      doc.moveDown(0.5);
    });

    // Add citations entry
    if (report.sources?.length) {
      doc.moveDown(0.5);
      doc.text('References & Citations', margins.left, doc.y);
    }

    doc.addPage();
  }

  /**
   * Add main content sections
   */
  private addContent(doc: PDFKit.PDFDocument, report: Report, options: PDFOptions): void {
    const margins = doc.page.margins;
    const contentWidth = doc.page.width - margins.left - margins.right;

    // Executive Summary
    if (report.summary) {
      this.addSectionHeader(doc, 'Executive Summary');
      
      doc.fontSize(11)
         .fillColor(this.brandColors.text)
         .font('Helvetica')
         .text(report.summary, margins.left, doc.y, {
           width: contentWidth,
           align: 'justify',
         });

      doc.moveDown(2);
    }

    // Main sections
    report.sections?.forEach((section, index) => {
      // Check if we need a new page
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
        this.addHeader(doc, report);
      }

      this.addSectionHeader(doc, section.title || `Section ${index + 1}`);

      // Section content
      doc.fontSize(11)
         .fillColor(this.brandColors.text)
         .font('Helvetica')
         .text(section.content, margins.left, doc.y, {
           width: contentWidth,
           align: 'justify',
         });

      // Add tables if present
      if (section.tables?.length) {
        section.tables.forEach((table: TableData) => {
          this.addTable(doc, table, contentWidth);
        });
      }

      // Add chart placeholder if present
      if (options.includeCharts && section.charts?.length) {
        section.charts.forEach((chart: { title: string; type: string }) => {
          this.addChartPlaceholder(doc, chart, contentWidth);
        });
      }

      doc.moveDown(2);
    });

    // Key Findings
    if (report.keyFindings?.length) {
      if (doc.y > doc.page.height - 200) {
        doc.addPage();
        this.addHeader(doc, report);
      }

      this.addSectionHeader(doc, 'Key Findings');

      report.keyFindings.forEach((finding, index) => {
        doc.fontSize(11)
           .fillColor(this.brandColors.accent)
           .font('Helvetica-Bold')
           .text(`${index + 1}. `, margins.left, doc.y, { continued: true })
           .fillColor(this.brandColors.text)
           .font('Helvetica')
           .text(finding, { width: contentWidth - 20 });
        
        doc.moveDown(0.5);
      });
    }
  }

  /**
   * Add a styled section header
   */
  private addSectionHeader(doc: PDFKit.PDFDocument, title: string): void {
    const margins = doc.page.margins;
    const contentWidth = doc.page.width - margins.left - margins.right;

    doc.moveDown(1);

    // Colored bar
    doc.rect(margins.left, doc.y, 4, 20)
       .fill(this.brandColors.primary);

    // Title text
    doc.fontSize(16)
       .fillColor(this.brandColors.secondary)
       .font('Helvetica-Bold')
       .text(title, margins.left + 15, doc.y + 2);

    // Underline
    doc.moveDown(0.5);
    doc.moveTo(margins.left, doc.y)
       .lineTo(margins.left + contentWidth, doc.y)
       .strokeColor(this.brandColors.lightGray)
       .lineWidth(1)
       .stroke();

    doc.moveDown(1);
  }

  /**
   * Add a data table
   */
  private addTable(doc: PDFKit.PDFDocument, table: TableData, contentWidth: number): void {
    const margins = doc.page.margins;
    const colWidth = contentWidth / table.headers.length;
    const rowHeight = 25;
    let startY = doc.y + 10;

    // Table header
    doc.rect(margins.left, startY, contentWidth, rowHeight)
       .fill(this.brandColors.primary);

    doc.fontSize(10)
       .fillColor('#FFFFFF')
       .font('Helvetica-Bold');

    table.headers.forEach((header, i) => {
      doc.text(
        header,
        margins.left + (i * colWidth) + 5,
        startY + 7,
        { width: colWidth - 10, align: 'left' }
      );
    });

    startY += rowHeight;

    // Table rows
    doc.font('Helvetica')
       .fillColor(this.brandColors.text);

    table.rows.forEach((row, rowIndex) => {
      // Alternate row colors
      if (rowIndex % 2 === 0) {
        doc.rect(margins.left, startY, contentWidth, rowHeight)
           .fill(this.brandColors.lightGray);
      }

      doc.fillColor(this.brandColors.text);

      row.forEach((cell, cellIndex) => {
        doc.text(
          cell,
          margins.left + (cellIndex * colWidth) + 5,
          startY + 7,
          { width: colWidth - 10, align: 'left' }
        );
      });

      startY += rowHeight;
    });

    doc.y = startY + 10;
  }

  /**
   * Add chart placeholder (charts would be rendered separately)
   */
  private addChartPlaceholder(
    doc: PDFKit.PDFDocument, 
    chart: { title: string; type: string }, 
    contentWidth: number
  ): void {
    const margins = doc.page.margins;
    const chartHeight = 200;

    doc.moveDown(1);

    // Chart container
    doc.rect(margins.left, doc.y, contentWidth, chartHeight)
       .strokeColor(this.brandColors.darkGray)
       .lineWidth(1)
       .dash(5, { space: 3 })
       .stroke();

    // Placeholder text
    doc.undash()
       .fontSize(12)
       .fillColor(this.brandColors.darkGray)
       .text(
         `[Chart: ${chart.title}]`,
         margins.left,
         doc.y + (chartHeight / 2) - 20,
         { width: contentWidth, align: 'center' }
       )
       .fontSize(10)
       .text(
         `Type: ${chart.type}`,
         { width: contentWidth, align: 'center' }
       );

    doc.y += chartHeight + 10;
  }

  /**
   * Add citations/references section
   */
  private addCitations(doc: PDFKit.PDFDocument, report: Report): void {
    doc.addPage();
    this.addHeader(doc, report);
    this.addSectionHeader(doc, 'References & Citations');

    const margins = doc.page.margins;
    const contentWidth = doc.page.width - margins.left - margins.right;

    report.sources?.forEach((source, index) => {
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
        this.addHeader(doc, report);
      }

      // Citation number
      doc.fontSize(10)
         .fillColor(this.brandColors.primary)
         .font('Helvetica-Bold')
         .text(`[${index + 1}]`, margins.left, doc.y, { continued: true });

      // Source title
      doc.fillColor(this.brandColors.text)
         .text(` ${source.title || 'Untitled Source'}`, { continued: false });

      // URL (if available)
      if (source.url) {
        doc.fontSize(9)
           .fillColor(this.brandColors.accent)
           .font('Helvetica')
           .text(source.url, margins.left + 30, doc.y, {
             width: contentWidth - 30,
             link: source.url,
           });
      }

      // Snippet/description
      if (source.snippet) {
        doc.fontSize(9)
           .fillColor(this.brandColors.darkGray)
           .font('Helvetica-Oblique')
           .text(source.snippet, margins.left + 30, doc.y, {
             width: contentWidth - 30,
           });
      }

      // Accessed date
      if (source.accessedAt) {
        doc.fontSize(8)
           .fillColor(this.brandColors.darkGray)
           .text(`Accessed: ${new Date(source.accessedAt).toLocaleDateString()}`, margins.left + 30);
      }

      doc.moveDown(1);
    });
  }

  /**
   * Add page numbers to footer
   */
  private addPageNumbers(doc: PDFKit.PDFDocument): void {
    const pages = doc.bufferedPageRange();
    
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margins = doc.page.margins;

      // Footer line
      doc.moveTo(margins.left, pageHeight - 50)
         .lineTo(pageWidth - margins.right, pageHeight - 50)
         .strokeColor(this.brandColors.lightGray)
         .lineWidth(1)
         .stroke();

      // Footer text
      doc.fontSize(9)
         .fillColor(this.brandColors.darkGray)
         .font('Helvetica');

      // Left: InnovateHub branding
      doc.text(
        'Generated by InnovateHub Research',
        margins.left,
        pageHeight - 40
      );

      // Center: Confidential notice
      doc.text(
        'Confidential',
        pageWidth / 2 - 30,
        pageHeight - 40
      );

      // Right: Page number
      doc.text(
        `Page ${i + 1} of ${pages.count}`,
        pageWidth - margins.right - 60,
        pageHeight - 40
      );
    }
  }

  /**
   * Generate PDF for multiple reports (batch export)
   */
  async generateBatchPDF(reports: Report[], options: PDFOptions = {}): Promise<Buffer> {
    const chunks: Buffer[] = [];
    const opts = { ...this.defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: opts.pageSize,
        margins: opts.margins,
        bufferPages: true,
        info: {
          Title: 'InnovateHub Research - Batch Export',
          Author: 'InnovateHub Research',
          CreationDate: new Date(),
        },
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        reports.forEach((report, index) => {
          if (index > 0) doc.addPage();
          
          this.addHeader(doc, report);
          this.addTitlePage(doc, report);
          this.addContent(doc, report, opts);

          if (opts.includeCitations && report.sources?.length) {
            this.addCitations(doc, report);
          }
        });

        this.addPageNumbers(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export const pdfExporter = new PDFExporter();
