/**
 * JSON Exporter Service
 * Generates typed JSON exports for API responses
 */

import { Report, Source } from '../../types';

// Export schema types
export interface JSONExportMetadata {
  version: string;
  exportedAt: string;
  exporter: string;
  format: 'full' | 'summary' | 'minimal';
  reportId: string;
  reportTitle: string;
}

export interface JSONExportSource {
  id?: string;
  title: string;
  url: string;
  snippet?: string;
  reliability?: string;
  accessedAt?: string;
  domain?: string;
}

export interface JSONExportSection {
  index: number;
  title: string;
  content: string;
  wordCount: number;
  subsections?: Array<{
    title: string;
    content: string;
  }>;
}

export interface JSONExportReport {
  metadata: JSONExportMetadata;
  report: {
    id: string;
    title: string;
    query: string;
    summary?: string;
    status: string;
    model?: string;
    createdAt: string;
    updatedAt?: string;
    tags?: string[];
  };
  content: {
    sections: JSONExportSection[];
    keyFindings?: string[];
    recommendations?: string[];
  };
  sources: JSONExportSource[];
  statistics: {
    totalSections: number;
    totalSources: number;
    totalWords: number;
    processingTime?: number;
  };
}

export interface JSONExportSummary {
  metadata: JSONExportMetadata;
  report: {
    id: string;
    title: string;
    query: string;
    summary?: string;
    status: string;
    createdAt: string;
  };
  keyFindings?: string[];
  sourcesCount: number;
}

export interface JSONExportMinimal {
  id: string;
  title: string;
  query: string;
  status: string;
  createdAt: string;
}

export interface JSONExportOptions {
  format?: 'full' | 'summary' | 'minimal';
  includeMetadata?: boolean;
  includeSources?: boolean;
  includeStatistics?: boolean;
  prettyPrint?: boolean;
  indentSpaces?: number;
}

export class JSONExporter {
  private readonly version = '1.0.0';
  private readonly exporter = 'InnovateHub Research';

  private readonly defaultOptions: JSONExportOptions = {
    format: 'full',
    includeMetadata: true,
    includeSources: true,
    includeStatistics: true,
    prettyPrint: true,
    indentSpaces: 2,
  };

  /**
   * Generate JSON export from report
   */
  generateJSON(
    report: Report,
    options: JSONExportOptions = {}
  ): JSONExportReport | JSONExportSummary | JSONExportMinimal {
    const opts = { ...this.defaultOptions, ...options };

    switch (opts.format) {
      case 'minimal':
        return this.generateMinimal(report);
      case 'summary':
        return this.generateSummary(report, opts);
      case 'full':
      default:
        return this.generateFull(report, opts);
    }
  }

  /**
   * Generate JSON string
   */
  generateJSONString(report: Report, options: JSONExportOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    const json = this.generateJSON(report, opts);

    if (opts.prettyPrint) {
      return JSON.stringify(json, null, opts.indentSpaces);
    }

    return JSON.stringify(json);
  }

  /**
   * Generate full export with all data
   */
  private generateFull(report: Report, opts: JSONExportOptions): JSONExportReport {
    const sections = this.processSections(report);
    const sources = opts.includeSources ? this.processSources(report.sources || []) : [];
    const totalWords = this.calculateTotalWords(report);

    const result: JSONExportReport = {
      metadata: this.generateMetadata(report, 'full'),
      report: {
        id: report.id,
        title: report.title,
        query: report.query,
        summary: report.summary,
        status: report.status,
        model: report.model,
        createdAt: new Date(report.createdAt).toISOString(),
        updatedAt: report.updatedAt ? new Date(report.updatedAt).toISOString() : undefined,
        tags: report.tags,
      },
      content: {
        sections,
        keyFindings: report.keyFindings,
        recommendations: report.recommendations,
      },
      sources,
      statistics: {
        totalSections: sections.length,
        totalSources: sources.length,
        totalWords,
        processingTime: report.processingTime,
      },
    };

    return result;
  }

  /**
   * Generate summary export
   */
  private generateSummary(report: Report, opts: JSONExportOptions): JSONExportSummary {
    return {
      metadata: this.generateMetadata(report, 'summary'),
      report: {
        id: report.id,
        title: report.title,
        query: report.query,
        summary: report.summary,
        status: report.status,
        createdAt: new Date(report.createdAt).toISOString(),
      },
      keyFindings: report.keyFindings,
      sourcesCount: report.sources?.length || 0,
    };
  }

  /**
   * Generate minimal export
   */
  private generateMinimal(report: Report): JSONExportMinimal {
    return {
      id: report.id,
      title: report.title,
      query: report.query,
      status: report.status,
      createdAt: new Date(report.createdAt).toISOString(),
    };
  }

