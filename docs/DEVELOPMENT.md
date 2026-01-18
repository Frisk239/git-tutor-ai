# Git Tutor AI - Development Guide

## Prerequisites

- Node.js >= 20
- PNPM >= 9.15.0
- Git
- PostgreSQL (for local development)

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. Initialize database:
   ```bash
   cd packages/db
   pnpm prisma migrate dev
   ```

## Development Commands

### Build all packages
```bash
pnpm build
```

### Watch mode (development)
```bash
pnpm dev
```

### Run tests
```bash
# All tests
pnpm test

# Unit tests
pnpm test:unit

# E2E tests
pnpm test:e2e

# Comprehensive tool tests
node tests/comprehensive/test-all-25-tools.js
```

### Code quality
```bash
# Lint
pnpm lint

# Format
pnpm format

# Type check
pnpm typecheck
```

## Project Structure

```
git-tutor-ai/
├── apps/
│   ├── web/           # Web application (Phase 1+)
│   └── desktop/       # Desktop application (Future)
├── packages/
│   ├── core/          # Core business logic
│   ├── db/            # Database (Prisma)
│   ├── shared/        # Shared types
│   └── api/           # API definitions
├── services/
│   └── api/           # API server (Phase 1+)
└── tests/             # Test suites
```

## Troubleshooting

### TypeScript build errors
- Ensure `moduleResolution` is set to `NodeNext` in `tsconfig.base.json`
- Run `pnpm clean && pnpm build`

### Test failures
- Check `.env` is configured correctly
- Ensure API keys are valid
- Run `node tests/run-all-tests.js` for detailed output

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.
