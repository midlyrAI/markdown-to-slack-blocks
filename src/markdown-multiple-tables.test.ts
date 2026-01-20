/**
 * Test for handling multiple tables in markdown
 */

import { describe, it, expect } from 'vitest';
import { markdownToSlackBlocks, markdownToSlackBlocksMultiple } from './markdown-converter';

describe('Multiple tables handling', () => {
  it('should keep single table in one array', () => {
    const markdown = `# Report

Some text here.

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |

More text after table.`;

    const blockArrays = markdownToSlackBlocksMultiple(markdown);

    // Should have only one array since there's only one table
    expect(blockArrays).toHaveLength(1);

    const blocks = blockArrays[0];

    // Should have: rich_text (header + text), table, rich_text (more text)
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks[0].type).toBe('rich_text');

    // Find the table
    const tableBlock = blocks.find(b => b.type === 'table');
    expect(tableBlock).toBeDefined();
  });

  it('should split multiple tables into separate arrays', () => {
    const markdown = `# First Section

First table:

| Col A | Col B |
|-------|-------|
| A1    | B1    |

Some text between tables.

# Second Section

Second table:

| Col C | Col D |
|-------|-------|
| C1    | D1    |

Text after second table.`;

    const blockArrays = markdownToSlackBlocksMultiple(markdown);

    // Should have two arrays, one for each table
    expect(blockArrays).toHaveLength(2);

    // First array should contain first table
    const firstArray = blockArrays[0];
    const firstTable = firstArray.find(b => b.type === 'table');
    expect(firstTable).toBeDefined();

    // Check that the first section header is in the first array's rich text
    const firstRichText = firstArray[0];
    expect(firstRichText.type).toBe('rich_text');
    const hasFirstSectionHeader = (firstRichText as any).elements.some(
      (el: any) =>
        el.type === 'rich_text_section' &&
        el.elements.some(
          (e: any) =>
            e.type === 'text' && e.text.includes('First Section') && e.style?.bold === true
        )
    );
    expect(hasFirstSectionHeader).toBe(true);

    // Second array should contain second table
    const secondArray = blockArrays[1];
    const secondTable = secondArray.find(b => b.type === 'table');
    expect(secondTable).toBeDefined();

    // Note: "Second Section" header is in the FIRST array because content before a table
    // stays with the preceding table's array. The second array contains only the second
    // table and content AFTER it.
    const hasTextAfterTable = secondArray.some(
      (block: any) =>
        block.type === 'rich_text' &&
        block.elements.some(
          (el: any) =>
            el.type === 'rich_text_section' &&
            el.elements.some(
              (e: any) => e.type === 'text' && e.text.includes('Text after second table')
            )
        )
    );
    expect(hasTextAfterTable).toBe(true);
  });

  it('should handle three tables', () => {
    const markdown = `| Table 1 |
|---------|
| Data 1  |

Middle content.

| Table 2 |
|---------|
| Data 2  |

More content.

| Table 3 |
|---------|
| Data 3  |`;

    const blockArrays = markdownToSlackBlocksMultiple(markdown);

    // Should have three arrays, one for each table
    expect(blockArrays).toHaveLength(3);

    // Each array should contain exactly one table
    blockArrays.forEach((blocks, index) => {
      const tables = blocks.filter(b => b.type === 'table');
      expect(tables).toHaveLength(1);

      // Verify table data
      const tableBlock = tables[0] as any;
      expect(tableBlock.rows[1][0].elements[0].elements[0].text).toBe(`Data ${index + 1}`);
    });
  });

  it('should preserve content after the last table', () => {
    const markdown = `# Document

| First Table |
|-------------|
| Data        |

Middle section with **bold** and *italic*.

| Second Table |
|--------------|
| More Data    |

## Final Section

This is the end with [a link](https://example.com).`;

    const blockArrays = markdownToSlackBlocksMultiple(markdown);

    expect(blockArrays).toHaveLength(2);

    // Second array should contain the second table and everything after it
    const secondArray = blockArrays[1];

    // Should have table, header, and rich text with link
    const table = secondArray.find(b => b.type === 'table');
    expect(table).toBeDefined();

    const hasFinalHeader = secondArray.some(
      (block: any) =>
        block.type === 'rich_text' &&
        block.elements.some(
          (el: any) =>
            el.type === 'rich_text_section' &&
            el.elements.some(
              (e: any) =>
                e.type === 'text' && e.text.includes('Final Section') && e.style?.bold === true
            )
        )
    );
    expect(hasFinalHeader).toBe(true);

    // Check for the final rich text with link
    const richTextBlocks = secondArray.filter(b => b.type === 'rich_text');
    expect(richTextBlocks.length).toBeGreaterThan(0);

    // Find the link in the rich text
    let linkFound = false;
    for (const block of richTextBlocks) {
      const elements = (block as any).elements;
      for (const element of elements) {
        if (element.type === 'rich_text_section' && element.elements) {
          const link = element.elements.find(
            (e: any) => e.type === 'link' && e.url === 'https://example.com'
          );
          if (link) {
            linkFound = true;
            break;
          }
        }
      }
    }
    expect(linkFound).toBe(true);
  });

  it('should handle markdown with no tables', () => {
    const markdown = `# Title

Just some regular text with **formatting**.

- List item 1
- List item 2`;

    const blockArrays = markdownToSlackBlocksMultiple(markdown);

    // Should have one array with all content
    expect(blockArrays).toHaveLength(1);
    expect(blockArrays[0].length).toBeGreaterThan(0);

    // Should not have any tables
    const tables = blockArrays[0].filter(b => b.type === 'table');
    expect(tables).toHaveLength(0);
  });

  it('should work the same as regular converter for single table', () => {
    const markdown = `# Test

| Col 1 | Col 2 |
|-------|-------|
| A     | B     |`;

    const singleBlocks = markdownToSlackBlocks(markdown);
    const multipleArrays = markdownToSlackBlocksMultiple(markdown);

    expect(multipleArrays).toHaveLength(1);
    expect(multipleArrays[0]).toEqual(singleBlocks);
  });
});
