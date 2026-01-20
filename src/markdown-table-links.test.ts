/**
 * Test for proper link parsing in table cells
 */

import { describe, it, expect } from 'vitest';
import { markdownToSlackBlocks } from './markdown-converter';

describe('Table cells with links', () => {
  it('should properly parse links in table cells', () => {
    const markdown = `| Project | Description |
|---------|-------------|
| [Project A](https://example.com/a) | A simple project |
| [Project B](https://example.com/b) | Another project |`;

    const blocks = markdownToSlackBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('table');

    const tableBlock = blocks[0] as any;

    // Check first data row, first cell (Project A link)
    const firstRowFirstCell = tableBlock.rows[1][0];
    expect(firstRowFirstCell.type).toBe('rich_text');

    const cellElements = firstRowFirstCell.elements[0].elements;

    // Should have a link element, not plain text
    expect(cellElements).toContainEqual(
      expect.objectContaining({
        type: 'link',
        url: 'https://example.com/a',
        text: 'Project A',
      })
    );
  });

  it('should handle mixed content in table cells', () => {
    const markdown = `| Column 1 | Column 2 |
|----------|----------|
| **Bold** text with [a link](https://example.com) | Normal and *italic* |`;

    const blocks = markdownToSlackBlocks(markdown);

    const tableBlock = blocks[0] as any;

    // Check first data row, first cell
    const firstCell = tableBlock.rows[1][0];
    const cellElements = firstCell.elements[0].elements;

    // Should have bold text
    expect(cellElements).toContainEqual(
      expect.objectContaining({
        type: 'text',
        text: 'Bold',
        style: expect.objectContaining({ bold: true }),
      })
    );

    // Should have a link
    expect(cellElements).toContainEqual(
      expect.objectContaining({
        type: 'link',
        url: 'https://example.com',
        text: 'a link',
      })
    );

    // Check second cell for italic
    const secondCell = tableBlock.rows[1][1];
    const secondCellElements = secondCell.elements[0].elements;

    expect(secondCellElements).toContainEqual(
      expect.objectContaining({
        type: 'text',
        text: 'italic',
        style: expect.objectContaining({ italic: true }),
      })
    );
  });

  it('should handle complex project table example', () => {
    const markdown = `| Project | Description | Status |
|---------|-------------|--------|
| [Website Redesign](https://example.com/projects/1) | Update landing page | In Progress |
| [API Integration](https://example.com/projects/2) | Connect to third-party services | Completed |`;

    const blocks = markdownToSlackBlocks(markdown);

    const tableBlock = blocks[0] as any;

    // Check that links are properly parsed in the first column
    const firstRowFirstCell = tableBlock.rows[1][0];
    const firstCellElements = firstRowFirstCell.elements[0].elements;

    expect(firstCellElements).toContainEqual(
      expect.objectContaining({
        type: 'link',
        url: 'https://example.com/projects/1',
        text: 'Website Redesign',
      })
    );

    const secondRowFirstCell = tableBlock.rows[2][0];
    const secondCellElements = secondRowFirstCell.elements[0].elements;

    expect(secondCellElements).toContainEqual(
      expect.objectContaining({
        type: 'link',
        url: 'https://example.com/projects/2',
        text: 'API Integration',
      })
    );
  });

  it('should handle links without custom text in tables', () => {
    const markdown = `| URL | Type |
|-----|------|
| <https://example.com> | Direct |
| [](https://example.org) | Empty text |`;

    const blocks = markdownToSlackBlocks(markdown);

    const tableBlock = blocks[0] as any;

    // First data row should have a plain URL
    const firstCell = tableBlock.rows[1][0];
    const firstCellElements = firstCell.elements[0].elements;

    // Auto-links or URLs without text should still be links
    expect(firstCellElements[0]).toMatchObject({
      type: 'link',
      url: 'https://example.com',
    });
  });
});
