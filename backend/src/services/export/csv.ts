/**
 * CSV Exporter Service
 * Generates CSV files using json2csv with nested object support
 */

import { Parser, Transform } from 'json2csv';
import { Report, Source } from '../../types';
import { Readable } from 'stream';

interface CSVOptions {
  delimiter?: string;
  quote?: string;
  header?: boolean;
  flatten?: boolean;
  flattenSeparator?: string;
  includeEmptyRows?: boolean;
  fields?: string[];
}

interface FlattenedReport {
  id: string;
  title: string;
  query: string;
  status: string;
  model: string;
  summary: string;
  created_at: string;
  updated_at: string;
  tags: string;
  sources_count: number;
  sections_count: number;
  key_findings: string;
}

interface FlattenedSource {
  report_id: string;
  source_index: number;
  title: string;
  url: string;
  snippet: string;
  reliability: string;
  accessed_at: string;
}

interface FlattenedSection {
  report_id: string;
  section_index: number;
  title: string;
  content: string;
  word_count: number;
}

export class CSVExporter {
  private readonly defaultOptions: CSVOptions = {
    delimiter: ',',
    quote: '"',
    header: true,
    flatten: true,
    flattenSeparator: '_',
    includeEmptyRows: false,
  };

  /**
   * Generate CSV from generic data
   */
  generateCSV<T extends object>(data: T[], fields?: string[], options: CSVOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options };

    if (!data || data.length === 0) {
      return '';
    }

    // Auto-detect fields if not provided
    const csvFields = fields || this.detectFields(data[0], opts.flatten, opts.flattenSeparator);

    const parser = new Parser({
      fields: csvFields,
      delimiter: opts.delimiter,
      quote: opts.quote,
      header: opts.header,
      flatten: opts.flatten,
      flattenSeparator: opts.flattenSeparator,
    });