  /**
   * Generate export metadata
   */
  private generateMetadata(
    report: Report,
    format: 'full' | 'summary' | 'minimal'
  ): JSONExportMetadata {
    return {
      version: this.version,
      exportedAt: new Date().toISOString(),
      exporter: this.exporter,
      format,
      reportId: report.id,
      reportTitle: report.title,
    };
  }

  /**
   * Process sections for export
   */
  private processSections(report: Report): JSONExportSection[] {
    if (!report.sections?.length) return [];

    return report.sections.map((section, index) => ({
      index: index + 1,
      title: section.title || `Section ${index + 1}`,
      content: section.content,
      wordCount: section.content.split(/\s+/).length,
      subsections: section.subsections?.map((sub: { title: string; content: string }) => ({
        title: sub.title,
        content: sub.content,
      })),
    }));
  }

  /**
   * Process sources for export
   */
  private processSources(sources: Source[]): JSONExportSource[] {
    return sources.map(source => {
      let domain: string | undefined;
      
      if (source.url) {
        try {
          domain = new URL(source.url).hostname;
        } catch {
          domain = undefined;
        }
      }

      return {
        id: source.id,
        title: source.title || 'Untitled Source',
        url: source.url || '',
        snippet: source.snippet,
        reliability: source.reliability,
        accessedAt: source.accessedAt 
          ? new Date(source.accessedAt).toISOString() 
          : undefined,
        domain,
      };
    });
  }

  /**
   * Calculate total word count
   */
  private calculateTotalWords(report: Report): number {
    let count = 0;

    // Summary
    if (report.summary) {
      count += report.summary.split(/\s+/).length;
    }

    // Sections
    report.sections?.forEach(section => {
      count += section.content.split(/\s+/).length;
      
      section.subsections?.forEach((sub: { content: string }) => {
        count += sub.content.split(/\s+/).length;
      });
    });

    // Key findings
    report.keyFindings?.forEach(finding => {
      count += finding.split(/\s+/).length;
    });

    return count;
  }

  /**
   * Generate batch export for multiple reports
   */
  generateBatchJSON(
    reports: Report[],
    options: JSONExportOptions = {}
  ): {
    metadata: {
      version: string;
      exportedAt: string;
      exporter: string;
      totalReports: number;
    };
    reports: Array<JSONExportReport | JSONExportSummary | JSONExportMinimal>;
  } {
    return {
      metadata: {
        version: this.version,
        exportedAt: new Date().toISOString(),
        exporter: this.exporter,
        totalReports: reports.length,
      },
      reports: reports.map(report => this.generateJSON(report, options)),
    };
  }

  /**
   * Generate API-ready response object
   */
  generateAPIResponse(
    report: Report,
    options: JSONExportOptions = {}
  ): {
    success: boolean;
    data: JSONExportReport | JSONExportSummary | JSONExportMinimal;
    timestamp: string;
  } {
    return {
      success: true,
      data: this.generateJSON(report, options),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate JSON export schema
   */
  validateExport(json: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!json || typeof json !== 'object') {
      errors.push('Export must be an object');
      return { valid: false, errors };
    }

    const obj = json as Record<string, unknown>;

    // Check for required fields based on format
    if ('metadata' in obj) {
      const metadata = obj.metadata as Record<string, unknown>;
      
      if (!metadata.version) errors.push('Missing metadata.version');
      if (!metadata.exportedAt) errors.push('Missing metadata.exportedAt');
      if (!metadata.format) errors.push('Missing metadata.format');
    }

    if ('report' in obj) {
      const report = obj.report as Record<string, unknown>;
      
      if (!report.id) errors.push('Missing report.id');
      if (!report.title) errors.push('Missing report.title');
      if (!report.query) errors.push('Missing report.query');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Parse and validate import
   */
  parseImport(jsonString: string): {
    valid: boolean;
    data?: JSONExportReport;
    errors: string[];
  } {
    try {
      const parsed = JSON.parse(jsonString);
      const validation = this.validateExport(parsed);

      if (!validation.valid) {
        return { valid: false, errors: validation.errors };
      }

      return { valid: true, data: parsed as JSONExportReport, errors: [] };
    } catch (error) {
      return {
        valid: false,
        errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Generate JSON Lines format (for streaming)
   */
  generateJSONL(reports: Report[], options: JSONExportOptions = {}): string {
    return reports
      .map(report => JSON.stringify(this.generateJSON(report, { ...options, prettyPrint: false })))
      .join('\n');
  }

  /**
   * Convert to different schema versions (for backwards compatibility)
   */
  convertToSchema(
    json: JSONExportReport,
    targetVersion: string
  ): JSONExportReport {
    // Currently only v1.0.0, but this allows future schema migrations
    if (targetVersion === this.version) {
      return json;
    }

    // Add schema conversion logic here as needed
    console.warn(`Schema conversion from ${json.metadata.version} to ${targetVersion} not implemented`);
    return json;
  }
}

export const jsonExporter = new JSONExporter();
