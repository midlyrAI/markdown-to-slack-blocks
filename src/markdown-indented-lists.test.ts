/**
 * Test for handling indented list items
 */

import { describe, it, expect } from 'vitest';
import { markdownToSlackBlocks } from './markdown-converter';

describe('Indented list items', () => {
  it('should append indented unordered items to preceding ordered items', () => {
    const markdown = `1. First item
   - Sub item A
   - Sub item B
2. Second item
   - Sub item C`;

    const blocks = markdownToSlackBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('rich_text');

    const richTextBlock = blocks[0] as any;
    const listElement = richTextBlock.elements.find((el: any) => el.type === 'rich_text_list');

    expect(listElement).toBeDefined();
    expect(listElement.style).toBe('ordered');
    expect(listElement.elements).toHaveLength(2);

    // First item should contain sub-items
    const firstItem = listElement.elements[0];
    const firstItemText = firstItem.elements.map((el: any) => el.text).join('');
    expect(firstItemText).toContain('First item');
    expect(firstItemText).toContain('\n- Sub item A');
    expect(firstItemText).toContain('\n- Sub item B');

    // Second item should contain its sub-item
    const secondItem = listElement.elements[1];
    const secondItemText = secondItem.elements.map((el: any) => el.text).join('');
    expect(secondItemText).toContain('Second item');
    expect(secondItemText).toContain('\n- Sub item C');
  });

  it('should append indented ordered items to preceding unordered items', () => {
    const markdown = `- Main point
   1. First sub-point
   2. Second sub-point
- Another main point
   1. Another sub-point`;

    const blocks = markdownToSlackBlocks(markdown);

    const richTextBlock = blocks[0] as any;
    const listElement = richTextBlock.elements.find((el: any) => el.type === 'rich_text_list');

    expect(listElement).toBeDefined();
    expect(listElement.style).toBe('bullet');
    expect(listElement.elements).toHaveLength(2);

    // First item should contain numbered sub-items
    // Note: Parser preserves the number without adding dot separator
    const firstItem = listElement.elements[0];
    const firstItemText = firstItem.elements.map((el: any) => el.text).join('');
    expect(firstItemText).toContain('Main point');
    expect(firstItemText).toContain('\n1 First sub-point');
    expect(firstItemText).toContain('\n2 Second sub-point');
  });

  it('should handle ordered list with indented ordered items', () => {
    const markdown = `1. Chapter 1
   1. Section 1.1
   2. Section 1.2
2. Chapter 2
   1. Section 2.1`;

    const blocks = markdownToSlackBlocks(markdown);

    const richTextBlock = blocks[0] as any;
    const listElement = richTextBlock.elements.find((el: any) => el.type === 'rich_text_list');

    expect(listElement).toBeDefined();
    expect(listElement.style).toBe('ordered');

    // Note: Parser preserves the number without adding dot separator
    const firstItem = listElement.elements[0];
    const firstItemText = firstItem.elements.map((el: any) => el.text).join('');
    expect(firstItemText).toContain('Chapter 1');
    expect(firstItemText).toContain('\n1 Section 1.1');
    expect(firstItemText).toContain('\n2 Section 1.2');
  });

  it('should handle unordered list with indented unordered items', () => {
    const markdown = `- Main item
   - Sub item 1
   - Sub item 2
- Another main item
   - Another sub item`;

    const blocks = markdownToSlackBlocks(markdown);

    const richTextBlock = blocks[0] as any;
    const listElement = richTextBlock.elements.find((el: any) => el.type === 'rich_text_list');

    expect(listElement).toBeDefined();
    expect(listElement.style).toBe('bullet');

    const firstItem = listElement.elements[0];
    const firstItemText = firstItem.elements.map((el: any) => el.text).join('');
    expect(firstItemText).toContain('Main item');
    expect(firstItemText).toContain('\n- Sub item 1');
    expect(firstItemText).toContain('\n- Sub item 2');
  });

  it('should handle mixed indentation with formatting', () => {
    const markdown = `1. **Project Alpha**
   - Status: In Progress
   - Team: Frontend
2. **Project Beta**
   - Status: Complete
   - Team: Backend`;

    const blocks = markdownToSlackBlocks(markdown);

    const richTextBlock = blocks[0] as any;
    const listElement = richTextBlock.elements.find((el: any) => el.type === 'rich_text_list');

    expect(listElement).toBeDefined();
    expect(listElement.style).toBe('ordered');

    // Check that bold formatting is preserved
    const firstItem = listElement.elements[0];
    const hasBoldProject = firstItem.elements.some(
      (el: any) => el.type === 'text' && el.text === 'Project Alpha' && el.style?.bold === true
    );
    expect(hasBoldProject).toBe(true);

    // Check that sub-items are included
    const firstItemText = firstItem.elements.map((el: any) => el.text).join('');
    expect(firstItemText).toContain('\n- Status: In Progress');
    expect(firstItemText).toContain('\n- Team: Frontend');
  });

  it('should handle continuation text after indented items', () => {
    const markdown = `1. Main item
   - Sub item
   This is continuation text
2. Second item`;

    const blocks = markdownToSlackBlocks(markdown);

    const richTextBlock = blocks[0] as any;
    const listElement = richTextBlock.elements.find((el: any) => el.type === 'rich_text_list');

    const firstItem = listElement.elements[0];
    const firstItemText = firstItem.elements.map((el: any) => el.text).join('');
    expect(firstItemText).toContain('Main item');
    expect(firstItemText).toContain('\n- Sub item');
    expect(firstItemText).toContain('\nThis is continuation text');
  });

  it('should handle the real-world example format', () => {
    const markdown = `1. **[Collections After-Hours](http://example.com/1)**
   - Multiple customer complaints
   - Potential regulatory impact
2. **[Zendesk Collections](http://example.com/2)**
   - Similar after-hours issue
   - Via Zendesk dialer`;

    const blocks = markdownToSlackBlocks(markdown);

    const richTextBlock = blocks[0] as any;
    const listElement = richTextBlock.elements.find((el: any) => el.type === 'rich_text_list');

    expect(listElement).toBeDefined();
    expect(listElement.style).toBe('ordered');
    expect(listElement.elements).toHaveLength(2);

    // Check first item has link and sub-items
    const firstItem = listElement.elements[0];
    const hasLink = firstItem.elements.some(
      (el: any) => el.type === 'link' && el.url === 'http://example.com/1'
    );
    expect(hasLink).toBe(true);

    const firstItemText = firstItem.elements.map((el: any) => el.text || '').join('');
    expect(firstItemText).toContain('\n- Multiple customer complaints');
    expect(firstItemText).toContain('\n- Potential regulatory impact');
  });

  it('should handle deeply nested structures with tabs', () => {
    const markdown = `1. Level 1
	- Level 2 with tab
	- Another Level 2
2. Another Level 1
	- Its Level 2`;

    const blocks = markdownToSlackBlocks(markdown);

    const richTextBlock = blocks[0] as any;
    const listElement = richTextBlock.elements.find((el: any) => el.type === 'rich_text_list');

    expect(listElement).toBeDefined();
    expect(listElement.style).toBe('ordered');

    const firstItem = listElement.elements[0];
    const firstItemText = firstItem.elements.map((el: any) => el.text).join('');
    expect(firstItemText).toContain('Level 1');
    expect(firstItemText).toContain('\n- Level 2 with tab');
    expect(firstItemText).toContain('\n- Another Level 2');
  });
});
