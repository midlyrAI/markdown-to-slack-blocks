/**
 * Type definitions for Markdown to Slack Block conversion
 */

import type { Block } from '@slack/types';

/**
 * Supported markdown element types
 */
export enum MarkdownElementType {
  DOCUMENT = 'document',
  HEADING = 'heading',
  PARAGRAPH = 'paragraph',
  STRONG = 'strong',
  EMPHASIS = 'emphasis',
  STRIKETHROUGH = 'strikethrough',
  CODE_INLINE = 'code_inline',
  CODE_BLOCK = 'code_block',
  LINK = 'link',
  IMAGE = 'image',
  LIST = 'list',
  LIST_ITEM = 'list_item',
  BLOCKQUOTE = 'blockquote',
  TABLE = 'table',
  TABLE_ROW = 'table_row',
  TABLE_CELL = 'table_cell',
  THEMATIC_BREAK = 'thematic_break',
  LINE_BREAK = 'line_break',
  TEXT = 'text',
}

/**
 * Options for markdown conversion
 */
export interface MarkdownConverterOptions {
  /**
   * Whether to expand all section blocks by default.
   * If true, section blocks will always be fully expanded.
   * If false, Slack may show "Show more" button for long content.
   * Default: true
   */
  expandSections?: boolean;

  /**
   * Maximum header text length (Slack limit is 150)
   */
  maxHeaderLength?: number;

  /**
   * Maximum section text length (Slack limit is 3000)
   */
  maxSectionLength?: number;

  /**
   * Maximum table rows (Slack limit is 100)
   */
  maxTableRows?: number;

  /**
   * Maximum table columns (Slack limit is 20)
   */
  maxTableColumns?: number;
}

/**
 * Parsed markdown node structure
 */
export interface MarkdownNode {
  type: MarkdownElementType;
  content?: string;
  children?: MarkdownNode[];
  attributes?: Record<string, unknown>;
}

/**
 * Custom TableBlock type (not in standard Slack types)
 * Based on: https://docs.slack.dev/reference/block-kit/blocks/table-block/
 */
export interface TableBlock extends Block {
  type: 'table';
  rows: TableCell[][]; // Array of rows, where each row is an array of cells
  block_id?: string;
  column_settings?: ColumnSetting[];
}

export interface TableCell {
  type: 'raw_text' | 'rich_text';
  text?: string; // For raw_text
  elements?: RichTextSection[]; // For rich_text
}

export interface ColumnSetting {
  align?: 'left' | 'center' | 'right';
  is_wrapped?: boolean;
}

/**
 * Rich text element parts for formatting
 */
export interface RichTextStyle {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
}

export interface RichTextElement {
  type: 'text' | 'link' | 'emoji' | 'channel' | 'user' | 'usergroup' | 'date' | 'broadcast';
  text?: string;
  url?: string;
  style?: RichTextStyle;
}

export interface RichTextSection {
  type: 'rich_text_section';
  elements: RichTextElement[];
}

export interface RichTextList {
  type: 'rich_text_list';
  style: 'bullet' | 'ordered';
  indent?: number;
  offset?: number;
  elements: RichTextSection[];
}

export interface RichTextQuote {
  type: 'rich_text_quote';
  elements: RichTextElement[];
}

export interface RichTextPreformatted {
  type: 'rich_text_preformatted';
  elements: RichTextElement[];
}

/**
 * Rich text block structure
 */
export interface RichTextBlock {
  type: 'rich_text';
  elements: Array<RichTextSection | RichTextList | RichTextQuote | RichTextPreformatted>;
}

/**
 * Extended Block type to include our custom TableBlock and RichTextBlock
 */
export type SlackBlock = Block | TableBlock | RichTextBlock;

/**
 * Result of markdown conversion
 */
export interface MarkdownConversionResult {
  blocks: SlackBlock[];
  warnings?: string[];
}
