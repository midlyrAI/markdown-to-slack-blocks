/**
 * Tests for markdown to Slack blocks converter
 */

import { describe, it, expect } from 'vitest';
import {
  markdownToSlackBlocks,
  markdownToSlackBlocksWithMetadata,
  MarkdownConverter,
} from './markdown-converter';

describe('Markdown to Slack Blocks Converter', () => {
  describe('markdownToSlackBlocks', () => {
    it('should convert headers to bold rich text', () => {
      const markdown = '# Header 1\n## Header 2\n### Header 3';
      const blocks = markdownToSlackBlocks(markdown);

      expect(blocks).toHaveLength(1); // All in one rich_text block
      expect(blocks[0]).toMatchObject({
        type: 'rich_text',
      });

      const richTextBlock = blocks[0] as any;
      // Should contain bold text for headers
      const hasBoldHeader = richTextBlock.elements.some(
        (el: any) =>
          el.type === 'rich_text_section' &&
          el.elements.some(
            (e: any) => e.type === 'text' && e.text.includes('Header 1') && e.style?.bold === true
          )
      );
      expect(hasBoldHeader).toBe(true);
    });

    it('should convert paragraphs with inline formatting using rich_text', () => {
      // Note: Parser uses double tilde (~~) for strikethrough, not single (~)
      const markdown = 'This is **bold**, *italic*, ~~strikethrough~~, and `code`.';
      const blocks = markdownToSlackBlocks(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        type: 'rich_text',
        elements: expect.arrayContaining([
          expect.objectContaining({
            type: 'rich_text_section',
            elements: expect.arrayContaining([
              expect.objectContaining({ type: 'text', text: 'This is ' }),
              expect.objectContaining({
                type: 'text',
                text: 'bold',
                style: expect.objectContaining({ bold: true }),
              }),
              expect.objectContaining({ type: 'text', text: ', ' }),
              expect.objectContaining({
                type: 'text',
                text: 'italic',
                style: expect.objectContaining({ italic: true }),
              }),
              expect.objectContaining({ type: 'text', text: ', ' }),
              expect.objectContaining({
                type: 'text',
                text: 'strikethrough',
                style: expect.objectContaining({ strike: true }),
              }),
              expect.objectContaining({ type: 'text', text: ', and ' }),
              expect.objectContaining({
                type: 'text',
                text: 'code',
                style: expect.objectContaining({ code: true }),
              }),
              expect.objectContaining({ type: 'text', text: '.' }),
            ]),
          }),
        ]),
      });
    });

    it('should convert links correctly using rich_text', () => {
      const markdown = 'Check out [this link](https://example.com) for more info.';
      const blocks = markdownToSlackBlocks(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        type: 'rich_text',
        elements: expect.arrayContaining([
          expect.objectContaining({
            type: 'rich_text_section',
            elements: expect.arrayContaining([
              expect.objectContaining({ type: 'text', text: 'Check out ' }),
              expect.objectContaining({
                type: 'link',
                url: 'https://example.com',
                text: 'this link',
              }),
              expect.objectContaining({ type: 'text', text: ' for more info.' }),
            ]),
          }),
        ]),
      });
    });

    it('should convert unordered lists', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const blocks = markdownToSlackBlocks(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        type: 'rich_text',
      });
    });

    it('should convert ordered lists', () => {
      const markdown = '1. First item\n2. Second item\n3. Third item';
      const blocks = markdownToSlackBlocks(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        type: 'rich_text',
      });
    });

    it('should convert code blocks', () => {
      const markdown = '```javascript\nconst x = 42;\nconsole.log(x);\n```';
      const blocks = markdownToSlackBlocks(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        type: 'rich_text',
      });
    });

    it('should convert blockquotes', () => {
      const markdown = '> This is a quote\n> with multiple lines';
      const blocks = markdownToSlackBlocks(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        type: 'rich_text',
      });
    });

    it('should convert horizontal rules', () => {
      const markdown = 'Above\n\n---\n\nBelow';
      const blocks = markdownToSlackBlocks(markdown);

      expect(blocks).toHaveLength(3);
      expect(blocks[1]).toMatchObject({
        type: 'divider',
      });
    });

    it('should convert tables with rich_text cells and column_settings', () => {
      const markdown = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
      const blocks = markdownToSlackBlocks(markdown);

      expect(blocks).toHaveLength(1);

      const tableBlock = blocks[0] as any;
      expect(tableBlock.type).toBe('table');

      // Check that column_settings are present with text wrapping
      expect(tableBlock.column_settings).toBeDefined();
      expect(tableBlock.column_settings).toHaveLength(2);
      expect(tableBlock.column_settings[0]).toMatchObject({ is_wrapped: true });
      expect(tableBlock.column_settings[1]).toMatchObject({ is_wrapped: true });

      // Check that cells use rich_text format
      expect(tableBlock.rows).toBeDefined();
      expect(tableBlock.rows[0][0]).toMatchObject({
        type: 'rich_text',
        elements: expect.arrayContaining([
          expect.objectContaining({
            type: 'rich_text_section',
            elements: expect.arrayContaining([
              expect.objectContaining({
                type: 'text',
                text: 'Header 1',
              }),
            ]),
          }),
        ]),
      });
    });

    it('should convert tables with markdown formatting in cells', () => {
      const markdown =
        '| **Bold** | *Italic* |\n|----------|----------|\n| `code`   | [link](https://example.com) |';
      const blocks = markdownToSlackBlocks(markdown);

      expect(blocks).toHaveLength(1);

      const tableBlock = blocks[0] as any;
      expect(tableBlock.type).toBe('table');

      // Check that markdown formatting is preserved in rich_text cells
      const firstRowFirstCell = tableBlock.rows[0][0];
      expect(firstRowFirstCell.type).toBe('rich_text');

      // The bold text should have bold styling
      const firstCellElements = firstRowFirstCell.elements[0].elements;
      expect(firstCellElements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: 'Bold',
            style: expect.objectContaining({ bold: true }),
          }),
        ])
      );
    });

    it('should handle complex mixed content', () => {
      const markdown = `# Project Update

This is a **bold** announcement about our new features:

- User authentication
- Real-time updates
- Mobile app (coming soon)

> **Note**: This is still in beta, so please report any issues!

## Code Example

\`\`\`python
def hello():
    return "world"
\`\`\`

---

For more information, visit [our website](https://example.com).`;

      const blocks = markdownToSlackBlocks(markdown);

      // Should have multiple blocks for different elements
      expect(blocks.length).toBeGreaterThan(1);

      // Should contain rich text blocks
      expect(blocks.some(b => b.type === 'rich_text')).toBe(true);

      // Should contain a divider
      expect(blocks.some(b => b.type === 'divider')).toBe(true);

      // Should contain rich text blocks for lists and quotes
      expect(blocks.some(b => b.type === 'rich_text')).toBe(true);
    });

    it('should handle long headers as bold text', () => {
      const longText = 'A'.repeat(200);
      const markdown = `# ${longText}`;
      const blocks = markdownToSlackBlocks(markdown);

      expect(blocks[0]).toMatchObject({
        type: 'rich_text',
      });

      const richTextBlock = blocks[0] as any;
      const section = richTextBlock.elements.find((el: any) => el.type === 'rich_text_section');

      // Should have bold text with the long content
      const boldText = section.elements.find(
        (el: any) => el.type === 'text' && el.style?.bold === true
      );
      expect(boldText).toBeDefined();
      // Rich text doesn't have the same truncation limits as header blocks
      expect(boldText.text.length).toBe(200);
    });

    it('should handle long sections in rich_text', () => {
      const longText = 'A'.repeat(3100);
      const markdown = longText;
      const blocks = markdownToSlackBlocks(markdown);

      // Should create a rich_text block with the content
      expect(blocks[0]).toMatchObject({
        type: 'rich_text',
      });

      // Content should be present in rich_text_section
      const richTextBlock = blocks[0] as any;
      const section = richTextBlock.elements.find((el: any) => el.type === 'rich_text_section');
      expect(section).toBeDefined();
      expect(section.elements[0].text.length).toBeGreaterThan(0);
    });
  });

  describe('markdownToSlackBlocksWithMetadata', () => {
    it('should return blocks with no warnings for simple content', () => {
      const markdown = '# Hello\n\nWorld';
      const result = markdownToSlackBlocksWithMetadata(markdown);

      // Headers and paragraphs are now combined into rich_text blocks
      expect(result.blocks).toHaveLength(1);
      expect(result.warnings).toBeUndefined();
    });

    it('should warn about excessive block count', () => {
      // Create markdown with tables and dividers to generate many blocks
      const lines = [];
      for (let i = 0; i < 60; i++) {
        lines.push(`| Col${i} |\n|------|\n| Data |`);
        lines.push('---'); // Divider creates separate block
      }
      const markdown = lines.join('\n\n');

      const result = markdownToSlackBlocksWithMetadata(markdown);

      // With many tables and dividers, we should get warnings
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some(w => w.includes('Table blocks'))).toBe(true);
    });

    it('should warn about table blocks', () => {
      const markdown = '| Col1 | Col2 |\n|------|------|\n| A    | B    |';
      const result = markdownToSlackBlocksWithMetadata(markdown);

      expect(result.warnings).toBeDefined();
      expect(
        result.warnings!.some(w => w.includes('Table blocks are custom implementations'))
      ).toBe(true);
    });
  });

  describe('MarkdownConverter class', () => {
    it('should persist options across conversions', () => {
      const converter = new MarkdownConverter({
        expandSections: false,
      });

      const blocks1 = converter.convert('# A very long header');
      const blocks2 = converter.convert('# Another long header');

      // Both should produce rich_text blocks with header content
      expect(blocks1[0].type).toBe('rich_text');
      expect(blocks2[0].type).toBe('rich_text');

      // Headers should be present as bold text in rich_text_section
      const richText1 = blocks1[0] as any;
      const richText2 = blocks2[0] as any;
      expect(richText1.elements[0].type).toBe('rich_text_section');
      expect(richText2.elements[0].type).toBe('rich_text_section');
    });

    it('should allow updating options', () => {
      const converter = new MarkdownConverter();

      const blocks1 = converter.convert('# ' + 'A'.repeat(60));
      expect(blocks1[0].type).toBe('rich_text');

      converter.setOptions({ expandSections: false });

      const blocks2 = converter.convert('# ' + 'B'.repeat(60));
      expect(blocks2[0].type).toBe('rich_text');

      // Verify options object was updated
      expect(converter.getOptions().expandSections).toBe(false);
    });

    it('should provide JSON output', () => {
      const converter = new MarkdownConverter();
      const markdown = '# Test\n\nContent';

      const json = converter.convertToJson(markdown);

      // Should be serializable
      expect(() => JSON.stringify(json)).not.toThrow();

      // Should have rich_text block containing both header and content
      expect(json).toHaveLength(1);
      expect(json[0]).toHaveProperty('type', 'rich_text');
    });
  });
});

