# Usage

## Local web UI

Start the minimal local product UI:

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

The UI lets you:

1. choose provider and set API key,
2. enter project/app metadata,
3. upload raw screenshots,
4. choose one standard visual reference for the AI to adapt,
5. generate screenshots,
6. preview one PNG per uploaded screenshot, optionally plus one cover,
7. inspect quality report / VisualSystem / Storyboard,
8. download the ZIP export.

Use `Fixture — no API key` first to verify the flow locally.

## Quick CLI functional test

Run the product pipeline with the deterministic fixture provider:

```bash
npm install
npm run generate -- \
  --input examples/literarytrip/input/metadata.json \
  --project literarytrip-test \
  --output examples/literarytrip-test/output
```

Expected output:

```txt
examples/literarytrip-test/output/
  input-readiness.json
  patterns.json
  visual-system.json
  storyboard.json
  quality-report.json
  export-manifest.json
  screenshots/
    01-hook.png
    02-search.png
    03-value.png
    04-map.png
    05-save.png
  literarytrip-test-store-pack.zip

.local/projects/literarytrip-test/
  input/metadata.json
  pipeline/*.json
  renders/*.png
  exports/literarytrip-test-store-pack.zip
```

This is the current end-to-end product path:

```txt
metadata + source screenshots
  -> input readiness
  -> pattern retrieval
  -> provider-generated VisualSystem
  -> provider-generated Storyboard
  -> source screenshots loaded from disk
  -> deterministic render
  -> quality evaluation
  -> ZIP export
  -> local project persistence
```

## Input file format

Minimum input:

```json
{
  "appName": "LiteraryTrip",
  "category": "travel",
  "targetAudience": "readers who travel",
  "mainValueProposition": "turn books into walkable routes",
  "targetStores": ["app-store"],
  "baseLocale": "en-US",
  "screenshots": [
    {
      "id": "home",
      "path": "examples/literarytrip/input/screenshots/home.png",
      "kind": "functional"
    },
    {
      "id": "search",
      "path": "examples/literarytrip/input/screenshots/search.png",
      "kind": "functional"
    },
    {
      "id": "map",
      "path": "examples/literarytrip/input/screenshots/map.png",
      "kind": "functional"
    }
  ]
}
```

Readiness rules:

- minimum 3 screenshots,
- at least 2 functional screenshots,
- no more than 1 splash/logo screenshot.

## Providers

Default provider is fixture:

```bash
MODEL_PROVIDER=fixture npm run generate -- --input examples/literarytrip/input/metadata.json
```

Gemini:

```bash
MODEL_PROVIDER=gemini \
GEMINI_API_KEY=your_key \
MODEL_NAME=gemini-2.5-flash \
npm run generate -- --input examples/literarytrip/input/metadata.json --project literarytrip-gemini
```

OpenAI:

```bash
MODEL_PROVIDER=openai \
OPENAI_API_KEY=your_key \
MODEL_NAME=gpt-4.1 \
OPENAI_IMAGE_MODEL=gpt-image-1 \
npm run generate -- --input examples/literarytrip/input/metadata.json --project literarytrip-openai --style-reference sc-1
```

Available standard visual references:

- `sc-1`
- `sc-2`
- `sc-3`
- `sc-4`

## Quality gates

The product blocks before model calls when input readiness fails.

The product evaluates after render and writes:

```txt
quality-report.json
```

Current checks:

- App Store iPhone 6.9 dimensions must be `1320x2868`,
- screenshot headlines should be 8 words or fewer.

## Developer checks

Run everything:

```bash
npm test
npm run build
```
