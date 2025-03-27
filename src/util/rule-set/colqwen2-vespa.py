import torch
from torch.utils.data import DataLoader
from tqdm import tqdm
from io import BytesIO
from colpali_engine.models import ColQwen2, ColQwen2Processor

model_name = "vidore/colqwen2-v0.1"

model = ColQwen2.from_pretrained(
    model_name, 
    torch_dtype=torch.bfloat16, 
    device_map="auto",
    local_files_only=True
)
processor = ColQwen2Processor.from_pretrained(
    model_name, 
    use_fast=True
)
model = model.eval()

from pdf2image import convert_from_path
from pypdf import PdfReader
from pathlib import PosixPath

def process_pdf(pdf_path:PosixPath):
    print(f'Processing {pdf_path}...')

    page_image_path = pdf_path.parent.joinpath('page_image')
    page_image_path.mkdir(exist_ok=True)
    # save_pdf_page_text(pdf_path)

    page_text_path = pdf_path.parent.joinpath('page_text')
    page_text_path.mkdir(exist_ok=True)
    # save_pdf_page_images(pdf_path)

    generate_image_embeddings(page_image_path)

def save_pdf_page_images(pdf_path, page_image_path):
    
    convert_from_path(
        pdf_path, 
        fmt='png',
        output_file=pdf_path.stem, 
        output_folder=page_image_path,
        paths_only=True,
        thread_count=16
    )

def save_pdf_page_text(pdf_path, page_text_path):

    reader = PdfReader(pdf_path)

    for page_number in range(len(reader.pages)):
        page = reader.pages[page_number]
        text = page.extract_text()
        with open(page_text_path.joinpath(f'{pdf_path.stem}-{page_number+1:04}.txt'), mode='w') as file:
            file.write(text)

def generate_image_embeddings(page_image_path):
    """
    Generate embeddings for images in the specified directory.
    Processes images incrementally to avoid loading all into memory at once.
    
    Args:
        page_image_path: Path to directory containing image files
    
    Returns:
        List of embeddings for all processed images
    """
    from PIL import Image
    import os
    
    page_embeddings = []
    
    # Get all image files from the directory
    image_files = sorted([
        os.path.join(page_image_path, f) 
        for f in os.listdir(page_image_path) 
        if f.lower().endswith(('.png', '.jpg', '.jpeg'))
    ])
    
    # Process images in batches
    batch_size = 2
    for i in tqdm(range(0, len(image_files), batch_size)):
        print('processing', i)
        # Load only the current batch of images
        batch_images = []
        for j in range(i, min(i + batch_size, len(image_files))):
            try:
                img = Image.open(image_files[j])
                batch_images.append(img)
            except Exception as e:
                print(f"Error loading image {image_files[j]}: {e}")
                continue
        
        if not batch_images:
            continue
            
        # Process the batch
        batch_doc = processor.process_images(batch_images)
        
        # Generate embeddings
        with torch.no_grad():
            batch_doc = {k: v.to(model.device) for k, v in batch_doc.items()}
            embeddings_doc = model(**batch_doc)
            embeddings = list(torch.unbind(embeddings_doc.to("cpu")))
            print('  ->', embeddings)
            page_embeddings.extend(embeddings)
        
        # Explicitly close images to free memory
        for img in batch_images:
            img.close()
    
    return page_embeddings

process_pdf(PosixPath('./content/rules/SRD3_5/SRD_3.5_Complete_2004_ver_1.0.pdf'))

# from IPython.display import display


# def resize_image(image, max_height=800):
#     width, height = image.size
#     if height > max_height:
#         ratio = max_height / height
#         new_width = int(width * ratio)
#         new_height = int(height * ratio)
#         return image.resize((new_width, new_height))
#     return image

# print('count:', len(page_images))

# display(resize_image(page_images[0]))
