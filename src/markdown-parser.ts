/**
 * Lightweight markdown parser for converting markdown to Slack blocks
 * This is a simplified parser that handles the most common markdown patterns
 */

import { MarkdownElementType } from './markdown-types';
import type { MarkdownNode } from './markdown-types';

/**
 * Parse markdown string into a tree structure
 */
export class MarkdownParser {
  private lines: string[];

  constructor(markdown: string) {
    this.lines = markdown.split('\n');
  }

  /**
   * Parse the entire document
   */
  parse(): MarkdownNode {
    const document: MarkdownNode = {
      type: MarkdownElementType.DOCUMENT,
      children: [],
    };

    let currentIndex = 0;
    while (currentIndex < this.lines.length) {
      const line = this.lines[currentIndex];
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        currentIndex++;
        continue;
      }

      // Check for headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const content = this.parseInlineElements(headerMatch[2]);
        document.children!.push({
          type: MarkdownElementType.HEADING,
          children: content,
          attributes: { level },
        });
        currentIndex++;
        continue;
      }

      // Check for horizontal rule
      if (trimmedLine.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
        document.children!.push({
          type: MarkdownElementType.THEMATIC_BREAK,
        });
        currentIndex++;
        continue;
      }

      // Check for code block
      if (trimmedLine.startsWith('```')) {
        const codeBlock = this.parseCodeBlock(currentIndex);
        if (codeBlock) {
          document.children!.push(codeBlock);
          currentIndex = codeBlock.attributes!.endIndex as number;
          continue;
        }
      }

      // Check for blockquote
      if (trimmedLine.startsWith('>')) {
        const blockquote = this.parseBlockquote(currentIndex);
        document.children!.push(blockquote);
        currentIndex = blockquote.attributes!.endIndex as number;
        continue;
      }

