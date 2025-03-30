#!/usr/bin/env python3
"""
PDF Image Extractor

This script extracts all images from a PDF file and saves them to a subdirectory
named after the PDF file (without the .pdf extension).

Usage:
    python generate-image-index.py <path_to_pdf_file>

Requirements:
    - PyMuPDF (fitz): pip install PyMuPDF
    - Pillow: pip install Pillow
"""

import os
from pathlib import Path
import sys
import traceback
import fitz  # PyMuPDF
from fitz import Page, Document
from PIL import Image
import io
import argparse
from tqdm import tqdm

class ModuleIndex:

    _root_path:Path
    _page_images_path:Path
    _embedded_images_path:Path

    def __init__(self, module_path:Path):
        self._root_path = module_path
        self._page_images_path = self._root_path.joinpath('page-images')
        self._embedded_images_path = self._root_path.joinpath('embedded-images')

    def _clean_directory(self, directory_path:Path):
        if directory_path.exists():
            for child_path in tqdm(list(directory_path.iterdir()), f'Cleaning {directory_path}'):
                if child_path.is_file():
                    child_path.unlink()
        else:
            print(f'Creating directory {directory_path}')
            directory_path.mkdir()

    def _file_name_without_extension(path:str) -> str:
        basename = os.path.basename(path)
        file_name_without_extension, file_extension = os.path.splitext(basename)
        return file_name_without_extension

    def create_index(self):
        self._index_pdfs()

    def _index_pdfs(self):

        self._clean_directory(self._page_images_path)
        self._clean_directory(self._embedded_images_path)

        for pdf_file_path in self._root_path.glob('*.pdf'):
            self._index_pdf(pdf_file_path)

    def _index_pdf(self, pdf_file_path:Path):

        pdf_document = fitz.open(pdf_file_path)

        base_file_name = pdf_file_path.stem

        xreflist:list[str] = []
        for page in tqdm(pdf_document.pages(), f'Processing {pdf_file_path}', pdf_document.page_count):
            page.clean_contents()
            self._save_page_image(page, base_file_name)
            self._extract_embedded_images_from_page(page, base_file_name, xreflist)

        pdf_document.close()

    def _save_page_image(self, page:Page, base_file_name:str):
        pix = page.get_pixmap()
        pix.save(self._page_images_path.joinpath(f"{base_file_name}-{page.number}.png"))

    def _extract_embedded_images_from_page(self, page:Page, base_file_name:str, xreflist:list[str]) -> int:
            
        pdf_document:Document = page.parent

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
            image_ext = base_image["ext"]
            
            # image = Image.open(io.BytesIO(image_bytes))

            # Generate output filename
            output_filename = f"{base_file_name}-{page.number+1:04d}-{img_index+1:04d}.{image_ext}"
            
            # Save the image
            with open(self._embedded_images_path.joinpath(output_filename), "wb") as img_file:
                img_file.write(image_bytes)
            
            image_count += 1
        
        return image_count


def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Index the contents of a module directory')
    parser.add_argument('module_path', help='Path to the module directory')
    
    # Parse arguments
    args = parser.parse_args()

    module_path = Path(args.module_path)
    if not module_path.is_dir():
        print(f'Expected "{args.dir_path}" to identify a directory.')
        exit(1)

    try:
        index = ModuleIndex(module_path)
        index.create_index()
    except Exception as e:
        print(f"Error indexing module: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
