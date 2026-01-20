/**
 * markdown-to-slack-blocks
 * Convert Markdown to Slack Block Kit blocks with full formatting support
 *
 * @packageDocumentation
 */

// Main converter functions
export {
  markdownToSlackBlocks,
  markdownToSlackBlocksMultiple,
  markdownToSlackBlocksWithMetadata,
  markdownToSlackBlocksJson,
  MarkdownConverter,
} from './markdown-converter';

// Parser for advanced use cases
export { MarkdownParser } from './markdown-parser';

// Block builder for advanced use cases
export { SlackBlockBuilder } from './markdown-block-builder';

// Types
export type {
  SlackBlock,
  MarkdownConverterOptions,
  MarkdownConversionResult,
  TableBlock,
  TableCell,
  ColumnSetting,
  MarkdownNode,
  RichTextElement,
  RichTextSection,
  RichTextList,
  RichTextQuote,
  RichTextPreformatted,
  RichTextStyle,
  RichTextBlock,
} from './markdown-types';

// Enum
export { MarkdownElementType } from './markdown-types';
