#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Command } from 'commander';
import { processDirectory, loadVectorStoreFromDirectory, queryWithRAG, ChunkMetadata } from './pdfProcessor';

// Load environment variables
dotenv.config();

// Define the CLI program
const program = new Command();

program
  .name('pdf-rag')
  .description('Process PDF files for RAG (Retrieval-Augmented Generation)')
  .version('1.0.0');

// Process command
program
  .command('process')
  .description('Process all PDF files in a directory and create a vector store')
  .requiredOption('-d, --dir <path>', 'Path to the directory containing PDF files')
  .option('-c, --chunk-size <size>', 'Size of each chunk', '1000')
  .option('-v, --chunk-overlap <overlap>', 'Overlap between chunks', '200')
  .option('-k, --api-key <key>', 'API key for embeddings (or set OPENAI_API_KEY env var)')
  .action(async (options: {
    dir: string;
    chunkSize: string;
    chunkOverlap: string;
    apiKey?: string;
  }) => {
    try {
      // Validate options
      if (!fs.existsSync(options.dir)) {
        console.error(`Error: Directory not found: ${options.dir}`);
        process.exit(1);
      }

      // Get API key from options or environment variable
      const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('Error: API key is required. Provide it with --api-key or set OPENAI_API_KEY environment variable.');
        process.exit(1);
      }

      console.log(`Processing PDFs in directory: ${options.dir}`);
      console.log(`Chunk size: ${options.chunkSize}, Overlap: ${options.chunkOverlap}`);

      // Process the directory
      const result = await processDirectory(
        options.dir,
        apiKey,
        parseInt(options.chunkSize),
        parseInt(options.chunkOverlap)
      );

      console.log(`Processing complete. Created ${result.chunks.length} chunks.`);
      console.log(`Vector store saved to ${path.join(options.dir, 'hnsw')}`);
    } catch (error) {
      console.error('Error processing PDF:', error);
      process.exit(1);
    }
  });

// Query command
program
  .command('query')
  .description('Query the processed PDF data using RAG')
  .requiredOption('-d, --dir <path>', 'Path to the directory containing PDF files')
  .requiredOption('-q, --query <text>', 'Query text')
  .option('-k, --api-key <key>', 'API key for LLM (or set ANTHROPIC_API_KEY env var)')
  .option('-e, --embeddings-key <key>', 'API key for embeddings (or set OPENAI_API_KEY env var)')
  .option('-r, --results <count>', 'Maximum number of results to return', '5')
  .action(async (options: {
    dir: string;
    query: string;
    apiKey?: string;
    embeddingsKey?: string;
    results: string;
  }) => {
    try {
      // Validate options
      if (!fs.existsSync(options.dir)) {
        console.error(`Error: Directory not found: ${options.dir}`);
        process.exit(1);
      }

      const hnswPath = path.join(options.dir, 'hnsw');
      if (!fs.existsSync(hnswPath)) {
        console.error(`Error: Vector store not found at ${hnswPath}. Please process the directory first.`);
        process.exit(1);
      }

      // Get API keys from options or environment variables
      const embeddingsApiKey = options.embeddingsKey || process.env.OPENAI_API_KEY;
      const anthropicApiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
      
      if (!embeddingsApiKey) {
        console.error('Error: OpenAI API key is required for embeddings. Provide it with --embeddings-key or set OPENAI_API_KEY environment variable.');
        process.exit(1);
      }
      
      if (!anthropicApiKey) {
        console.error('Error: Anthropic API key is required for LLM. Provide it with --api-key or set ANTHROPIC_API_KEY environment variable.');
        process.exit(1);
      }

      console.log(`Loading vector store from: ${hnswPath}`);
      console.log(`Querying: "${options.query}"`);
      
      // Query with RAG
      const response = await queryWithRAG(
        options.query,
        options.dir,
        anthropicApiKey,
        embeddingsApiKey,
        parseInt(options.results)
      );
      
      console.log('\nResponse:');
      console.log(response);
    } catch (error) {
      console.error('Error querying data:', error);
      process.exit(1);
    }
  });

// Recall command
program
.command('recall')
.description('List the processed PDF data that would be used for a query')
.requiredOption('-d, --dir <path>', 'Path to the directory containing PDF files')
.requiredOption('-q, --query <text>', 'Query text')
.option('-k, --api-key <key>', 'API key for embeddings (or set OPENAI_API_KEY env var)')
.option('-r, --results <count>', 'Maximum number of results to return', '5')
.action(async (options: {
  dir: string;
  query: string;
  apiKey?: string;
  results: string;
}) => {
  try {
    // Validate options
    if (!fs.existsSync(options.dir)) {
      console.error(`Error: Directory not found: ${options.dir}`);
      process.exit(1);
    }

    const hnswPath = path.join(options.dir, 'hnsw');
    if (!fs.existsSync(hnswPath)) {
      console.error(`Error: Vector store not found at ${hnswPath}. Please process the directory first.`);
      process.exit(1);
    }

    // Get API key from options or environment variable
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('Error: OpenAI API key is required for embeddings. Provide it with --api-key or set OPENAI_API_KEY environment variable.');
      process.exit(1);
    }

    console.log(`Loading vector store from: ${hnswPath}`);
    console.log(`Querying: "${options.query}"`);
    
    // Load the vector store
    const vectorStore = await loadVectorStoreFromDirectory(options.dir, apiKey);
    
    // Search for relevant documents
    const relevantDocs = await vectorStore.similaritySearch(options.query, parseInt(options.results));

    // Format context from relevant documents
    const context = relevantDocs
      .map((doc: any) => {
        const metadata = doc.metadata as ChunkMetadata;
        return `[Page ${metadata.pageNumber} from ${metadata.fileName}]: ${doc.pageContent}`;
      })
      .join('\n\n');
    
    console.log('\nContext:');
    console.log(context);
  } catch (error) {
    console.error('Error querying data:', error);
    process.exit(1);
  }
});

// Parse command line arguments
program.parse();
