import * as dotenv from 'dotenv';
import * as path from 'path';
import { processDirectory, queryWithRAG } from './pdfProcessor';

// Load environment variables
dotenv.config();

// Example usage of the PDF RAG utility
async function main() {
  try {
    // Get API keys from environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!openaiApiKey) {
      console.error('Error: OPENAI_API_KEY environment variable is required for embeddings');
      process.exit(1);
    }
    
    if (!anthropicApiKey) {
      console.error('Error: ANTHROPIC_API_KEY environment variable is required for LLM');
      process.exit(1);
    }
    
    // Path to the directory containing PDF files
    const pdfDir = path.resolve(process.cwd(), 'content/rules/SRD3_5');
    
    // Process the directory (using OpenAI API key for embeddings)
    console.log(`Processing PDFs in directory: ${pdfDir}`);
    const { chunks } = await processDirectory(
      pdfDir,
      openaiApiKey,
      1000, // chunk size
      200   // chunk overlap
    );
    
    console.log(`Processing complete. Created ${chunks.length} chunks.`);
    console.log(`Vector store saved to ${path.join(pdfDir, 'hnsw')}`);
    
    // Example query
    const query = 'What are the rules for grappling?';
    console.log(`\nQuerying: "${query}"`);
    
    // Query with RAG (using Anthropic API key for LLM)
    const response = await queryWithRAG(
      query,
      pdfDir,
      anthropicApiKey,
      openaiApiKey,
      5 // max results
    );
    
    console.log('\nResponse:');
    console.log(response);
    
    // Another example query
    const query2 = 'How does spell resistance work?';
    console.log(`\nQuerying: "${query2}"`);
    
    // Query with RAG (using Anthropic API key for LLM)
    const response2 = await queryWithRAG(
      query2,
      pdfDir,
      anthropicApiKey,
      openaiApiKey,
      5 // max results
    );
    
    console.log('\nResponse:');
    console.log(response2);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the example
main();
