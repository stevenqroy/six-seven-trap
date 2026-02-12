# Six Seven Trap

Arcade-style browser game where you keep `6` and `7` bouncing and avoid traps.

## Prerequisites

- Node.js 20+ (includes `npm`)

## Setup

```bash
cd "/Users/steven/Documents/Six Seven"
npm install
```

## Development

```bash
npm run dev
```

Open the URL shown in terminal (usually `http://localhost:5173`).

## Build and Preview

```bash
npm run build
npm run preview
```

## Code Quality

```bash
npm run lint
npm run lint:fix
npm run format:check
npm run format
```

## Testing

```bash
# Install Playwright browser once
npm run test:e2e:install

# Unit + integration + e2e
npm run test:all

# Full validation (lint + tests + build)
npm run validate:all

# Mobile benchmark harness (S7R-010)
npm run benchmark:mobile
```

## Project Structure

```text
.
├── index.html
├── docs/
│   └── SIX_SEVEN_RANCH_IMPLEMENTATION_PLAN.md
├── src/
│   ├── main.js
│   └── styles.css
├── vite.config.js
├── eslint.config.js
└── package.json
```

## Planning

Detailed phased delivery plan and ticket backlog:

- `docs/SIX_SEVEN_RANCH_IMPLEMENTATION_PLAN.md`