// Example usage documentation
describe('Usage Examples', () => {
  it('should handle a typical Slack message', () => {
    const markdown = `
# Daily Standup

**Team Updates:**

- Frontend: Completed user authentication flow
- Backend: API endpoints ready for testing
- QA: Test suite updated with new scenarios

> Remember to update your JIRA tickets!

\`\`\`bash
npm run test
\`\`\`

---

_Posted by @bot at 10:00 AM_
`;

    const blocks = markdownToSlackBlocks(markdown);

    // Verify the conversion produced valid blocks
    expect(blocks).toBeDefined();
    expect(blocks.length).toBeGreaterThan(0);

    // Each block should have a type
    blocks.forEach(block => {
      expect(block).toHaveProperty('type');
    });
  });

  it('should handle GitHub-style markdown', () => {
    const markdown = `
## Issue #123: Bug Fix

**Description:**
Fixed the issue with user login

**Changes:**
- Updated authentication logic
- Added error handling
- Improved logging

**Testing:**
- [x] Unit tests pass
- [x] Integration tests pass
- [ ] Manual testing (in progress)

**Related PRs:**
- #120
- #121

/cc @team-lead
`;

    const blocks = markdownToSlackBlocks(markdown);

    expect(blocks).toBeDefined();
    expect(blocks.length).toBeGreaterThan(0);
  });
});
