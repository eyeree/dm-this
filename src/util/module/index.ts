import * as fs from 'fs';
import * as path from 'path';
import * as pdfjsLib from 'pdfjs-dist';
import { createCanvas } from 'canvas';
import { sendMessage } from '../../services/llm';
import { LLMMessageContent } from '../../services/llm/types';
import { TypedArray } from 'pdfjs-dist/types/src/display/api';
// import { pdf } from "pdf-to-img";

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

  // try {
  //   const { pdf } = await import("pdf-to-img");
  //   let counter = 1;
  //   const document = await pdf(pdfPath, { scale: 3 });
  //   for await (const image of document) {
  //     await fs.promises.writeFile(`page${counter}.png`, image);
  //     counter++;
  //   }
  // } catch (error) {
  //   console.error('pdfToPng:', error);
  //   throw error;
  // }
  try {
    // Read the PDF file as a buffer
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ 
      data, 
      // verbosity: pdfjsLib.VerbosityLevel.INFOS,
      disableStream: true,
      disableAutoFetch: true,
      disableFontFace: true,
      useSystemFonts: true,
      stopAtErrors: false
    });
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
    
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
      const page = await pdfDocument.getPage(pageNumber);
      
      // Extract text content
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      textByPage.push(text);

      if (pageNumber === 4) {
        console.log('text', text)
        const root = await page.getStructTree()
        const visit = (node: any, prefix = '') => {
          const { children, ...rest } = node;
          console.log(prefix + JSON.stringify(rest))
          if (children) {
            node.children.forEach((child:any) => visit(child, prefix + '  '))
          }
        }
        visit(root)
      }

      // Extract images
      const operatorList = await page.getOperatorList();
      for (let operatorIndex = 0; operatorIndex < operatorList.fnArray.length; operatorIndex++) {
        const operator = operatorList.fnArray[operatorIndex];
        if (pageNumber === 4) {
          // console.log('operator', operatorIndex, operator, operatorList.argsArray[operatorIndex])
        }
        if (operator === pdfjsLib.OPS.paintImageXObject) {

          const imageName:string = operatorList.argsArray[operatorIndex][0];
          const pdfImage = imageName.startsWith('g_') ? page.commonObjs.get(imageName) : page.objs.get(imageName);

          const { canvas } = NodeCanvasFactory.create(pdfImage.width, pdfImage.height);
          const ctx = canvas.getContext('2d');
          
          let data:TypedArray | null = null;
          switch (pdfImage.data.length) {
            case pdfImage.width * pdfImage.height * 3: {
              data = new Uint8ClampedArray(pdfImage.width * pdfImage.height * 4);
              for (let index = 0; index < data.length; index++) {
                // Set alpha channel to full
                if (index % 4 === 3) {
                  data[index] = 17;
                }
                // Copy RGB channel components from the original array
                else {
                  data[index] = pdfImage.data[~~(index / 4) * 3 + (index % 4)];
                }
              }
      
              break;
            }
            case pdfImage.width * pdfImage.height * 4: {
              data = pdfImage.data;
              break;
            }
            default: {
              console.log(`>>>>>>>>>>> Unknown imgData format! ${imageName} ${pdfImage.kind} ${pdfImage.width} ${pdfImage.height} ${pdfImage.data.length}`);
            }
          }

          if (data) {
            const imageData = ctx.createImageData(pdfImage.width, pdfImage.height);
            imageData.data.set(data);
            ctx.putImageData(imageData, 0, 0);
            
            const fileName = `${imageName}.png`;
            const filePath = path.join(imagesDir, fileName);
            
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(filePath, buffer);
            
            images.push({ pageNumber, filePath });
          }
        }
      }
      
      if (pageNumber % 10 === 0) {
        console.log(`Processed ${pageNumber} pages...`);
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
export async function processModuleDirectory(modulePath: string): Promise<void> {
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
    fs.rmSync(preparedDir, { recursive: true, force: true });
    fs.mkdirSync(preparedDir, { recursive: true });
    
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
    
    // // Generate the outline using LLM
    // console.log('Generating module outline with LLM...');
    // const outline = await generateOutline(allContent);
    
    // // Write the outline to a file
    // const outlinePath = path.join(preparedDir, 'module-outline.md');
    // fs.writeFileSync(outlinePath, outline);
    
    // console.log(`Module outline saved to ${outlinePath}`);
    
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
