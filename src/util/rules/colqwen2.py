import torch
from tqdm import tqdm
from colpali_engine.models import ColQwen2, ColQwen2Processor
from colpali_engine.models import ColPali, ColPaliProcessor
from pdf2image import convert_from_path
from pathlib import Path, PosixPath
from PIL import Image
import os
from qdrant_client import QdrantClient
from qdrant_client.http import models
import stamina
from rich import print as r_print

THREAD_COUNT = 16
BATCH_SIZE = 3

class RuleSetRag:

    _page_image_path_cache:list[str] = []

    def __init__(self, rule_set_path:Path):
        self._rule_set_path = rule_set_path
        self._page_image_path = self._rule_set_path.joinpath('page_image')
        self._page_image_path.mkdir(exist_ok=True)
        self._qdrant_path = self._rule_set_path.joinpath('qdrant')
        self._qdrant_path.mkdir(exist_ok=True)
        self._qdrant_client = QdrantClient(path=str(self._qdrant_path))

        self._load_page_image_path_cache()

        self._use_colqwen2_v0_1()
        # self._use_colpali_v_1_3()

    def _use_colqwen2_v0_1(self):

        self._page_images_collection_name = 'page_images_colqwen2_v0_1'
        self._vector_size = 128

        model_name = "vidore/colqwen2-v0.1"

        self._model = ColQwen2.from_pretrained(
            model_name, 
            torch_dtype=torch.bfloat16, 
            device_map="auto",
            # local_files_only=True
        ).eval()

        self._processor = ColQwen2Processor.from_pretrained(
            model_name, 
            use_fast=True
        )
        
    def _use_colpali_v_1_3(self):

        self._page_images_collection_name = 'page_images_colpali_v_1_3'
        self._vector_size = 128

        model_name = "vidore/colpali-v1.3"

        self._model = ColPali.from_pretrained(
            model_name, 
            torch_dtype=torch.bfloat16, 
            device_map="auto",
            # local_files_only=True
        ).eval()

        self._processor = ColPaliProcessor.from_pretrained(
            model_name, 
            use_fast=True
        )

    def create_index(self):
        # self._create_page_images()
        self._create_page_images_collection()
        self._index_page_image_embeddings()

    def _create_page_images(self):

        print(f'Deleting page images in {self._page_image_path}...')
        for image_file_path in self._page_image_path.iterdir():
            image_file_path.unlink()

        for pdf_file_path in self._rule_set_path.glob('*.pdf'):
            print(f'Creating page images for {pdf_file_path} in {self._page_image_path}...')
            self._create_page_images_for_pdf(pdf_file_path)

        self._load_page_image_path_cache()

    def _create_page_images_for_pdf(self, pdf_file_path:Path):
        convert_from_path(
            pdf_file_path, 
            fmt='png',
            output_file=pdf_file_path.stem, 
            output_folder=self.page_image_path,
            paths_only=True,
            thread_count=THREAD_COUNT
        )

    def _create_page_images_collection(self):

        if self._qdrant_client.collection_exists(self._page_images_collection_name):
            self._qdrant_client.delete_collection(self._page_images_collection_name)

        self._qdrant_client.create_collection(
            collection_name=self._page_images_collection_name,  # the name of the collection
            on_disk_payload=True,  # store the payload on disk
            optimizers_config=models.OptimizersConfigDiff(
                indexing_threshold=0
            ),  # it can be useful to switch this off when doing a bulk upload and then manually trigger the indexing once the upload is done
            vectors_config=models.VectorParams(
                size=self._vector_size,
                distance=models.Distance.COSINE,
                multivector_config=models.MultiVectorConfig(
                    comparator=models.MultiVectorComparator.MAX_SIM
                ),
                quantization_config=models.ScalarQuantization(
                    scalar=models.ScalarQuantizationConfig(
                        type=models.ScalarType.INT8,
                        quantile=0.99,
                        always_ram=True,
                    ),
                ),
            ),
        )

    def _index_page_image_embeddings(self):

        for (i, image_file_paths, embeddings) in self._generate_image_embeddings(self._page_image_path_cache):
            self._upsert_to_qdrant(self._page_images_collection_name, i, image_file_paths, embeddings)

        self._qdrant_client.update_collection(
            collection_name=self._page_images_collection_name,
            optimizer_config=models.OptimizersConfigDiff(indexing_threshold=10),
        )

    def _generate_image_embeddings(self, image_file_paths:list[str]):

        for i in tqdm(range(0, len(image_file_paths), BATCH_SIZE), "Generating embeddings"):
            batch_images = []
            for j in range(i, min(i + BATCH_SIZE, len(image_file_paths))):
                try:
                    img = Image.open(image_file_paths[j])
                    batch_images.append(img)
                except Exception as e:
                    print(f"Error loading image {image_file_paths[j]}: {e}")
                    continue
            
            if not batch_images:
                continue
                
            batch_doc = self._processor.process_images(batch_images)
            
            # Generate embeddings
            with torch.no_grad():
                batch_doc = {k: v.to(self._model.device) for k, v in batch_doc.items()}
                embeddings_doc = self._model(**batch_doc)
                embeddings = list(torch.unbind(embeddings_doc.to("cpu")))
                yield (i, image_file_paths, embeddings)
            
            # Explicitly close images to free memory
            for img in batch_images:
                img.close()

    @stamina.retry(on=Exception, attempts=3)
    def _upsert_to_qdrant(self, collection_name, i, image_file_paths, image_embeddings):

        points = []
        for j, embedding in enumerate(image_embeddings):
            # Convert the embedding to a list of vectors
            multivector = embedding.cpu().float().numpy().tolist()
            points.append(
                models.PointStruct(
                    id=i + j,  # we just use the index as the ID
                    vector=multivector,  # This is now a list of vectors
                    payload={
                        "source": image_file_paths[i + j]
                    },  # can also add other metadata/data
                )
            )

        try:
            self._qdrant_client.upsert(
                collection_name=collection_name,
                points=points,
                wait=False,
            )
        except Exception as e:
            print(f"Error during upsert: {e}")
            return False
        return True

    def show_embedding_dimensions(self):

        sample_image = Image.open(self._page_image_path_cache[0])

        with torch.no_grad():
            sample_batch = self._processor.process_images([sample_image]).to(
                self._model.device
            )
            sample_embedding = self._model(**sample_batch)
            print('shape:', sample_embedding.shape)
            print('size:', sample_embedding.shape[2])

    def _load_page_image_path_cache(self):
        self._page_image_path_cache = sorted([
            str(image_file_path) for image_file_path in self._page_image_path.iterdir()
        ])

    def get_page_image_paths(self, query_text:str, top_k:int = 5) -> list[str]:

        with torch.no_grad():
            batch_query = self._processor.process_queries([query_text + ' ' + query_text.capitalize() + ' ' +  query_text.lower() + ' ' +  query_text.upper()]).to(
                self._model.device
            )
            query_embedding = self._model(**batch_query)

        multivector_query = query_embedding[0].cpu().float().numpy().tolist()

        query_result = self._qdrant_client.query_points(
            collection_name=self._page_images_collection_name, query=multivector_query, limit=top_k
        )

        row_ids = [r.id for r in query_result.points]
        return [self._page_image_path_cache[row_id] for row_id in row_ids]


rule_set_rag = RuleSetRag(PosixPath('./content/rules/SRD3_5'))

# rule_set_rag.show_embedding_dimensions()

rule_set_rag.create_index()

while True:
    try:
        query_text = input("query: ")
        if query_text == "":
            break
        matching_image_file_paths = rule_set_rag.get_page_image_paths(query_text, 10)
        print('\n'.join(['  ' + path for path in matching_image_file_paths]))
    except EOFError:
        break
    except KeyboardInterrupt:
        break
print('\n\n')