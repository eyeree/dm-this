import * as dotenv from 'dotenv';
import * as path from 'path';
import { processModuleDirectory } from './pdfProcessor';

// Load environment variables
dotenv.config();

// Example usage of the module prep utility
async function main() {
  try {
    // Path to the module directory containing PDF files
    const modulePath = path.resolve(process.cwd(), 'content/module/RedDemon');
    
    console.log(`Processing PDFs in module directory: ${modulePath}`);
    
    // Process the module directory
    const outline = await processModuleDirectory(modulePath);
    
    // Get the path to the output file
    const outlinePath = path.join(modulePath, 'prepared', 'module-outline.md');
    
    console.log(`\nModule outline generated successfully!`);
    console.log(`Outline saved to: ${outlinePath}`);
    
    // Print a preview of the outline
    const previewLines = outline.split('\n').slice(0, 10).join('\n');
    console.log('\nPreview of the outline:');
    console.log('-------------------');
    console.log(previewLines);
    console.log('...');
    console.log('-------------------');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the example
main();
