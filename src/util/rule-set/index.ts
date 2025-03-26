import * as fs from 'fs';
import * as path from 'path';
import * as pdfjsLib from 'pdfjs-dist';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OpenAI } from 'openai';
import { sendMessage } from '../../services/llm';

// Set the PDF.js worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = path.resolve(
  process.cwd(),
  'node_modules/pdfjs-dist/build/pdf.worker.js'
);

export interface ChunkMetadata {
  pageNumber: number;
  fileName: string;
  chunkIndex: number;
}

/**
 * Extract text from a PDF file
 * @param pdfPath Path to the PDF file
 * @returns Promise with extracted text by page
 */
export async function extractTextFromPDF(pdfPath: string): Promise<string[]> {
  try {
    // Read the PDF file as a buffer
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDocument = await loadingTask.promise;
    
    console.log(`PDF loaded with ${pdfDocument.numPages} pages`);
    
    // Extract text from each page
    const textByPage: string[] = [];
    
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const content = await page.getTextContent();
      
      // Concatenate the text items
      const text = content.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      textByPage.push(text);
      
      if (i % 10 === 0) {
        console.log(`Processed ${i} pages...`);
      }
    }
    
    return textByPage;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

/**
 * Split text into chunks for processing
 * @param textByPage Array of text by page
 * @param fileName Name of the original file
 * @param chunkSize Size of each chunk
 * @param chunkOverlap Overlap between chunks
 * @returns Array of Document objects with metadata
 */
export async function splitTextIntoChunks(
  textByPage: string[],
  fileName: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<Document<ChunkMetadata>[]> {
  try {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
    });
    
    const documents: Document<ChunkMetadata>[] = [];
    
    for (let pageNumber = 0; pageNumber < textByPage.length; pageNumber++) {
      const pageText = textByPage[pageNumber];
      
      if (!pageText.trim()) {
        continue; // Skip empty pages
      }
      
      // Split text into chunks
      const chunks = await splitter.splitText(pageText);
      
      // Create Document objects with metadata
      const pageDocuments = chunks.map((chunk: string, index: number) => {
        return new Document({
          pageContent: chunk,
          metadata: {
            pageNumber: pageNumber + 1, // 1-based page numbering
            fileName,
            chunkIndex: index,
          },
        });
      });
      
      documents.push(...pageDocuments);
    }
    
    console.log(`Created ${documents.length} chunks from ${textByPage.length} pages`);
    return documents;
  } catch (error) {
    console.error('Error splitting text into chunks:', error);
    throw error;
  }
}

/**
 * Create a custom embeddings class that uses OpenAI's API
 * @param apiKey OpenAI API key
 * @returns CustomOpenAIEmbeddings instance
 */
async function createOpenAIEmbeddings() {
  
  // Create a custom embeddings class that uses OpenAI's API
  class CustomOpenAIEmbeddings {
    private client: OpenAI;
    private model: string;
    
    constructor(model: string = 'text-embedding-3-small') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }
      this.client = new OpenAI({ apiKey });
      this.model = model;
    }
    
    async embedDocuments(texts: string[]): Promise<number[][]> {
      console.log(`Creating embeddings for ${texts.length} chunks...`)
      const embeddings:number[][] = [];
      const start_time = new Date().getTime();
      const concurrent = 10;
      for (var i = 0; i < texts.length; i += concurrent) {
        const concurrent_start_time = new Date().getTime();
        const concurrent_texts = texts.slice(i, i + concurrent);
        const concurrent_embeddings = await Promise.all(
          concurrent_texts.map(async (text) => {
            return await this.embedQuery(text);
          })
        );
        embeddings.push(...concurrent_embeddings);
        const concurrent_end_time = new Date().getTime();
        console.log(`  ${i+concurrent} chunks processed in ${(concurrent_end_time - concurrent_start_time) / 1000} seconds`);
      }
      const end_time = new Date().getTime();
      console.log(`Embeddings created for ${texts.length} chunks in ${(end_time - start_time) / 1000} seconds`);
      return embeddings;
    }
    
    async embedQuery(text: string): Promise<number[]> {
      try {
        const response = await this.client.embeddings.create({
          model: this.model,
          input: text,
        });
        return response.data[0].embedding;
      } catch (error) {
        console.error('Error creating embedding:', error);
        throw error;
      }
    }
  }
  
  return new CustomOpenAIEmbeddings();
}

/**
 * Save vector store to disk
 * @param vectorStore HNSWLib vector store
 * @param storePath Path to save the vector store
 */
async function saveVectorStore(
  vectorStore: HNSWLib,
  directoryPath: string
): Promise<void> {
  try {

    const storePath = path.join(directoryPath, 'hnsw')

    // Create output directory if it doesn't exist
    if (!fs.existsSync(path.dirname(storePath))) {
      fs.mkdirSync(path.dirname(storePath), { recursive: true });
    }
    
    // Save vector store to disk
    await vectorStore.save(storePath);
    
    console.log(`Saved vector store to ${storePath}`);
  } catch (error) {
    console.error('Error saving vector store:', error);
    throw error;
  }
}

/**
 * Create a new vector store from documents
 * @param chunks Array of Document objects
 * @param apiKey OpenAI API key
 * @returns HNSWLib vector store with embeddings
 */
export async function createVectorStore(
  chunks: Document<ChunkMetadata>[]
): Promise<HNSWLib> {
  try {
    // Initialize embeddings with OpenAI
    const embeddings = await createOpenAIEmbeddings();
    
    // Create vector store from documents
    console.log('Creating vector store with embeddings...');
    const vectorStore = await HNSWLib.fromDocuments(chunks, embeddings);
    
    console.log('Vector store created successfully');
    return vectorStore;
  } catch (error) {
    console.error('Error creating vector store:', error);
    throw error;
  }
}