    return parser.parse(data);
  }

  /**
   * Generate CSV stream for large datasets
   */
  generateCSVStream<T extends object>(data: Readable, fields?: string[], options: CSVOptions = {}): Transform<T, string> {
    const opts = { ...this.defaultOptions, ...options };

    const transformOpts = {
      fields,
      delimiter: opts.delimiter,
      quote: opts.quote,
      header: opts.header,
      flatten: opts.flatten,
      flattenSeparator: opts.flattenSeparator,
    };

    return new Transform(transformOpts);
  }

  /**
   * Generate main report CSV
   */
  generateReportCSV(reports: Report[], options: CSVOptions = {}): string {
    const flattenedReports = reports.map(report => this.flattenReport(report));

    const fields = [
      'id',
      'title',
      'query',
      'status',
      'model',
      'summary',
      'created_at',
      'updated_at',
      'tags',
      'sources_count',
      'sections_count',
      'key_findings',
    ];

    return this.generateCSV(flattenedReports, fields, options);
  }

  /**
   * Generate sources CSV
   */
  generateSourcesCSV(report: Report, options: CSVOptions = {}): string {
    if (!report.sources?.length) {
      return '';
    }

    const flattenedSources = report.sources.map((source, index) => 
      this.flattenSource(source, report.id, index)
    );

    const fields = [
      'report_id',
      'source_index',
      'title',
      'url',
      'snippet',
      'reliability',
      'accessed_at',
    ];

    return this.generateCSV(flattenedSources, fields, options);
  }

  /**
   * Generate sections CSV
   */
  generateSectionsCSV(report: Report, options: CSVOptions = {}): string {
    if (!report.sections?.length) {
      return '';
    }

    const flattenedSections = report.sections.map((section, index) => 
      this.flattenSection(section, report.id, index)
    );

    const fields = [
      'report_id',
      'section_index',
      'title',
      'content',
      'word_count',
    ];

    return this.generateCSV(flattenedSections, fields, options);
  }

  /**
   * Generate multiple sheets (returns object with sheet names as keys)
   */
  generateMultiSheetCSV(reports: Report[], options: CSVOptions = {}): Record<string, string> {
    const sheets: Record<string, string> = {};

    // Main reports sheet
    sheets['reports'] = this.generateReportCSV(reports, options);

    // All sources in one sheet
    const allSources: FlattenedSource[] = [];
    reports.forEach(report => {
      report.sources?.forEach((source, index) => {
        allSources.push(this.flattenSource(source, report.id, index));
      });
    });

    if (allSources.length > 0) {
      sheets['sources'] = this.generateCSV(allSources, [
        'report_id',
        'source_index',
        'title',
        'url',
        'snippet',
        'reliability',
        'accessed_at',
      ], options);
    }

    // All sections in one sheet
    const allSections: FlattenedSection[] = [];
    reports.forEach(report => {
      report.sections?.forEach((section, index) => {
        allSections.push(this.flattenSection(section, report.id, index));
      });
    });

    if (allSections.length > 0) {
      sheets['sections'] = this.generateCSV(allSections, [
        'report_id',
        'section_index',
        'title',
        'content',
        'word_count',
      ], options);
    }

    // Key findings
    const allFindings: { report_id: string; finding_index: number; finding: string }[] = [];
    reports.forEach(report => {
      report.keyFindings?.forEach((finding, index) => {
        allFindings.push({
          report_id: report.id,
          finding_index: index + 1,
          finding,
        });
      });
    });

    if (allFindings.length > 0) {
      sheets['key_findings'] = this.generateCSV(allFindings, [
        'report_id',
        'finding_index',
        'finding',
      ], options);
    }

    return sheets;
  }

  /**
   * Generate ZIP-compatible multi-sheet export
   */
  async generateMultiSheetArchive(reports: Report[], options: CSVOptions = {}): Promise<Map<string, Buffer>> {
    const sheets = this.generateMultiSheetCSV(reports, options);
    const buffers = new Map<string, Buffer>();

    Object.entries(sheets).forEach(([name, content]) => {
      buffers.set(`${name}.csv`, Buffer.from(content, 'utf-8'));
    });

    return buffers;
  }

  /**
   * Flatten a report object for CSV
   */
  private flattenReport(report: Report): FlattenedReport {
    return {
      id: report.id,
      title: this.escapeCSV(report.title),
      query: this.escapeCSV(report.query),
      status: report.status,
      model: report.model || '',
      summary: this.escapeCSV(this.truncate(report.summary || '', 500)),
      created_at: new Date(report.createdAt).toISOString(),
      updated_at: report.updatedAt ? new Date(report.updatedAt).toISOString() : '',
      tags: (report.tags || []).join('; '),
      sources_count: report.sources?.length || 0,
      sections_count: report.sections?.length || 0,
      key_findings: (report.keyFindings || []).join('; '),
    };
  }

  /**
   * Flatten a source object for CSV
   */
  private flattenSource(source: Source, reportId: string, index: number): FlattenedSource {
    return {
      report_id: reportId,
      source_index: index + 1,
      title: this.escapeCSV(source.title || 'Untitled'),
      url: source.url || '',
      snippet: this.escapeCSV(this.truncate(source.snippet || '', 300)),
      reliability: source.reliability || '',
      accessed_at: source.accessedAt ? new Date(source.accessedAt).toISOString() : '',
    };
  }

  /**
   * Flatten a section object for CSV
   */
  private flattenSection(
    section: { title?: string; content: string },
    reportId: string,
    index: number
  ): FlattenedSection {
    return {
      report_id: reportId,
      section_index: index + 1,
      title: this.escapeCSV(section.title || `Section ${index + 1}`),
      content: this.escapeCSV(section.content),
      word_count: section.content.split(/\s+/).length,
    };
  }

  /**
   * Auto-detect fields from object
   */
  private detectFields(obj: object, flatten?: boolean, separator?: string): string[] {
    const fields: string[] = [];

    const traverse = (current: object, prefix: string = '') => {
      Object.entries(current).forEach(([key, value]) => {
        const fieldName = prefix ? `${prefix}${separator || '_'}${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value) && flatten) {
          traverse(value, fieldName);
        } else {
          fields.push(fieldName);
        }
      });
    };

    traverse(obj);
    return fields;
  }

  /**
   * Escape CSV special characters
   */
  private escapeCSV(text: string): string {
    if (!text) return '';
    
    // Remove or escape problematic characters
    return text
      .replace(/\r\n/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/\t/g, ' ')
      .trim();
  }

  /**
   * Truncate text with ellipsis
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Convert nested object to flat object
   */
  flattenObject(obj: object, separator: string = '_', prefix: string = ''): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    const flatten = (current: object, currentPrefix: string) => {
      Object.entries(current).forEach(([key, value]) => {
        const newKey = currentPrefix ? `${currentPrefix}${separator}${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, newKey);
        } else if (Array.isArray(value)) {
          // Convert arrays to semicolon-separated strings
          result[newKey] = value.join('; ');
        } else {
          result[newKey] = value;
        }
      });
    };

    flatten(obj, prefix);
    return result;
  }

  /**
   * Parse CSV back to objects
   */
  parseCSV<T>(csv: string, options: { headers?: boolean; delimiter?: string } = {}): T[] {
    const { headers = true, delimiter = ',' } = options;
    const lines = csv.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return [];

    const result: T[] = [];
    let headerRow: string[] = [];

    lines.forEach((line, index) => {
      const values = this.parseCSVLine(line, delimiter);

      if (headers && index === 0) {
        headerRow = values;
      } else {
        const obj: Record<string, string> = {};
        values.forEach((value, i) => {
          const key = headers ? headerRow[i] : `col_${i}`;
          obj[key] = value;
        });
        result.push(obj as T);
      }
    });

    return result;
  }

  /**
   * Parse a single CSV line (handling quoted values)
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }
}

export const csvExporter = new CSVExporter();
