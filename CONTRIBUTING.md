# Contributing to md-to-slack-blocks

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/midlyrAI/md-to-slack-blocks.git
   cd md-to-slack-blocks
   ```

2. Install dependencies:
   ```bash
   bun install
   # or npm install
   ```

3. Run tests:
   ```bash
   bun test
   # or npm test
   ```

## Project Structure

```
src/
├── index.ts                 # Main exports
├── markdown-converter.ts    # Public API functions
├── markdown-parser.ts       # Markdown to AST parser
├── markdown-block-builder.ts # AST to Slack blocks builder
├── markdown-types.ts        # TypeScript type definitions
└── *.test.ts               # Test files
```

## Making Changes

### Code Style

- Use TypeScript with strict mode
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Avoid `any` types where possible

### Testing

- Add tests for new features
- Ensure existing tests pass
- Test edge cases (empty strings, malformed markdown, etc.)

Run tests with:
```bash
bun test
```

### Commit Messages

Use clear, descriptive commit messages:
- `feat: add support for task lists`
- `fix: handle nested bold and italic`
- `docs: update API documentation`
- `test: add tests for table edge cases`

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run tests (`bun test`)
5. Run type checking (`bun run type-check`)
6. Commit your changes
7. Push to your fork
8. Create a Pull Request

### PR Guidelines

- Describe what the PR does and why
- Link any related issues
- Include test coverage for new features
- Update documentation if needed

## Reporting Issues

When reporting bugs, please include:
- Node.js/Bun version
- Package version
- Minimal reproduction code
- Expected vs actual behavior
- Any error messages

## Feature Requests

Feature requests are welcome! Please:
- Check existing issues first
- Describe the use case
- Provide examples of expected behavior

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
