/**
 * Main markdown to Slack blocks converter
 * Provides a simple API for converting markdown strings to Slack Block Kit blocks
 */

import { MarkdownParser } from './markdown-parser';
import { SlackBlockBuilder } from './markdown-block-builder';
import type {
  SlackBlock,
  MarkdownConverterOptions,
  MarkdownConversionResult,
} from './markdown-types';

/**
 * Convert markdown text to Slack blocks
 *
 * @param markdown - The markdown text to convert
 * @param options - Optional conversion options
 * @returns Array of Slack blocks ready to use with Slack API
 *
 * @example
 * ```typescript
 * const blocks = markdownToSlackBlocks('# Hello World\n\nThis is **bold** text.');
 *
 * // Use with Slack SDK
 * await client.chat.postMessage({
 *   channel: '#general',
 *   blocks: blocks
 * });
 * ```
 */
export function markdownToSlackBlocks(
  markdown: string,
  options: MarkdownConverterOptions = {}
): SlackBlock[] {
  const parser = new MarkdownParser(markdown);
  const builder = new SlackBlockBuilder(options);

  const document = parser.parse();
  const blocks = builder.buildBlocks(document);

  return blocks;
}

/**
 * Convert markdown text to Slack blocks, splitting into multiple arrays if multiple tables are present
 * Since Slack only allows one table per message, this function returns an array of block arrays
 *
 * @param markdown - The markdown text to convert
 * @param options - Optional conversion options
 * @returns Array of arrays of Slack blocks (each sub-array can be sent as a separate message)
 *
 * @example
 * ```typescript
 * const blockArrays = markdownToSlackBlocksMultiple('# Report\n\n|Table1|...\n\n|Table2|...');
 *
 * // Send as multiple messages
 * for (const blocks of blockArrays) {
 *   await client.chat.postMessage({
 *     channel: '#general',
 *     blocks: blocks
 *   });
 * }
 * ```
 */
export function markdownToSlackBlocksMultiple(
  markdown: string,
  options: MarkdownConverterOptions = {}
): SlackBlock[][] {
  const parser = new MarkdownParser(markdown);
  const builder = new SlackBlockBuilder(options);

  const document = parser.parse();
  const blockArrays = builder.buildBlocksMultiple(document);

  return blockArrays;
}

/**
 * Convert markdown text to Slack blocks with additional metadata
 *
 * @param markdown - The markdown text to convert
 * @param options - Optional conversion options
 * @returns Conversion result with blocks and any warnings
 *
 * @example
 * ```typescript
 * const result = markdownToSlackBlocksWithMetadata('# Title\n\nContent');
 *
 * if (result.warnings?.length) {
 *   console.log('Conversion warnings:', result.warnings);
 * }
 *
 * await client.chat.postMessage({
 *   channel: '#general',
 *   blocks: result.blocks
 * });
 * ```
 */
export function markdownToSlackBlocksWithMetadata(
  markdown: string,
  options: MarkdownConverterOptions = {}
): MarkdownConversionResult {
  const warnings: string[] = [];

  try {
    const blocks = markdownToSlackBlocks(markdown, options);

    // Check for block limits
    if (blocks.length > 50) {
      warnings.push(
        `Block count (${blocks.length}) exceeds Slack's recommended limit of 50 blocks per message`
      );
    }

    // Check for table blocks that might not render properly
    const tableBlocks = blocks.filter(b => b.type === 'table');
    if (tableBlocks.length > 0) {
      warnings.push(
        'Table blocks are custom implementations and may not render in all Slack clients'
      );
    }

    return {
      blocks,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      blocks: [],
      warnings: [`Conversion error: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Convert markdown to Slack blocks as JSON objects
 * This is useful when you need to serialize the blocks for storage or API calls
 *
 * @param markdown - The markdown text to convert
 * @param options - Optional conversion options
 * @returns Array of plain JavaScript objects representing Slack blocks
 *
 * @example
 * ```typescript
 * const blocksJson = markdownToSlackBlocksJson('# Hello\n\nWorld');
 *
 * // Can be serialized to JSON
 * const jsonString = JSON.stringify(blocksJson);
 * ```
 */
export function markdownToSlackBlocksJson(
  markdown: string,
  options: MarkdownConverterOptions = {}
): Record<string, unknown>[] {
  const blocks = markdownToSlackBlocks(markdown, options);
  // Blocks are already plain objects, but we ensure they're JSON-serializable
  return JSON.parse(JSON.stringify(blocks)) as Record<string, unknown>[];
}

/**
 * Convenience class for converting markdown with persistent options
 *
 * @example
 * ```typescript
 * const converter = new MarkdownConverter({
 *   expandSections: false,
 *   maxHeaderLength: 100
 * });
 *
 * const blocks1 = converter.convert('# Title 1');
 * const blocks2 = converter.convert('# Title 2');
 * ```
 */
export class MarkdownConverter {
  private options: MarkdownConverterOptions;

  constructor(options: MarkdownConverterOptions = {}) {
    this.options = options;
  }

  /**
   * Convert markdown to Slack blocks
   */
  convert(markdown: string): SlackBlock[] {
    return markdownToSlackBlocks(markdown, this.options);
  }

  /**
   * Convert markdown to multiple Slack block arrays (for multiple tables)
   */
  convertMultiple(markdown: string): SlackBlock[][] {
    return markdownToSlackBlocksMultiple(markdown, this.options);
  }

  /**
   * Convert markdown to Slack blocks with metadata
   */
  convertWithMetadata(markdown: string): MarkdownConversionResult {
    return markdownToSlackBlocksWithMetadata(markdown, this.options);
  }

  /**
   * Convert markdown to Slack blocks as JSON
   */
  convertToJson(markdown: string): Record<string, unknown>[] {
    return markdownToSlackBlocksJson(markdown, this.options);
  }

  /**
   * Update converter options
   */
  setOptions(options: MarkdownConverterOptions): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current converter options
   */
  getOptions(): MarkdownConverterOptions {
    return { ...this.options };
  }
}
