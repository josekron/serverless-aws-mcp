# Test Setup

This directory contains the test files for the MCP Lambda service.

## Test Structure

- `unit/` - Unit tests for individual components
- `integration/` - Integration tests for full MCP protocol flows

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Test Files

### Unit Tests
- `webhook-processor.test.mjs` - Tests for the webhook processor handler

### Integration Tests
- `mcp-server.test.mjs` - Full MCP protocol integration tests

## Test Configuration

The tests are configured using:
- Jest for test runner
- Babel for ES module transformation
- TypeScript support for .ts files
- ES module support for .mjs files

## Writing New Tests

When writing new tests:

1. Use `.test.mjs` or `.test.ts` extensions
2. Place unit tests in `test/unit/`
3. Place integration tests in `test/integration/`
4. Use descriptive test names
5. Mock external dependencies appropriately
6. Test both success and error scenarios
