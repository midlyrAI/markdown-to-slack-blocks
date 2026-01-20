/**
 * Slack block builders for markdown elements
 * Uses rich_text blocks as the primary format for better formatting support
 */

import type { DividerBlock } from '@slack/types';

import { MarkdownElementType } from './markdown-types';
import type {
  MarkdownNode,
  SlackBlock,
  TableBlock,
  TableCell,
  ColumnSetting,
  RichTextElement,
  RichTextSection,
  RichTextList,
  RichTextQuote,
  RichTextPreformatted,
  RichTextStyle,
  RichTextBlock,
  MarkdownConverterOptions,
} from './markdown-types';

/**
 * Default conversion options
 */
const DEFAULT_OPTIONS: Required<MarkdownConverterOptions> = {
  expandSections: true,
  maxHeaderLength: 150,
  maxSectionLength: 3000,
  maxTableRows: 100,
  maxTableColumns: 20,
};

type RichTextBlockElement = RichTextSection | RichTextList | RichTextQuote | RichTextPreformatted;

/**
 * Build Slack blocks from markdown nodes
 * Primarily uses rich_text blocks for better formatting support
 */
export class SlackBlockBuilder {
  private options: Required<MarkdownConverterOptions>;
  private currentRichTextElements: RichTextBlockElement[] = [];

