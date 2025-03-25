# Module Prep Utility

This utility processes PDF files in a module directory to create an outline using an LLM.

## Features

- Extracts text and images from PDF files
- Sends the content to an LLM to generate a comprehensive module outline
- Saves the outline to a Markdown file in a 'prepared' subdirectory

## Prerequisites

- Node.js 16+
- OpenAI API key (for GPT-4 Vision) or Anthropic API key (for Claude 3)
- PDF files in a module directory

## Installation

The utility is part of the main project. Make sure you have installed all dependencies:

```bash
npm install
```

### Canvas Dependency

This utility uses the `canvas` package for image processing in Node.js. On some systems, you may need to install additional dependencies for the canvas package to work properly:

#### Ubuntu/Debian
```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

#### macOS
```bash
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

#### Windows
For Windows, you may need to install additional tools. See the [node-canvas documentation](https://github.com/Automattic/node-canvas#compiling) for details.

## Configuration

Create a `.env` file in the project root with your API keys:

```
# For OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o  # or another model that supports vision

# For Claude
ANTHROPIC_API_KEY=your_anthropic_api_key
CLAUDE_MODEL=claude-3-opus-20240229  # or another Claude 3 model

# Choose your provider
DM_THIS_CHAT_LLM=openai  # or claude
```

## Usage

### Command Line

```bash
# Process a module directory
npx ts-node src/utils/prep prepare --dir path/to/module/directory

# Example
npx ts-node src/utils/prep prepare --dir content/module/RedDemon
```

### Programmatic Usage

```typescript
import { processModuleDirectory } from './pdfProcessor';

async function main() {
  const modulePath = 'path/to/module/directory';
  await processModuleDirectory(modulePath);
}

main();
```

## Output

The utility creates a `prepared` subdirectory in the module directory and saves the outline as `module-outline.md`.

Example output structure:

```
content/
  module/
    RedDemon/
      Red Demon Locale - PDF.pdf
      prepared/
        module-outline.md
```

## How It Works

1. The utility scans the module directory for PDF files
2. It extracts text and images from each PDF
3. The content is sent to an LLM (OpenAI or Claude) with a prompt to create an outline
4. The generated outline is saved as a Markdown file

## Extending

To add support for additional LLM providers, update the following files:

1. `src/services/llm/types.ts` - Add new provider interfaces
2. `src/services/llm/factory.ts` - Add provider creation logic
3. Create a new provider implementation file (e.g., `src/services/llm/newprovider.ts`)
