# md-to-slack-blocks

Convert Markdown to Slack Block Kit blocks with full formatting support.

[![npm version](https://badge.fury.io/js/md-to-slack-blocks.svg)](https://www.npmjs.com/package/md-to-slack-blocks)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Full Markdown Support**: Headers, lists, tables, code blocks, blockquotes, and inline formatting
- **Rich Text Output**: Uses Slack's `rich_text` blocks for optimal formatting
- **Table Support**: Converts Markdown tables to Slack's table blocks with rich text cells
- **Multiple Tables**: Handles Slack's 1-table-per-message limit by splitting into multiple block arrays
- **TypeScript**: Full type definitions included
- **Zero Dependencies**: Only peer dependency is `@slack/types` for type definitions

## Installation

```bash
npm install md-to-slack-blocks
# or
yarn add md-to-slack-blocks
# or
pnpm add md-to-slack-blocks
# or
bun add md-to-slack-blocks
```

## Quick Start

```typescript
import { markdownToSlackBlocks } from 'md-to-slack-blocks';

const markdown = `
# Project Update

This is a **bold** announcement about our new features:

- User authentication
- Real-time updates
- Mobile app (coming soon)

> **Note**: This is still in beta!
`;

const blocks = markdownToSlackBlocks(markdown);

// Use with Slack SDK
await client.chat.postMessage({
  channel: '#general',
  blocks: blocks,
  text: 'Project Update', // Fallback text
});
```

## API Reference

### `markdownToSlackBlocks(markdown, options?)`

Converts a Markdown string to an array of Slack blocks.

```typescript
import { markdownToSlackBlocks } from 'md-to-slack-blocks';

const blocks = markdownToSlackBlocks('# Hello **World**');
```

**Parameters:**
- `markdown` (string): The Markdown text to convert
- `options` (MarkdownConverterOptions, optional): Conversion options

**Returns:** `SlackBlock[]` - Array of Slack blocks ready to use with the Slack API

### `markdownToSlackBlocksMultiple(markdown, options?)`

Converts Markdown to multiple block arrays, splitting when multiple tables are present. This is necessary because Slack only allows one table per message.

```typescript
import { markdownToSlackBlocksMultiple } from 'md-to-slack-blocks';

const markdown = `
# Report

| Table 1 | Col |
|---------|-----|
| Data    | A   |

| Table 2 | Col |
|---------|-----|
| Data    | B   |
`;

const blockArrays = markdownToSlackBlocksMultiple(markdown);

// Send as multiple messages
for (const blocks of blockArrays) {
  await client.chat.postMessage({
    channel: '#general',
    blocks: blocks,
  });
}
```

### `markdownToSlackBlocksWithMetadata(markdown, options?)`

Converts Markdown and returns metadata including any conversion warnings.

```typescript
import { markdownToSlackBlocksWithMetadata } from 'md-to-slack-blocks';

const result = markdownToSlackBlocksWithMetadata(markdown);

if (result.warnings?.length) {
  console.warn('Conversion warnings:', result.warnings);
}

// Use result.blocks
```

### `markdownToSlackBlocksJson(markdown, options?)`

Converts Markdown to plain JSON objects (useful for serialization).

```typescript
import { markdownToSlackBlocksJson } from 'md-to-slack-blocks';

const blocksJson = markdownToSlackBlocksJson(markdown);
const jsonString = JSON.stringify(blocksJson);
```

### `MarkdownConverter` Class

A class wrapper for persistent options across multiple conversions.

```typescript
import { MarkdownConverter } from 'md-to-slack-blocks';

const converter = new MarkdownConverter({
  maxHeaderLength: 100,
  maxTableRows: 50,
});

const blocks1 = converter.convert('# Title 1');
const blocks2 = converter.convert('# Title 2');

// Update options
converter.setOptions({ maxTableColumns: 10 });
```

### Options

```typescript
interface MarkdownConverterOptions {
  // Whether to expand all section blocks by default (default: true)
  expandSections?: boolean;

  // Maximum header text length - Slack limit is 150 (default: 150)
  maxHeaderLength?: number;

  // Maximum section text length - Slack limit is 3000 (default: 3000)
  maxSectionLength?: number;

  // Maximum table rows - Slack limit is 100 (default: 100)
  maxTableRows?: number;

  // Maximum table columns - Slack limit is 20 (default: 20)
  maxTableColumns?: number;
}
```

## Supported Markdown

### Block Elements

| Markdown | Slack Block |
|----------|-------------|
| `# Heading` | Bold text in `rich_text_section` |
| `## Heading 2` | Bold text in `rich_text_section` |
| Paragraphs | `rich_text_section` |
| `- List item` | `rich_text_list` (bullet) |
| `1. Numbered` | `rich_text_list` (ordered) |
| ` ```code``` ` | `rich_text_preformatted` |
| `> Blockquote` | `rich_text_quote` |
| `---` | `divider` |
| Tables | `table` with `rich_text` cells |

### Inline Elements

| Markdown | Rendered As |
|----------|-------------|
| `**bold**` | Bold text |
| `*italic*` or `_italic_` | Italic text |
| `~~strikethrough~~` | Strikethrough text |
| `` `code` `` | Inline code |
| `[link](url)` | Clickable link |
| `![alt](url)` | Link to image |

### Tables with Formatting

Tables support full Markdown formatting within cells:

```markdown
| Feature | Status | Notes |
|---------|--------|-------|
| **Auth** | `done` | _Shipped in v1.0_ |
| [Docs](url) | `pending` | See **roadmap** |
```

## Advanced Usage

### Low-Level API

For advanced use cases, you can access the parser and builder directly:

```typescript
import { MarkdownParser, SlackBlockBuilder } from 'md-to-slack-blocks';

const parser = new MarkdownParser(markdown);
const ast = parser.parse();

// Inspect or modify the AST
console.log(ast);

const builder = new SlackBlockBuilder({ maxTableRows: 50 });
const blocks = builder.buildBlocks(ast);
```

### AST Types

```typescript
import type { MarkdownNode, MarkdownElementType } from 'md-to-slack-blocks';

// The AST node structure
interface MarkdownNode {
  type: MarkdownElementType;
  content?: string;
  children?: MarkdownNode[];
  attributes?: Record<string, any>;
}
```

## Slack API Limits

This library respects Slack's API limits:

- **50 blocks** per message (warning issued if exceeded)
- **1 table** per message (use `markdownToSlackBlocksMultiple` for multiple tables)
- **100 rows** per table
- **20 columns** per table
- **150 characters** for header text
- **3000 characters** per section

## Examples

### Daily Standup Bot

```typescript
const markdown = `
# Daily Standup - ${new Date().toLocaleDateString()}

**Completed:**
- Finished user authentication
- Fixed bug #123

**In Progress:**
- Working on API endpoints

**Blockers:**
> Waiting for design review

---
_Posted automatically_
`;

const blocks = markdownToSlackBlocks(markdown);
```

### PR Notification

```typescript
const markdown = `
## Pull Request #${prNumber}

**${prTitle}**

${prDescription}

| Stat | Value |
|------|-------|
| Files changed | ${filesChanged} |
| Additions | +${additions} |
| Deletions | -${deletions} |

[View PR](${prUrl})
`;

const blocks = markdownToSlackBlocks(markdown);
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](LICENSE) for details.

## Credits

Built with love by [Midlyr](https://midlyr.com).
