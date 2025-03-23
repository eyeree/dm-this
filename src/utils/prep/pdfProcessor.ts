import * as fs from 'fs';
import * as path from 'path';
import * as pdfjsLib from 'pdfjs-dist';
import { createCanvas } from 'canvas';
import { sendMessage } from '../../services/llm';
import { LLMMessageContent } from '../../services/llm/types';

// Set the PDF.js worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = path.resolve(
  process.cwd(),
  'node_modules/pdfjs-dist/build/pdf.worker.js'
);

// Configure Node.js canvas for PDF.js
const NodeCanvasFactory = {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return {
      canvas,
      context,
    };
  },
};

/**
 * Extract text and images from a PDF file
 * @param pdfPath Path to the PDF file
 * @param outputDir Directory to save extracted images
 * @returns Promise with extracted text and image paths
 */
export async function extractContentFromPDF(
  pdfPath: string,
  outputDir: string
): Promise<{
  text: string[];
  images: { pageNumber: number; filePath: string }[];
}> {
  try {
    // Read the PDF file as a buffer
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDocument = await loadingTask.promise;
    
    console.log(`PDF loaded with ${pdfDocument.numPages} pages`);
    
    // Create images directory if it doesn't exist
    const imagesDir = path.join(outputDir, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    // Extract text and images from each page
    const textByPage: string[] = [];
    const images: { pageNumber: number; filePath: string }[] = [];
    
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      
      // Extract text content
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      textByPage.push(text);
      
      // Extract images
      const operatorList = await page.getOperatorList();
      for (let j = 0; j < operatorList.fnArray.length; j++) {
        const fnId = operatorList.fnArray[j];
        if (fnId === pdfjsLib.OPS.paintImageXObject) {
          const imageArgs = operatorList.argsArray[j];
          const imageId = imageArgs[0];
          
          // Get the image data
          const imgData = await page.objs.get(imageId);
          if (imgData && imgData.data) {
            // Create a canvas to render the image
            const { canvas } = NodeCanvasFactory.create(imgData.width, imgData.height);
            const ctx = canvas.getContext('2d');
            
            // Create an ImageData object
            const imageData = ctx.createImageData(imgData.width, imgData.height);
            imageData.data.set(imgData.data);
            ctx.putImageData(imageData, 0, 0);
            
            // Save the image to a file
            const fileName = `page${i}_image${j}.png`;
            const filePath = path.join(imagesDir, fileName);
            
            // Write the image to a file
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(filePath, buffer);
            
            // Store the file path
            images.push({ pageNumber: i, filePath });
          }
        }
      }
      
      if (i % 10 === 0) {
        console.log(`Processed ${i} pages...`);
      }
    }
    
    console.log(`Extracted ${textByPage.length} pages of text and ${images.length} images`);
    return { text: textByPage, images };
  } catch (error) {
    console.error('Error extracting content from PDF:', error);
    throw error;
  }
}

/**
 * Process all PDF files in a module directory and create an outline
 * @param modulePath Path to the module directory containing PDF files
 * @returns Promise with the generated outline
 */
export async function processModuleDirectory(modulePath: string): Promise<string> {
  try {
    console.log(`Processing PDFs in module directory: ${modulePath}`);
    
    // Get all PDF files in the directory
    const files = fs.readdirSync(modulePath)
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .map(file => path.join(modulePath, file));
    
    if (files.length === 0) {
      throw new Error(`No PDF files found in ${modulePath}`);
    }
    
    console.log(`Found ${files.length} PDF files`);
    
    // Create the prepared directory if it doesn't exist
    const preparedDir = path.join(modulePath, 'prepared');
    if (!fs.existsSync(preparedDir)) {
      fs.mkdirSync(preparedDir, { recursive: true });
    }
    
    // Process each PDF file and collect all content
    const allContent: {
      fileName: string;
      text: string[];
      images: { pageNumber: number; filePath: string }[];
    }[] = [];
    
    for (const file of files) {
      console.log(`Processing PDF: ${file}`);
      const { text, images } = await extractContentFromPDF(file, preparedDir);
      allContent.push({
        fileName: path.basename(file),
        text,
        images
      });
    }
    
    // Generate the outline using LLM
    console.log('Generating module outline with LLM...');
    const outline = await generateOutline(allContent);
    
    // Write the outline to a file
    const outlinePath = path.join(preparedDir, 'module-outline.md');
    fs.writeFileSync(outlinePath, outline);
    
    console.log(`Module outline saved to ${outlinePath}`);
    return outline;
  } catch (error) {
    console.error('Error processing module directory:', error);
    throw error;
  }
}

/**
 * Generate an outline from PDF content using LLM
 * @param content Array of content from PDF files
 * @param preparedDir Directory containing extracted images
 * @returns Promise with the generated outline
 */
export async function generateOutline(
  content: {
    fileName: string;
    text: string[];
    images: { pageNumber: number; filePath: string }[];
  }[]
): Promise<string> {
  try {
    // Create the system prompt
    const systemPrompt = `
You are an expert game master preparing to run a game session.
Create an outline for this RPG module based on the provided PDF content.
The outline will be provided in future prompts to provide the "big picture" 
context needed to respond to specific player messages and actions. It
should provide information about the overall structure of the campaign, 
key locations, major NPCs and monsters, treasures and rewards, etc. 
Also include a description of the flavor, style, and themes of the module.
Format the outline in Markdown with appropriate headings, lists, and structure.`;

    // Create the message content with text and images
    const messageContent: LLMMessageContent[] = [];
    
    // Add a text introduction
    messageContent.push({
      type: 'text',
      text: `Please create a detailed outline for this RPG module based on the following content from ${content.length} PDF files.`
    });
    
    // Add content from each PDF
    for (const pdf of content) {
      // Add the file name
      messageContent.push({
        type: 'text',
        text: `\n\nContent from file: ${pdf.fileName}\n\n`
      });
      
      // Add text content
      const combinedText = pdf.text.join('\n\n');
      messageContent.push({
        type: 'text',
        text: combinedText
      });
      
      // Add images (limit to a reasonable number to avoid token limits)
      const maxImages = 5; // Adjust based on your needs
      const selectedImages = pdf.images.slice(0, maxImages);
      
      for (const image of selectedImages) {
        // Read the image file and convert to base64
        const imageBuffer = fs.readFileSync(image.filePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = 'image/png';
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        
        messageContent.push({
          type: 'image_url',
          image_url: {
            url: dataUrl,
            detail: 'high'
          }
        });
      }
      
      if (pdf.images.length > maxImages) {
        messageContent.push({
          type: 'text',
          text: `\n\n[Note: ${pdf.images.length - maxImages} additional images were omitted to stay within token limits]`
        });
      }
    }
    
    // Use our LLM abstraction layer to send the message
    const response = await sendMessage(
      [{ role: 'user', content: messageContent }],
      systemPrompt
    );
    
    return response.message.content;
  } catch (error) {
    console.error('Error generating outline with LLM:', error);
    throw error;
  }
}