      // Check for lists (supporting both "1." and "1)" formats)
      const listMatch = trimmedLine.match(/^(\*|-|\+|\d+[.)\]])\s+/);
      if (listMatch) {
        const list = this.parseList(currentIndex);
        document.children!.push(list);
        currentIndex = list.attributes!.endIndex as number;
        continue;
      }

      // Check for table
      if (this.isTableStart(currentIndex)) {
        const table = this.parseTable(currentIndex);
        document.children!.push(table);
        currentIndex = table.attributes!.endIndex as number;
        continue;
      }

      // Default to paragraph
      const paragraph = this.parseParagraph(currentIndex);
      document.children!.push(paragraph);
      currentIndex = paragraph.attributes!.endIndex as number;
    }

    return document;
  }

  /**
   * Parse a code block
   */
  private parseCodeBlock(startIndex: number): MarkdownNode | null {
    const startLine = this.lines[startIndex];
    const match = startLine.match(/^```(\w+)?/);
    if (!match) return null;

    const language = match[1] || '';
    const codeLines: string[] = [];
    let currentIndex = startIndex + 1;

    while (currentIndex < this.lines.length) {
      const line = this.lines[currentIndex];
      if (line.trim().startsWith('```')) {
        currentIndex++;
        break;
      }
      codeLines.push(line);
      currentIndex++;
    }

    return {
      type: MarkdownElementType.CODE_BLOCK,
      content: codeLines.join('\n'),
      attributes: { language, endIndex: currentIndex },
    };
  }

  /**
   * Parse a blockquote
   */
  private parseBlockquote(startIndex: number): MarkdownNode {
    const quoteLines: string[] = [];
    let currentIndex = startIndex;

    while (currentIndex < this.lines.length) {
      const line = this.lines[currentIndex];
      const trimmed = line.trim();
      if (!trimmed.startsWith('>')) {
        break;
      }
      // Remove the > prefix and optional space
      const content = trimmed.replace(/^>\s?/, '');
      quoteLines.push(content);
      currentIndex++;
    }

    const content = quoteLines.join('\n');
    const children = this.parseInlineElements(content);

    return {
      type: MarkdownElementType.BLOCKQUOTE,
      children,
      attributes: { endIndex: currentIndex },
    };
  }

  /**
   * Parse a list (ordered or unordered)
   * Handles indented items by appending them to the previous unindented item
   */
  private parseList(startIndex: number): MarkdownNode {
    const items: MarkdownNode[] = [];
    let currentIndex = startIndex;
    let isOrdered = false;
    let startNumber = 1;
    let lastItem: MarkdownNode | null = null;

    while (currentIndex < this.lines.length) {
      const line = this.lines[currentIndex];
      const trimmed = line.trim();

      // Check for list item (supporting both "1." and "1)" formats for ordered lists)
      const unorderedMatch = trimmed.match(/^(\*|-|\+)\s+(.*)$/);
      const orderedMatch = trimmed.match(/^(\d+)[.)\]]\s+(.*)$/);

      // Check if this line is indented
      const isIndented = line.startsWith('  ') || line.startsWith('\t') || line.match(/^\s{2,}/);
      const indentedOrderedMatch = isIndented && trimmed.match(/^(\d+)[.)\]]\s+(.*)$/);
      const indentedUnorderedMatch = isIndented && trimmed.match(/^(\*|-|\+)\s+(.*)$/);

      if (!unorderedMatch && !orderedMatch && !indentedOrderedMatch && !indentedUnorderedMatch) {
        // Check for continuation text (indented but not a list item)
        if (isIndented && trimmed && items.length > 0) {
          const lastItem = items[items.length - 1];
          // Append to the last item's children as continuation text
          if (lastItem.children) {
            lastItem.children.push({
              type: MarkdownElementType.TEXT,
              content: '\n' + trimmed,
            });
          }
          currentIndex++;
          continue;
        }
        break;
      }

      // Handle ordered items (non-indented)
      if (orderedMatch && !isIndented) {
        isOrdered = true;
        const numberMatch = orderedMatch[1].match(/^(\d+)/);
        if (items.length === 0 && numberMatch) {
          startNumber = parseInt(numberMatch[1], 10);
        }
        const content = orderedMatch[2];
        const newItem: MarkdownNode = {
          type: MarkdownElementType.LIST_ITEM,
          children: this.parseInlineElements(content),
        };
        items.push(newItem);
        lastItem = newItem;
      }
      // Handle unordered items (non-indented)
      else if (unorderedMatch && !isIndented) {
        const content = unorderedMatch[2];
        const newItem: MarkdownNode = {
          type: MarkdownElementType.LIST_ITEM,
          children: this.parseInlineElements(content),
        };
        items.push(newItem);
        lastItem = newItem;
        // If we haven't determined list type yet, mark as unordered
        if (items.length === 1) {
          isOrdered = false;
        }
      }
      // Handle any indented item (ordered or unordered)
      else if ((indentedOrderedMatch || indentedUnorderedMatch) && lastItem) {
        const match = indentedOrderedMatch || indentedUnorderedMatch;
        const content = match![2];

        // Determine the prefix based on the type of indented item
        let prefix = '\n- '; // Default for unordered
        if (indentedOrderedMatch) {
          // Extract the full pattern including separator
          const numberWithSeparator = match![1];
          prefix = `\n${numberWithSeparator} `;
        }

        // Append the indented item to the last unindented item
        lastItem.children!.push(
          {
            type: MarkdownElementType.TEXT,
            content: prefix,
          },
          ...this.parseInlineElements(content)
        );

        // Signal different formatting for the "parent" item
        lastItem.attributes = {
          ...lastItem.attributes,
          parentItem: true,
        };
      }

      currentIndex++;
    }

    return {
      type: MarkdownElementType.LIST,
      children: items,
      attributes: {
        ordered: isOrdered,
        start: isOrdered ? startNumber : undefined,
        endIndex: currentIndex,
      },
    };
  }

  /**
   * Check if the current position starts a table
   */
  private isTableStart(index: number): boolean {
    if (index + 1 >= this.lines.length) return false;

    const firstLine = this.lines[index];
    const secondLine = this.lines[index + 1];

    // Check if first line has pipes and second line is separator
    return firstLine.includes('|') && secondLine.trim().match(/^\|?[\s\-:|]+\|?$/) !== null;
  }

  /**
   * Parse a table
   */
  private parseTable(startIndex: number): MarkdownNode {
    const rows: MarkdownNode[] = [];
    let currentIndex = startIndex;

    // Parse header row
    const headerLine = this.lines[currentIndex];
    const headerCells = this.parseTableRow(headerLine);
    rows.push({
      type: MarkdownElementType.TABLE_ROW,
      children: headerCells.map(cellContent => ({
        type: MarkdownElementType.TABLE_CELL,
        // Parse inline elements in the cell content (links, bold, italic, etc.)
        children: this.parseInlineElements(cellContent),
        attributes: { isHeader: true },
      })),
    });
    currentIndex++;

    // Skip separator row
    currentIndex++;

    // Parse data rows
    while (currentIndex < this.lines.length) {
      const line = this.lines[currentIndex];
      if (!line.includes('|')) {
        break;
      }

      const cells = this.parseTableRow(line);
      rows.push({
        type: MarkdownElementType.TABLE_ROW,
        children: cells.map(cellContent => ({
          type: MarkdownElementType.TABLE_CELL,
          // Parse inline elements in the cell content (links, bold, italic, etc.)
          children: this.parseInlineElements(cellContent),
        })),
      });
      currentIndex++;
    }

    return {
      type: MarkdownElementType.TABLE,
      children: rows,
      attributes: { endIndex: currentIndex },
    };
  }

  /**
   * Parse a table row
   */
  private parseTableRow(line: string): string[] {
    // Remove leading and trailing pipes if present
    let cleaned = line.trim();
    if (cleaned.startsWith('|')) cleaned = cleaned.slice(1);
    if (cleaned.endsWith('|')) cleaned = cleaned.slice(0, -1);

    // Split by pipe and trim each cell
    return cleaned.split('|').map(cell => cell.trim());
  }

  /**
   * Parse a paragraph
   */
  private parseParagraph(startIndex: number): MarkdownNode {
    const lines: string[] = [];
    let currentIndex = startIndex;

    while (currentIndex < this.lines.length) {
      const line = this.lines[currentIndex];
      const trimmed = line.trim();

      // Stop at empty lines or special block starts
      if (
        !trimmed ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('```') ||
        trimmed.startsWith('>') ||
        trimmed.match(/^(\*|-|\+|\d+[.)\]])\s+/) ||
        trimmed.match(/^(-{3,}|\*{3,}|_{3,})$/) ||
        this.isTableStart(currentIndex)
      ) {
        break;
      }

      lines.push(line);
      currentIndex++;
    }

    const content = lines.join('\n');
    const children = this.parseInlineElements(content);

    return {
      type: MarkdownElementType.PARAGRAPH,
      children,
      attributes: { endIndex: currentIndex },
    };
  }

  /**
   * Parse inline markdown elements (bold, italic, links, etc.)
   */
  private parseInlineElements(text: string): MarkdownNode[] {
    const nodes: MarkdownNode[] = [];
    let remaining = text;
    let position = 0;

    while (position < remaining.length) {
      let matched = false;

      // Check for inline code
      const codeMatch = remaining.slice(position).match(/^`([^`]+)`/);
      if (codeMatch) {
        if (position > 0) {
          nodes.push({
            type: MarkdownElementType.TEXT,
            content: remaining.slice(0, position),
          });
        }
        nodes.push({
          type: MarkdownElementType.CODE_INLINE,
          content: codeMatch[1],
        });
        remaining = remaining.slice(position + codeMatch[0].length);
        position = 0;
        matched = true;
        continue;
      }

      // Check for bold
      const boldMatch = remaining.slice(position).match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        if (position > 0) {
          nodes.push({
            type: MarkdownElementType.TEXT,
            content: remaining.slice(0, position),
          });
        }
        nodes.push({
          type: MarkdownElementType.STRONG,
          children: this.parseInlineElements(boldMatch[1]),
        });
        remaining = remaining.slice(position + boldMatch[0].length);
        position = 0;
        matched = true;
        continue;
      }

      // Check for italic (underscore)
      const italicMatch = remaining.slice(position).match(/^_([^_]+)_/);
      if (italicMatch) {
        if (position > 0) {
          nodes.push({
            type: MarkdownElementType.TEXT,
            content: remaining.slice(0, position),
          });
        }
        nodes.push({
          type: MarkdownElementType.EMPHASIS,
          children: this.parseInlineElements(italicMatch[1]),
        });
        remaining = remaining.slice(position + italicMatch[0].length);
        position = 0;
        matched = true;
        continue;
      }

      // Check for italic (asterisk)
      const italicAsteriskMatch = remaining.slice(position).match(/^\*([^*]+)\*/);
      if (italicAsteriskMatch) {
        if (position > 0) {
          nodes.push({
            type: MarkdownElementType.TEXT,
            content: remaining.slice(0, position),
          });
        }
        nodes.push({
          type: MarkdownElementType.EMPHASIS,
          children: this.parseInlineElements(italicAsteriskMatch[1]),
        });
        remaining = remaining.slice(position + italicAsteriskMatch[0].length);
        position = 0;
        matched = true;
        continue;
      }

      // Check for strikethrough
      const strikeMatch = remaining.slice(position).match(/^~~([^~]+)~~/);
      if (strikeMatch) {
        if (position > 0) {
          nodes.push({
            type: MarkdownElementType.TEXT,
            content: remaining.slice(0, position),
          });
        }
        nodes.push({
          type: MarkdownElementType.STRIKETHROUGH,
          children: this.parseInlineElements(strikeMatch[1]),
        });
        remaining = remaining.slice(position + strikeMatch[0].length);
        position = 0;
        matched = true;
        continue;
      }

      // Check for links (allowing optional spaces between ] and ()
      const linkMatch = remaining.slice(position).match(/^\[([^\]]*)\]\s*\(([^)]+)\)/);
      if (linkMatch) {
        if (position > 0) {
          nodes.push({
            type: MarkdownElementType.TEXT,
            content: remaining.slice(0, position),
          });
        }
        // Use URL as text if link text is empty
        const linkText = linkMatch[1] || linkMatch[2];
        nodes.push({
          type: MarkdownElementType.LINK,
          content: linkText,
          attributes: { href: linkMatch[2] },
        });
        remaining = remaining.slice(position + linkMatch[0].length);
        position = 0;
        matched = true;
        continue;
      }

      // Check for auto-links (URLs in angle brackets)
      const autoLinkMatch = remaining.slice(position).match(/^<(https?:\/\/[^>]+)>/);
      if (autoLinkMatch) {
        if (position > 0) {
          nodes.push({
            type: MarkdownElementType.TEXT,
            content: remaining.slice(0, position),
          });
        }
        nodes.push({
          type: MarkdownElementType.LINK,
          content: autoLinkMatch[1],
          attributes: { href: autoLinkMatch[1] },
        });
        remaining = remaining.slice(position + autoLinkMatch[0].length);
        position = 0;
        matched = true;
        continue;
      }

      // Check for images
      const imageMatch = remaining.slice(position).match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (imageMatch) {
        if (position > 0) {
          nodes.push({
            type: MarkdownElementType.TEXT,
            content: remaining.slice(0, position),
          });
        }
        nodes.push({
          type: MarkdownElementType.IMAGE,
          content: imageMatch[1] || '',
          attributes: { src: imageMatch[2] },
        });
        remaining = remaining.slice(position + imageMatch[0].length);
        position = 0;
        matched = true;
        continue;
      }

      if (!matched) {
        position++;
      }
    }

    // Add any remaining text
    if (remaining.length > 0) {
      nodes.push({
        type: MarkdownElementType.TEXT,
        content: remaining,
      });
    }

    return nodes;
  }
}
