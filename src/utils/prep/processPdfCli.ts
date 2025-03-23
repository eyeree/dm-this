#!/usr/bin/env node
import '../config/load';
import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { processModuleDirectory } from './pdfProcessor';

// Define the CLI program
const program = new Command();

program
  .name('module-prep')
  .description('Process PDF files in a module directory to create an outline')
  .version('1.0.0');

// Prepare command
program
  .command('prepare')
  .description('Process all PDF files in a module directory and create an outline')
  .requiredOption('-d, --dir <path>', 'Path to the module directory containing PDF files')
  .action(async (options: {
    dir: string;
  }) => {
    try {
      // Validate options
      if (!fs.existsSync(options.dir)) {
        console.error(`Error: Directory not found: ${options.dir}`);
        process.exit(1);
      }

      console.log(`Processing PDFs in module directory: ${options.dir}`);

      // Process the module directory
      const outline = await processModuleDirectory(options.dir);
      
      // Get the path to the output file
      const outlinePath = path.join(options.dir, 'prepared', 'module-outline.md');
      
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
      console.error('Error processing module:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
