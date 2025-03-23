import * as dotenv from 'dotenv';
import * as path from 'path';
import { processDirectory, queryWithRAG } from './pdfProcessor';

// Load environment variables
dotenv.config();

// Example usage of the PDF RAG utility
async function main() {
  try {
    
    // Path to the directory containing PDF files
    const pdfDir = path.resolve(process.cwd(), 'content/rules/SRD3_5');
    
    // Process the directory (using OpenAI API key for embeddings)
    console.log(`Processing PDFs in directory: ${pdfDir}`);
    const { chunks } = await processDirectory(
      pdfDir,
      1000, // chunk size
      200   // chunk overlap
    );
    
    console.log(`Processing complete. Created ${chunks.length} chunks.`);
    console.log(`Vector store saved to ${path.join(pdfDir, 'hnsw')}`);
    
    // Example query
    const query = 'What are the rules for grappling?';
    console.log(`\nQuerying: "${query}"`);
    
    // Query with RAG
    const response = await queryWithRAG(
      query,
      pdfDir,
      5 // max results
    );
    
    console.log('\nResponse:');
    console.log(response);
    
    // Another example query
    const query2 = 'How does spell resistance work?';
    console.log(`\nQuerying: "${query2}"`);
    
    // Query with RAG
    const response2 = await queryWithRAG(
      query2,
      pdfDir,
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
