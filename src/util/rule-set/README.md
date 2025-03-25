# PDF RAG Utility

This utility processes PDF files in a directory for Retrieval-Augmented Generation (RAG). It extracts text from PDFs, splits it into chunks, creates embeddings using OpenAI, stores them in a single persistent vector store, and provides a way to query the processed data using an LLM (OpenAI by default, with support for Claude).

## Features

- Extract text from PDF files
- Split text into chunks with configurable size and overlap
- Create embeddings for each chunk using OpenAI's embedding model
- Store embeddings in a persistent HNSWLib vector store
- Save processed data to disk
- Query the processed data using RAG with Claude LLM

## Prerequisites

- Node.js (v14 or later)
- OpenAI API key (for embeddings and LLM)
- Anthropic API key (optional, for Claude LLM)

## Installation

1. Install the required dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env` file in the project root with the following variables:

```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key  # Optional, only needed if using Claude
```

## Usage

### Process PDFs in a directory

```bash
npx ts-node src/utils/rag/processPdfCli.ts process -d path/to/your/pdf/directory
```

Options:
- `-d, --dir <path>`: Path to the directory containing PDF files (required)
- `-c, --chunk-size <size>`: Size of each chunk (default: 1000)
- `-v, --chunk-overlap <overlap>`: Overlap between chunks (default: 200)
- `-k, --api-key <key>`: API key for embeddings (or set OPENAI_API_KEY env var)

### Query the processed data

```bash
npx ts-node src/utils/rag/processPdfCli.ts query -d path/to/your/pdf/directory -q "Your query here"
```

Options:
- `-d, --dir <path>`: Path to the directory containing PDF files (required)
- `-q, --query <text>`: Query text (required)
- `-k, --api-key <key>`: API key for LLM (or set OPENAI_API_KEY env var)
- `-e, --embeddings-key <key>`: API key for embeddings (or set OPENAI_API_KEY env var)
- `-r, --results <count>`: Maximum number of results to return (default: 5)

### View context for a query

```bash
npx ts-node src/utils/rag/processPdfCli.ts recall -d path/to/your/pdf/directory -q "Your query here"
```

Options:
- `-d, --dir <path>`: Path to the directory containing PDF files (required)
- `-q, --query <text>`: Query text (required)
- `-k, --api-key <key>`: API key for embeddings (or set OPENAI_API_KEY env var)
- `-r, --results <count>`: Maximum number of results to return (default: 5)

## Examples

### Using the CLI

Process all PDFs in the D&D 3.5 SRD directory:

```bash
npm run pdf-rag process -d content/rules/SRD3_5 -c 1000 -v 200
```

Query the processed data:

```bash
npm run pdf-rag query -d content/rules/SRD3_5 -q "What are the rules for grappling?"
```

View context for a query:

```bash
npm run pdf-rag recall -d content/rules/SRD3_5 -q "What are the rules for grappling?"
```

### Using the Example Script

We've included an example script that demonstrates how to use the utility programmatically:

```bash
npm run pdf-rag:example
```

This script:
1. Processes the D&D 3.5 SRD PDF
2. Creates chunks and embeddings
3. Saves the processed data to disk
4. Queries the vector store with a sample question
5. Loads the processed data from disk
6. Queries the loaded data with another sample question

## How it Works

1. **PDF Processing**:
   - All PDF files in the specified directory are processed
   - Each PDF is loaded and text is extracted from each page
   - The text is split into chunks using a recursive character text splitter
   - Each chunk is stored with metadata (page number, file name, chunk index)
   - Embeddings are created for all chunks using OpenAI's embedding model
   - All chunks and embeddings are stored in a single persistent HNSWLib vector store
   - The vector store is saved to a 'hnsw' subdirectory within the input directory

2. **Querying**:
   - The vector store is loaded from the 'hnsw' subdirectory
   - The query is embedded using OpenAI's embedding model and used to find the most relevant chunks
   - The relevant chunks are formatted and sent to the LLM (OpenAI by default) as context
   - The LLM generates a response based on the query and context

## Advanced Usage

### Programmatic Usage

You can also use the utility programmatically in your own code:

```typescript
import { processDirectory, loadVectorStoreFromDirectory, queryWithRAG } from './pdfProcessor';

// Process all PDFs in a directory
const { chunks, vectorStore } = await processDirectory(
  'path/to/pdf/directory',
  'your_openai_api_key', // For embeddings
  1000, // chunk size
  200   // chunk overlap
);

// Load vector store from a directory
const vectorStore = await loadVectorStoreFromDirectory(
  'path/to/pdf/directory',
  'your_openai_api_key' // For embeddings
);

// Query with RAG
const response = await queryWithRAG(
  'Your query here',
  'path/to/pdf/directory',
  'your_openai_api_key',    // For LLM
  'your_openai_api_key',    // For embeddings
  5 // max results
);
```

## Customization

You can customize the prompt template in the `queryWithRAG` function in `pdfProcessor.ts` to better suit your specific use case.