  constructor(options: MarkdownConverterOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Convert a markdown node tree to Slack blocks
   */
  buildBlocks(node: MarkdownNode): SlackBlock[] {
    const blocks: SlackBlock[] = [];
    this.currentRichTextElements = [];

    if (node.type === MarkdownElementType.DOCUMENT && node.children) {
      for (const child of node.children) {
        // Handle special block types that can't be in rich_text
        if (child.type === MarkdownElementType.THEMATIC_BREAK) {
          // Flush any pending rich text elements
          this.flushRichTextElements(blocks);
          blocks.push(this.buildDividerBlock());
        } else if (child.type === MarkdownElementType.TABLE) {
          // Flush any pending rich text elements
          this.flushRichTextElements(blocks);
          const tableBlock = this.buildTableBlock(child);
          if (tableBlock) {
            blocks.push(tableBlock);
          }
        } else {
          // Accumulate rich text elements (including headers as bold text)
          const richElements = this.buildRichTextElement(child);
          if (richElements) {
            if (Array.isArray(richElements)) {
              this.currentRichTextElements.push(...richElements);
            } else {
              this.currentRichTextElements.push(richElements);
            }
          }
        }
      }
    }

    // Flush any remaining rich text elements
    this.flushRichTextElements(blocks);

    return blocks;
  }

  /**
   * Convert a markdown node tree to multiple arrays of Slack blocks
   * Splits into separate arrays when multiple tables are encountered
   * (Slack only allows one table per message)
   */
  buildBlocksMultiple(node: MarkdownNode): SlackBlock[][] {
    const blockArrays: SlackBlock[][] = [];
    let currentBlocks: SlackBlock[] = [];
    let tableCount = 0;
    this.currentRichTextElements = [];

    if (node.type === MarkdownElementType.DOCUMENT && node.children) {
      for (const child of node.children) {
        // Handle special block types that can't be in rich_text
        if (child.type === MarkdownElementType.THEMATIC_BREAK) {
          // Flush any pending rich text elements
          this.flushRichTextElements(currentBlocks);
          currentBlocks.push(this.buildDividerBlock());
        } else if (child.type === MarkdownElementType.TABLE) {
          // Check if we already have a table in the current block array
          if (tableCount > 0) {
            // Flush any pending rich text elements to current blocks
            this.flushRichTextElements(currentBlocks);

            // Save current blocks if they have content
            if (currentBlocks.length > 0) {
              blockArrays.push(currentBlocks);
            }

            // Start a new block array for this table
            currentBlocks = [];
            tableCount = 0;
          }

          // Flush any pending rich text elements
          this.flushRichTextElements(currentBlocks);

          const tableBlock = this.buildTableBlock(child);
          if (tableBlock) {
            currentBlocks.push(tableBlock);
            tableCount++;
          }
        } else {
          // Accumulate rich text elements (including headers as bold text)
          const richElements = this.buildRichTextElement(child);
          if (richElements) {
            if (Array.isArray(richElements)) {
              this.currentRichTextElements.push(...richElements);
            } else {
              this.currentRichTextElements.push(richElements);
            }
          }
        }
      }
    }

    // Flush any remaining rich text elements
    this.flushRichTextElements(currentBlocks);

    // Add the final block array if it has content
    if (currentBlocks.length > 0) {
      blockArrays.push(currentBlocks);
    }

    // If no blocks were created, return an empty array in an array
    if (blockArrays.length === 0) {
      blockArrays.push([]);
    }

    return blockArrays;
  }

  /**
   * Flush accumulated rich text elements into a rich_text block
   */
  private flushRichTextElements(blocks: SlackBlock[]): void {
    if (this.currentRichTextElements.length > 0) {
      const richTextBlock: RichTextBlock = {
        type: 'rich_text',
        elements: this.currentRichTextElements,
      };
      blocks.push(richTextBlock);
      this.currentRichTextElements = [];
    }
  }

  /**
   * Build rich text element from a markdown node
   */
  private buildRichTextElement(
    node: MarkdownNode
  ): RichTextBlockElement | RichTextBlockElement[] | null {
    switch (node.type) {
      case MarkdownElementType.HEADING:
        return this.buildHeadingAsRichText(node);
      case MarkdownElementType.PARAGRAPH:
        return this.buildRichTextSection(node);
      case MarkdownElementType.CODE_BLOCK:
        return this.buildRichTextPreformatted(node);
      case MarkdownElementType.BLOCKQUOTE:
        return this.buildRichTextQuote(node);
      case MarkdownElementType.LIST:
        return this.buildRichTextList(node);
      default:
        return null;
    }
  }

  /**
   * Build a heading as bold rich text section
   * This allows headers to contain links and other formatting
   */
  private buildHeadingAsRichText(node: MarkdownNode): RichTextSection {
    // Apply bold style to all elements in the heading
    const elements = this.buildRichTextElements(node, { bold: true });

    // Get heading level for visual hierarchy
    const level = (node.attributes?.level as number) || 1;

    // Add visual separator for major headings (# and ##)
    const headingElements: RichTextElement[] = [];

    // For h1 and h2, add some visual separation
    if (level === 1) {
      // H1: Add newline before if not at start
      if (this.currentRichTextElements.length > 0) {
        headingElements.push({ type: 'text', text: '\n' });
      }
      headingElements.push(...elements);
      headingElements.push({ type: 'text', text: '\n' }); // Add newline after
    } else if (level === 2) {
      // H2: Add newline before if not at start
      if (this.currentRichTextElements.length > 0) {
        headingElements.push({ type: 'text', text: '\n' });
      }
      headingElements.push(...elements);
      headingElements.push({ type: 'text', text: '\n' }); // Add newline after
    } else {
      // H3 and below: just bold text with normal spacing
      headingElements.push(...elements);
    }

    return {
      type: 'rich_text_section',
      elements: headingElements.length > 0 ? headingElements : [{ type: 'text', text: ' ' }],
    };
  }

  /**
   * Build a divider block (can't be in rich_text)
   */
  private buildDividerBlock(): DividerBlock {
    return {
      type: 'divider',
    };
  }

  /**
   * Build a rich text section for paragraphs
   */
  private buildRichTextSection(node: MarkdownNode): RichTextSection {
    const elements = this.buildRichTextElements(node);

    return {
      type: 'rich_text_section',
      elements: elements.length > 0 ? elements : [{ type: 'text', text: ' ' }],
    };
  }

  /**
   * Build a rich text preformatted block for code
   */
  private buildRichTextPreformatted(node: MarkdownNode): RichTextPreformatted {
    const code = node.content || '';

    return {
      type: 'rich_text_preformatted',
      elements: [
        {
          type: 'text',
          text: code,
        },
      ],
    };
  }

  /**
   * Build a rich text quote block
   */
  private buildRichTextQuote(node: MarkdownNode): RichTextQuote {
    const elements = this.buildRichTextElements(node);

    return {
      type: 'rich_text_quote',
      elements: elements.length > 0 ? elements : [{ type: 'text', text: ' ' }],
    };
  }

  /**
   * Build a rich text list
   */
  private buildRichTextList(node: MarkdownNode, indent: number = 0): RichTextList {
    const isOrdered = (node.attributes?.ordered as boolean) || false;
    const startNumber = (node.attributes?.start as number) || 1;
    const sections: RichTextSection[] = [];

    if (node.children) {
      for (const item of node.children) {
        if (item.type === MarkdownElementType.LIST_ITEM) {
          const elements = this.buildRichTextElements(item);
          sections.push({
            type: 'rich_text_section',
            elements: elements.length > 0 ? elements : [{ type: 'text', text: ' ' }],
          });
        }
      }
    }

    const listElement: RichTextList = {
      type: 'rich_text_list',
      style: isOrdered ? 'ordered' : 'bullet',
      elements: sections,
    };

    if (indent > 0 && indent <= 8) {
      listElement.indent = indent;
    }

    if (isOrdered && startNumber > 1) {
      listElement.offset = startNumber - 1;
    }

    return listElement;
  }

  /**
   * Build a table block with rich_text cells for markdown support
   * https://docs.slack.dev/reference/block-kit/blocks/table-block/
   */
  private buildTableBlock(node: MarkdownNode): TableBlock | null {
    const rows: TableCell[][] = [];
    let maxColumns = 0;

    if (node.children) {
      for (let i = 0; i < Math.min(node.children.length, this.options.maxTableRows); i++) {
        const rowNode = node.children[i];
        if (rowNode.type === MarkdownElementType.TABLE_ROW && rowNode.children) {
          const cells: TableCell[] = [];

          for (
            let j = 0;
            j < Math.min(rowNode.children.length, this.options.maxTableColumns);
            j++
          ) {
            const cellNode = rowNode.children[j];

            // Build rich text elements to support markdown formatting in cells
            const richTextElements = this.buildRichTextElements(cellNode);

            // Use rich_text to enable markdown rendering inside table cells
            cells.push({
              type: 'rich_text',
              elements: [
                {
                  type: 'rich_text_section',
                  elements:
                    richTextElements.length > 0 ? richTextElements : [{ type: 'text', text: ' ' }],
                },
              ],
            });
          }

          maxColumns = Math.max(maxColumns, cells.length);
          rows.push(cells);
        }
      }
    }

    if (rows.length === 0) {
      return null;
    }

    // Create column_settings with text wrapping enabled for all columns
    const column_settings: ColumnSetting[] = Array(maxColumns)
      .fill(null)
      .map(() => ({
        is_wrapped: true,
      }));

    return {
      type: 'table',
      rows,
      column_settings,
    };
  }

  /**
   * Build rich text elements from a markdown node
   * Following Slack's rich_text element specifications
   */
  private buildRichTextElements(
    node: MarkdownNode,
    currentStyle?: RichTextStyle
  ): RichTextElement[] {
    const elements: RichTextElement[] = [];

    // Handle text nodes
    if (node.type === MarkdownElementType.TEXT) {
      if (node.content) {
        const element: RichTextElement = {
          type: 'text',
          text: node.content,
        };
        // Only add style object if there are actual styles to apply
        if (currentStyle && this.hasStyle(currentStyle)) {
          element.style = currentStyle;
        }
        elements.push(element);
      }
      return elements;
    }

    // Handle formatting nodes - accumulate styles
    if (node.type === MarkdownElementType.STRONG) {
      const newStyle: RichTextStyle = {
        ...currentStyle,
        bold: true,
      };
      if (node.children) {
        for (const child of node.children) {
          elements.push(...this.buildRichTextElements(child, newStyle));
        }
      } else if (node.content) {
        elements.push({
          type: 'text',
          text: node.content,
          style: newStyle,
        });
      }
      return elements;
    }

    if (node.type === MarkdownElementType.EMPHASIS) {
      const newStyle: RichTextStyle = {
        ...currentStyle,
        italic: true,
      };
      if (node.children) {
        for (const child of node.children) {
          elements.push(...this.buildRichTextElements(child, newStyle));
        }
      } else if (node.content) {
        elements.push({
          type: 'text',
          text: node.content,
          style: newStyle,
        });
      }
      return elements;
    }

    if (node.type === MarkdownElementType.STRIKETHROUGH) {
      const newStyle: RichTextStyle = {
        ...currentStyle,
        strike: true,
      };
      if (node.children) {
        for (const child of node.children) {
          elements.push(...this.buildRichTextElements(child, newStyle));
        }
      } else if (node.content) {
        elements.push({
          type: 'text',
          text: node.content,
          style: newStyle,
        });
      }
      return elements;
    }

    if (node.type === MarkdownElementType.CODE_INLINE) {
      const newStyle: RichTextStyle = {
        ...currentStyle,
        code: true,
      };
      // Inline code is a text element with code style
      elements.push({
        type: 'text',
        text: node.content || '',
        style: newStyle,
      });
      return elements;
    }

    // Handle links - these are separate element types in rich_text
    if (node.type === MarkdownElementType.LINK) {
      const url = (node.attributes?.href as string) || '';
      const linkText = node.content;

      // Create a link element following Slack's schema
      const linkElement: RichTextElement = {
        type: 'link',
        url: url,
      };

      // Only add text if it's different from the URL
      // If text is provided and different, it will be displayed instead of URL
      if (linkText && linkText !== url) {
        linkElement.text = linkText;
      }

      // Links can have styles too (bold, italic, etc.)
      if (currentStyle && this.hasStyle(currentStyle)) {
        linkElement.style = currentStyle;
      }

      elements.push(linkElement);
      return elements;
    }

    // Handle images - convert to links since rich_text doesn't have image elements
    if (node.type === MarkdownElementType.IMAGE) {
      const src = (node.attributes?.src as string) || '';
      const alt = node.content || 'Image';

      // Create a link to the image with alt text as the link text
      const imageLink: RichTextElement = {
        type: 'link',
        url: src,
        text: alt !== src ? alt : undefined, // Only set text if different from URL
      };

      elements.push(imageLink);
      return elements;
    }

    // Handle line breaks - newlines in text
    if (node.type === MarkdownElementType.LINE_BREAK) {
      elements.push({
        type: 'text',
        text: '\n',
      });
      return elements;
    }

    // Process children with current style
    if (node.children) {
      for (const child of node.children) {
        elements.push(...this.buildRichTextElements(child, currentStyle));
      }
    } else if (node.content) {
      // Fallback for nodes with just content
      const element: RichTextElement = {
        type: 'text',
        text: node.content,
      };
      // If the node is a parent item, apply bold style
      if (currentStyle && this.hasStyle(currentStyle)) {
        element.style = {
          ...currentStyle,
          bold: (node.attributes?.parentItem as boolean) ? true : undefined,
        };
      }
      elements.push(element);
    }

    return elements;
  }

  /**
   * Check if a style has any formatting
   */
  private hasStyle(style: RichTextStyle): boolean {
    return !!(style.bold || style.italic || style.strike || style.code);
  }
}