/**
 * Process a PDF file and create chunks
 * @param pdfPath Path to the PDF file
 * @param chunkSize Size of each chunk
 * @param chunkOverlap Overlap between chunks
 * @returns Array of Document objects with metadata
 */
export async function processPDFFile(
  pdfPath: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<Document<ChunkMetadata>[]> {
  try {
    console.log(`Processing PDF: ${pdfPath}`);
    
    // Extract text from PDF
    const textByPage = await extractTextFromPDF(pdfPath);
    
    // Get the file name
    const fileName = path.basename(pdfPath);
    
    // Split text into chunks
    const chunks = await splitTextIntoChunks(textByPage, fileName, chunkSize, chunkOverlap);
    
    return chunks;
  } catch (error) {
    console.error(`Error processing PDF ${pdfPath}:`, error);
    throw error;
  }
}

/**
 * Process all PDF files in a directory and create a single vector store
 * @param directoryPath Path to the directory containing PDF files
 * @param apiKey API key for embeddings
 * @param chunkSize Size of each chunk
 * @param chunkOverlap Overlap between chunks
 */
export async function processDirectory(
  directoryPath: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Promise<void> {
  try {
    console.log(`Processing PDFs in directory: ${directoryPath}`);
    
    // Get all PDF files in the directory
    const files = fs.readdirSync(directoryPath)
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .map(file => path.join(directoryPath, file));
    
    if (files.length === 0) {
      throw new Error(`No PDF files found in ${directoryPath}`);
    }
    
    console.log(`Found ${files.length} PDF files`);
    
    // Process each PDF file and collect all chunks
    const allChunks: Document<ChunkMetadata>[] = [];
    for (const file of files) {
      const chunks = await processPDFFile(file, chunkSize, chunkOverlap);
      allChunks.push(...chunks);
    }
    
    console.log(`Processed ${files.length} PDFs with ${allChunks.length} total chunks`);
    
    // Create vector store from all chunks
    const vectorStore = await createVectorStore(allChunks);
    
    // Save vector store to the hnsw directory
    await saveVectorStore(vectorStore, directoryPath);
    
  } catch (error) {
    console.error('Error processing directory:', error);
    throw error;
  }
}

/**
 * Load vector store for querying
 * @param directoryPath Path to the directory containing PDF files (hnsw will be appended)
 * @param apiKey API key for embeddings
 * @returns HNSWLib vector store
 */
export async function loadVectorStore(
  directoryPath: string
): Promise<HNSWLib> {
  try {
    const hnswPath = path.join(directoryPath, 'hnsw');
    
    if (!fs.existsSync(hnswPath)) {
      throw new Error(`Vector store not found at ${hnswPath}. Please process the directory first.`);
    }
    
    // Initialize embeddings with OpenAI
    const embeddings = await createOpenAIEmbeddings();
    
    console.log(`Loading vector store from ${hnswPath}`);
    
    if (!fs.existsSync(hnswPath)) {
      throw new Error(`Vector store not found at ${hnswPath}`);
    }
    
    // Load vector store from disk
    const vectorStore = await HNSWLib.load(hnswPath, embeddings);
    
    console.log('Vector store loaded successfully');
    return vectorStore;

  } catch (error) {
    console.error('Error loading vector store from directory:', error);
    throw error;
  }
}

/**
 * Query the vector store with RAG
 * @param query User query
 * @param directoryPath Path to the directory containing PDF files (hnsw will be appended)
 * @param apiKey API key for LLM
 * @param embeddingsApiKey API key for embeddings (defaults to apiKey if not provided)
 * @param maxResults Maximum number of results to return
 * @returns Promise with the generated response
 */
export async function queryWithRAG(
  query: string,
  directoryPath: string,
  maxResults: number = 5
): Promise<string> {
  try {
    // Load the vector store
    const context = await getRuleSetContext(directoryPath, query, maxResults);
    
    // Create the system prompt
    const systemPrompt = `
You are an expert on Dungeons & Dragons 3.5 SRD (System Reference Document).
Answer the following question based on the provided context.
If you don't know the answer or it's not in the context, say so - don't make up information.`;

    // Create the user message with context and query
    const userMessage = `
Context:
${context}

Question: ${query}

Answer:`;

    // Use our LLM abstraction layer to send the message
    const response = await sendMessage(
      [{ role: 'user', content: userMessage }],
      systemPrompt
    );
    
    return response.message.content;
  } catch (error) {
    console.error('Error querying with RAG:', error);
    throw error;
  }
}

const vector_store_cache: { [key: string]: HNSWLib } = {};

async function getVectorStore(directoryPath: string) {
  if (!vector_store_cache[directoryPath]) {
    vector_store_cache[directoryPath] = await loadVectorStore(directoryPath);
  }
  return vector_store_cache[directoryPath];
}

export async function getRuleSetContext(directoryPath: string, query: string, maxResults: number = 5) {

  const vectorStore = await getVectorStore(directoryPath);

  // Search for relevant documents
  const relevantDocs = await vectorStore.similaritySearch(query, maxResults);

  // Format context from relevant documents
  const context = relevantDocs
    .map((doc) => {
      const metadata = doc.metadata as ChunkMetadata;
      return `[Page ${metadata.pageNumber} from ${metadata.fileName}]: ${doc.pageContent}`;
    })
    .join('\n\n');

  return context;

}

