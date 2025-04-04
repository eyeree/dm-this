#!/usr/bin/env python3
"""
PDF Image Extractor and Indexer

This script extracts all images from PDF files in a directory, saves them to subdirectories,
and uses an LLM to analyze the embedded images in context of their surrounding pages.

Usage:
    # When running from the src/util/module directory:
    python generate-image-index.py <path_to_module_directory>
    
    # When running from another directory:
    python -m src.util.module.generate-image-index <path_to_module_directory>
    
    # Example:
    python generate-image-index.py /path/to/module/with/pdfs

Requirements:
    - PyMuPDF (fitz): pip install PyMuPDF
    - Pillow: pip install Pillow
    - Requests: pip install requests
    - tqdm: pip install tqdm
"""

import os
from pathlib import Path
import sys
import traceback
import json
import fitz  # PyMuPDF
from fitz import Page, Document
from PIL import Image
import io
import argparse
from tqdm import tqdm
from typing import Dict, List, Optional, Tuple, Any
import matplotlib.pyplot as plt
import numpy as np

# Import the LLM interface
# Use absolute import instead of relative import to avoid ImportError
try:
    # When running as a module within a package
    from .llm_interface import (
        LLMFactory, 
        LLMProvider, 
        LLMMessage, 
        MessageRole, 
        ContentType, 
        MessageContent
    )
except ImportError:
    # When running as a standalone script
    from llm_interface import (
        LLMFactory, 
        LLMProvider, 
        LLMMessage, 
        MessageRole, 
        ContentType, 
        MessageContent
    )

