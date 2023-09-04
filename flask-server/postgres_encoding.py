import os
import glob
import hashlib
from tqdm import tqdm
from datetime import datetime
from PIL import Image
from sentence_transformers import SentenceTransformer
import psycopg


def batch_encode_images(root_directory, image_directory,
                        host, dbname, user, password, batch_size, clip_path):
    try:
        batch_size = int(batch_size)
    except ValueError:
        return False

    full_root_directory = os.path.join(root_directory, image_directory)
    
    # Load CLIP model for image embeddings
    model = SentenceTransformer('clip-ViT-B-32', cache_folder=clip_path)

    # Connect to the PostgreSQL database
    with psycopg.connect(host=host,
                        dbname=dbname,
                        user=user,
                        password=password) as conn:
                        
        # Create a cursor
        with conn.cursor() as cur:
            # Create tables
            cur.execute("""
                CREATE TABLE IF NOT EXISTS image_embeddings (
                    id SERIAL PRIMARY KEY,
                    relative_location TEXT,
                    embedding BYTEA
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS image_details (
                    id SERIAL PRIMARY KEY,
                    relative_location TEXT,
                    image_name TEXT,
                    image_valid BOOL,
                    image_size BIGINT,
                    image_dimensions TEXT,
                    image_extension TEXT,
                    image_date TIMESTAMPTZ,
                    image_hash TEXT,
                    image_deleted BOOL
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS unique_image_hashes (
                    id SERIAL PRIMARY KEY,
                    image_hash TEXT
                )
            """)

            # Get image file paths using rglob
            # CHANGE TO INCLUDE MORE IMAGE EXTENSIONS
            image_files = glob.glob(os.path.join(full_root_directory, '**/*.[jp][pn]g'), recursive=True)
            num_image_files = len(image_files)

            # Process and insert image details, embeddings, and unique hashes into the respective tables
            relative_location_list = []
            image_file_list = []
            invalid_file_list = []
            for i, image_file in tqdm(enumerate(image_files), total=num_image_files):
                # Get relative location
                relative_location = os.path.relpath(image_file, full_root_directory)
                
                cur.execute("SELECT COUNT(*) FROM image_embeddings WHERE relative_location = %s",
                            (relative_location,))
                
                count = cur.fetchone()[0]
                if count > 0:
                    continue
                
                commit = False
                relative_location_list.append(relative_location)
                
                with Image.open(image_file) as img:
                    image_dimensions = f"{img.width}x{img.height}"
                    try:
                        img = img.convert("RGB")
                        valid_file = True
                        image_file_list.append(image_file)
                    except:
                        valid_file = False
                        invalid_file_list.append(i % batch_size)
                
                if ((i + 1) % batch_size == 0) or ((i + 1) == num_image_files):
                    commit = True
                    if image_file_list:
                        embeddings = model.encode(
                            [Image.open(filepath) for filepath in image_file_list],
                            batch_size=batch_size,
                            convert_to_tensor=True,
                            show_progress_bar=False
                        )
                    
                        embeddings = list(embeddings.cpu().numpy())
                    else:
                        embeddings = []
                    
                    embeddings_all = []
                    for j in range(len(relative_location_list)):
                        if j in invalid_file_list:
                            embeddings_all.append(None)
                        else:
                            new_embedding = embeddings.pop(0)
                            embeddings_all.append(new_embedding)
                    
                    assert len(embeddings) == 0
                    assert len(embeddings_all) == len(relative_location_list)
                    
                    for embedding, relative_location in zip(embeddings_all, relative_location_list):
                        if embedding is None:
                            embedding_bytes = None
                        else:
                            # Convert embedding to bytes
                            embedding_bytes = embedding.tobytes()
                        
                        # Insert embedding and relative location into image_embeddings table
                        cur.execute("INSERT INTO image_embeddings (relative_location, embedding) VALUES (%s, %s)",
                                    (relative_location, embedding_bytes))
                                        
                    relative_location_list = []
                    image_file_list = []
                    invalid_file_list = []
                
                # Get image details
                image_name = os.path.basename(image_file)
                image_size = os.path.getsize(image_file)
                image_extension = os.path.splitext(image_file)[1]
                image_date = datetime.fromtimestamp(os.path.getmtime(image_file))

                # Calculate image hash
                with open(image_file, "rb") as f:
                    image_data = f.read()
                    image_hash = hashlib.sha256(image_data).hexdigest()

                # Insert image details into image_details table
                cur.execute("INSERT INTO image_details (relative_location, image_name, image_valid, image_size, image_dimensions, "
                            "image_extension, image_date, image_hash, image_deleted) "
                            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                            (relative_location, image_name, valid_file, image_size, image_dimensions, image_extension,
                            image_date, image_hash, False))


                # Insert unique image hash into unique_image_hashes table (if not already present)
                cur.execute("INSERT INTO unique_image_hashes (image_hash) VALUES (%s) ON CONFLICT DO NOTHING",
                            (image_hash,))
                
                # Commit changes
                if commit:
                    conn.commit()
    
    return True
