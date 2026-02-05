/**
 * RAG (Retrieval-Augmented Generation) Format Exporter
 * Outputs research reports in formats optimized for AI agents and vector databases
 */

interface RAGChunk {
  chunk_id: string;
  text: string;
  metadata: {
    source_url?: string;
    source_title?: string;
    section?: string;
    research_id: string;
    research_query: string;
    generated_at: string;
    chunk_index: number;
    total_chunks: number;
  };
  embedding?: number[];
}

interface RAGDocument {
  document_id: string;
  title: string;
  summary: string;
  query: string;
  generated_at: string;
  total_chunks: number;
  sources: Array<{ url: string; title: string }>;
  tags: string[];
}

interface RAGOutput {
  document: RAGDocument;
  chunks: RAGChunk[];
}

export class RAGExporter {
  private chunkSize: number;
  private chunkOverlap: number;

  constructor(options?: { chunkSize?: number; chunkOverlap?: number }) {
    this.chunkSize = options?.chunkSize || 800; // ~200 tokens
    this.chunkOverlap = options?.chunkOverlap || 100;
  }

  /**
   * Split text into chunks optimized for embedding
   */
  private splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (currentChunk.length + trimmedSentence.length > this.chunkSize) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
        }
        
        // Start new chunk with overlap
        if (currentChunk.length > this.chunkOverlap) {
          const words = currentChunk.split(' ');
          const overlapWords = words.slice(-Math.floor(this.chunkOverlap / 5));
          currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
        } else {
          currentChunk = trimmedSentence;
        }
      } else {
        currentChunk += ' ' + trimmedSentence;
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Generate RAG-optimized export from research report
   */
  generateRAGFormat(report: {
    id: string;
    query: string;
    title: string;
    summary: string;
    sections: Array<{ id: string; title: string; content: string }>;
    sources: Array<{ url: string; title: string }>;
    generatedAt: string;
  }): RAGOutput {
    const allChunks: RAGChunk[] = [];
    let chunkIndex = 0;

    // Add summary as first chunk
    const summaryChunks = this.splitIntoChunks(report.summary);
    for (const text of summaryChunks) {
      allChunks.push({
        chunk_id: `${report.id}-summary-${chunkIndex}`,
        text,
        metadata: {
          section: 'Executive Summary',
          research_id: report.id,
          research_query: report.query,
          generated_at: report.generatedAt,
          chunk_index: chunkIndex,
          total_chunks: 0, // Will update later
        },
      });
      chunkIndex++;
    }

    // Process each section
    for (const section of report.sections) {
      const sectionChunks = this.splitIntoChunks(section.content);
      
      for (const text of sectionChunks) {
        allChunks.push({
          chunk_id: `${report.id}-${section.id}-${chunkIndex}`,
          text,
          metadata: {
            section: section.title,
            research_id: report.id,
            research_query: report.query,
            generated_at: report.generatedAt,
            chunk_index: chunkIndex,
            total_chunks: 0,
          },
        });
        chunkIndex++;
      }
    }

    // Update total chunks count
    for (const chunk of allChunks) {
      chunk.metadata.total_chunks = allChunks.length;
    }

    // Extract tags from content
    const tags = this.extractTags(report);

    return {
      document: {
        document_id: report.id,
        title: report.title,
        summary: report.summary,
        query: report.query,
        generated_at: report.generatedAt,
        total_chunks: allChunks.length,
        sources: report.sources,
        tags,
      },
      chunks: allChunks,
    };
  }

  /**
   * Export as JSONL format for vector DB ingestion
   */
  generateJSONL(ragOutput: RAGOutput): string {
    const lines: string[] = [];
    
    // Document metadata as first line
    lines.push(JSON.stringify({
      type: 'document',
      ...ragOutput.document,
    }));

    // Each chunk as separate line
    for (const chunk of ragOutput.chunks) {
      lines.push(JSON.stringify({
        type: 'chunk',
        ...chunk,
      }));
    }

    return lines.join('\n');
  }

  /**
   * Generate AI Knowledge Base format (for MEMORY.md style files)
   */
  generateKnowledgeBase(report: {
    id: string;
    query: string;
    title: string;
    summary: string;
    sections: Array<{ id: string; title: string; content: string }>;
    sources: Array<{ url: string; title: string }>;
    generatedAt: string;
    entities?: {
      people?: string[];
      companies?: string[];
      products?: string[];
    };
  }): string {
    const lines: string[] = [];

    lines.push(`# ${report.title}`);
    lines.push('');
    lines.push(`> AI-Ready Knowledge Base | Generated: ${report.generatedAt}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Quick Reference');
    lines.push('');
    lines.push(`- **Query:** ${report.query}`);
    lines.push(`- **Generated:** ${report.generatedAt}`);
    lines.push(`- **Sources:** ${report.sources.length}`);
    lines.push('');

    if (report.entities) {
      if (report.entities.companies?.length) {
        lines.push(`- **Companies:** ${report.entities.companies.join(', ')}`);
      }
      if (report.entities.people?.length) {
        lines.push(`- **People:** ${report.entities.people.join(', ')}`);
      }
      if (report.entities.products?.length) {
        lines.push(`- **Products:** ${report.entities.products.join(', ')}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(report.summary);
    lines.push('');
    lines.push('---');
    lines.push('');

    for (const section of report.sections) {
      lines.push(`## ${section.title}`);
      lines.push('');
      lines.push(section.content);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## Sources');
    lines.push('');
    for (const source of report.sources) {
      lines.push(`- [${source.title}](${source.url})`);
    }
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('## Metadata');
    lines.push('');
    lines.push('```yaml');
    lines.push(`research_id: ${report.id}`);
    lines.push(`research_date: ${report.generatedAt}`);
    lines.push('format_version: 1.0');
    lines.push('generator: InnovateResearch');
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*This document is formatted for AI agent consumption.*');

    return lines.join('\n');
  }

  private extractTags(report: any): string[] {
    const tags: string[] = [];
    
    // Extract from query
    const queryWords = report.query.toLowerCase().split(/\s+/);
    for (const word of queryWords) {
      if (word.length > 3 && !['about', 'what', 'the', 'and', 'for'].includes(word)) {
        tags.push(word);
      }
    }

    // Extract from title
    const titleWords = report.title.toLowerCase().split(/\s+/);
    for (const word of titleWords) {
      if (word.length > 3 && !tags.includes(word)) {
        tags.push(word);
      }
    }

    return tags.slice(0, 10);
  }
}

export const ragExporter = new RAGExporter();
export default ragExporter;