class ModuleIndex:

    _root_path: Path
    _page_images_path: Path
    _embedded_images_path: Path
    _llm_provider: Optional[LLMProvider]

    def __init__(self, module_path: Path):
        self._root_path = module_path
        self._page_images_path = self._root_path.joinpath('page-images')
        self._embedded_images_path = self._root_path.joinpath('embedded-images')
        
        # Initialize the LLM provider
        try:
            self._llm_provider = LLMFactory.get_default_provider()
            print(f"Using LLM provider: {self._llm_provider.get_provider_name()} with model: {self._llm_provider.get_model_name()}")
        except Exception as e:
            print(f"Warning: Failed to initialize LLM provider: {e}")
            self._llm_provider = None

    def _clean_directory(self, directory_path: Path):
        if directory_path.exists():
            for child_path in tqdm(list(directory_path.iterdir()), f'Cleaning {directory_path}'):
                if child_path.is_file():
                    child_path.unlink()
        else:
            print(f'Creating directory {directory_path}')
            directory_path.mkdir()

    def _file_name_without_extension(path: str) -> str:
        basename = os.path.basename(path)
        file_name_without_extension, file_extension = os.path.splitext(basename)
        return file_name_without_extension

    def create_index(self):
        self._process_pdfs()
        
        # Process embedded images with LLM after PDFs have been processed
        if self._llm_provider and self._llm_provider.supports_images():
            self._process_embedded_images_with_llm()
        else:
            print("Skipping LLM processing: LLM provider not available or doesn't support images")

    def _process_pdfs(self):
        self._clean_directory(self._page_images_path)
        self._clean_directory(self._embedded_images_path)

        for pdf_file_path in self._root_path.glob('*.pdf'):
            self._process_pdf(pdf_file_path)

    def _process_pdf(self, pdf_file_path: Path):
        pdf_document = fitz.open(pdf_file_path)

        base_file_name = pdf_file_path.stem

        xreflist: list[str] = []
        for page in tqdm(pdf_document.pages(), f'Processing {pdf_file_path}', pdf_document.page_count):
            page.clean_contents()
            self._save_page_image(page, base_file_name)
            self._extract_embedded_images_from_page(page, base_file_name, xreflist)

        pdf_document.close()

    def _save_page_image(self, page: Page, base_file_name: str):
        pix = page.get_pixmap()
        pix.save(self._page_images_path.joinpath(f"{base_file_name}-{page.number}.png"))

    def _extract_embedded_images_from_page(self, page: Page, base_file_name: str, xreflist: list[str]) -> int:
        pdf_document: Document = page.parent

        # Get all images on the page
        image_list = page.get_images(full=False)
        
        image_count = 0

        for img_index, img_info in enumerate(image_list):
            # rect = page.get_image_bbox(img[7])

            xref = img_info[0]
            if xref in xreflist:
                continue

            base_image = pdf_document.extract_image(xref)
            image_bytes = base_image["image"]

            if base_image["width"] < 50 or base_image["height"] < 50:
                continue
            
            # Convert to PIL Image and save as PNG
            image = Image.open(io.BytesIO(image_bytes))
            
            # Generate output filename with png extension
            output_filename = f"{base_file_name}-{page.number+1:04d}-{img_index+1:04d}.png"
            
            # Save the image as PNG
            image_path = self._embedded_images_path.joinpath(output_filename)
            image.save(image_path, format="PNG")
            
            image_count += 1
        
        return image_count

    def _process_embedded_images_with_llm(self):
        """
        Process all embedded images with the LLM.
        For each embedded image, include the corresponding page image and the images of the pages before and after.
        """
        if not self._llm_provider:
            print("LLM provider not available")
            return
        
        # Get all embedded images
        embedded_images = list(self._embedded_images_path.glob('*.png'))
        
        if not embedded_images:
            print("No embedded images found to process")
            return
        
        # Process each embedded image
        for embedded_image_path in tqdm(embedded_images, "Analyzing embedded images"):
            try:
                self._process_single_embedded_image(embedded_image_path)
            except Exception as e:
                print(f"Error processing image {embedded_image_path.name}: {e}")
                traceback.print_exc()
    
    def _process_single_embedded_image(self, embedded_image_path: Path):
        """
        Process a single embedded image with the LLM.
        
        Args:
            embedded_image_path: Path to the embedded image file
        """
        # Parse the filename to get the base name, page number, and image index
        # Format: {base_file_name}-{page_number:04d}-{img_index:04d}.{ext}
        filename_parts = embedded_image_path.stem.split('-')
        
        if len(filename_parts) < 3:
            print(f"Skipping image with invalid filename format: {embedded_image_path.name}")
            return
        
        # Extract base file name (may contain hyphens)
        page_num_str = filename_parts[-2]
        img_idx_str = filename_parts[-1]
        base_file_name = '-'.join(filename_parts[:-2])
        
        try:
            page_num = int(page_num_str)
            img_idx = int(img_idx_str)
        except ValueError:
            print(f"Skipping image with invalid page/index format: {embedded_image_path.name}")
            return
        
        # Get the corresponding page image
        page_image_path = self._page_images_path.joinpath(f"{base_file_name}-{page_num-1}.png")
        
        if not page_image_path.exists():
            print(f"Skipping image: corresponding page image not found: {page_image_path}")
            return
        
        # Get the previous and next page images if they exist
        prev_page_image_path = self._page_images_path.joinpath(f"{base_file_name}-{page_num-2}.png")
        next_page_image_path = self._page_images_path.joinpath(f"{base_file_name}-{page_num}.png")
        
        # Prepare the LLM request
        messages = []
        
        # Create a user message with the images
        content_items = []
        
        # Add a text description
        content_items.append(MessageContent(
            ContentType.TEXT,
            text=f"Analyzing embedded image from page {page_num} of document '{base_file_name}'"
        ))
        
        # Add the embedded image
        content_items.append(MessageContent(
            ContentType.IMAGE,
            image_path=str(embedded_image_path)
        ))
        
        # Add the corresponding page image
        content_items.append(MessageContent(
            ContentType.TEXT,
            text=f"Full page {page_num} where the embedded image appears:"
        ))
        content_items.append(MessageContent(
            ContentType.IMAGE,
            image_path=str(page_image_path)
        ))
        
        # Add the previous page image if it exists
        if prev_page_image_path.exists():
            content_items.append(MessageContent(
                ContentType.TEXT,
                text=f"Previous page {page_num-1}:"
            ))
            content_items.append(MessageContent(
                ContentType.IMAGE,
                image_path=str(prev_page_image_path)
            ))
        
        # Add the next page image if it exists
        if next_page_image_path.exists():
            content_items.append(MessageContent(
                ContentType.TEXT,
                text=f"Next page {page_num+1}:"
            ))
            content_items.append(MessageContent(
                ContentType.IMAGE,
                image_path=str(next_page_image_path)
            ))
        
        # Create the message
        messages.append(LLMMessage(MessageRole.USER, content_items))
        
        # System prompt for the LLM
        system_prompt = """
        Analyze the embedded image in the context of the surrounding pages.
        
        Respond with a JSON object containing the following fields:
        - description: A detailed description of what the embedded image shows
        - context: How the image relates to the surrounding text on the page
        - type: The type of image, one of:
          - "map" - an interior or exterior map
          - "location" - depicts a location described in the text
          - "event" - depicts an event described in the text
          - "character" - depicts a character (NPC) described in the text
          - "creature" - depicts a creature (monster) described in the text (creatures identified by name should be treated as characters)
          - "object" - depicts an object described in the text
          - "flavor" - compliments the text, but isn't directly related to it
          - "decoration" - does not provide meaningful information
        - location: If the image is associated with a location, contains the name of the associated location
        - event: If the image is associated with an event, contains the name of the associated event
        - character: If the image is associated with a character (NPC), contains the name of the character
        - creature: If the image is associated with a creature type, contains the creature type
        - relevance: A score from 1-10 indicating how important this image is to understanding the content
        - keywords: An array of keywords relevant to the image content
        - secret: true if the image contains information players shouldn't known
        - handout: true if the image is identified as a player handout
        
        Your response must be valid JSON that can be parsed.
        """
        
        # Send the request to the LLM
        try:
            response = self._llm_provider.send_message(messages, system_prompt)
            
            # Parse the JSON response
            try:
                # Extract JSON content from the response
                # The LLM might return JSON wrapped in markdown code blocks
                content = response.content
                
                # Find the first { and last } to extract just the JSON part
                start_idx = content.find('{')
                end_idx = content.rfind('}')
                
                if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                    json_content = content[start_idx:end_idx+1]
                    result = json.loads(json_content)
                    
                    # Save the result to a JSON file with the same name as the image
                    result_path = embedded_image_path.with_suffix('.json')
                    with open(result_path, 'w') as f:
                        json.dump(result, f, indent=2)
                    
                else:
                    raise ValueError("Could not find valid JSON in the response")
                
            except (json.JSONDecodeError, ValueError) as e:
                print(f"Error parsing LLM response as JSON for {embedded_image_path.name}: {e}")
                print(f"Raw response: {response.content}")
                
        except Exception as e:
            print(f"Error calling LLM for {embedded_image_path.name}: {e}")

    def make_map_coordinate_image(self, map_image_file_path:Path):

        img = Image.open(map_image_file_path)
        width, height = img.size

        dpi = 100
        figsize = (width / dpi, height / dpi)

        fig, ax = plt.subplots(figsize=figsize, dpi=dpi)

        # Show the image without scaling
        ax.imshow(img, extent=(0, width, height, 0))  # Flip y-axis to match image coordinates
        ax.set_xlim(0, width)
        ax.set_ylim(height, 0)  # Match image coordinates: top-left origin

        ax.set_xticks([i * width / 1000 for i in range(0, 1001, 100)])
        ax.set_xticklabels([str(i) for i in range(0, 1001, 100)])
        ax.set_yticks([i * height / 1000 for i in range(0, 1001, 100)])
        ax.set_yticklabels([str(1000 - i) for i in range(0, 1001, 100)])

        # Axis styling
        ax.tick_params(labelsize=16)  # Larger tick label font

        # Save figure (with tight layout but keeping axis labels)
        output_path = map_image_file_path.parent / (map_image_file_path.stem + '_coords.png')
        fig.savefig(output_path, bbox_inches='tight', pad_inches=0.1)

        plt.close(fig)

        # img = Image.open(map_image_file_path)
        # width, height = img.size  # Pixel dimensions

        # # Set up figure size in inches to exactly match image pixel size at 1 DPI
        # dpi = 100  # You can change this if needed
        # figsize = (width / dpi, height / dpi)

        # fig = plt.figure(figsize=figsize, dpi=dpi)
        # ax = fig.add_axes([0, 0, 1, 1])  # Fill the whole figure
        # ax.imshow(img)
        # ax.axis('on')

        # # Save with no padding and exact dimensions
        # output_path = map_image_file_path.parent / (map_image_file_path.stem + '_coords.png')
        # fig.savefig(output_path, dpi=dpi, bbox_inches='tight', pad_inches=0)

        # plt.close(fig)


def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Index the contents of a module directory')
    parser.add_argument('module_path', help='Path to the module directory')
    
    # Parse arguments
    args = parser.parse_args()

    module_path = Path(args.module_path)
    if not module_path.is_dir():
        print(f'Expected "{args.module_path}" to identify a directory.')
        exit(1)

    try:
        index = ModuleIndex(module_path)
        index.make_map_coordinate_image(Path('content/module/BF1-Morgansfort-r43/embedded-images/BF1-Morgansfort-r43-0064-0001.png'))
        # index.create_index()
    except Exception as e:
        print(f"Error indexing module: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
