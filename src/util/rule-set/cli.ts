#!/usr/bin/env node
import '../config/load';
import * as fs from 'fs';
import { Command } from 'commander';
import { RuleSet, RuleSetProcessor } from '.';

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
  .action(async (options: {
    dir: string;
  }) => {
    try {

      if (!fs.existsSync(options.dir)) {
        console.error(`Error: Directory not found: ${options.dir}`);
        process.exit(1);
      }

      const processor = new RuleSetProcessor()
      await processor.process(options.dir)

      console.log(`Processing complete.`);
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
  .action(async (options: {
    dir: string;
    query: string;
    results: string;
  }) => {
    try {
      const rule_set = await RuleSet.load(options.dir)
      const response = await rule_set.getRuleSetResponse(options.query)
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
.option('-r, --results <count>', 'Maximum number of results to return', '5')
.action(async (options: {
  dir: string;
  query: string;
  results: string;
}) => {
  try {
    const rule_set = await RuleSet.load(options.dir)
    const context = await rule_set.getRuleSetContext(options.query)
    console.log(context);
} catch (error) {
    console.error('Error querying data:', error);
    process.exit(1);
  }
});

// Parse command line arguments
program.parse();
