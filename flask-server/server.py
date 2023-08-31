from flask import Flask, request, jsonify
from flask_cors import CORS

# clustering
import os
import shutil
import psycopg
import numpy as np
from pathlib import Path
from torch import Tensor
from sentence_transformers import SentenceTransformer, util

# custom
from utils import community_detection
from postgres_encoding import batch_encode_images


app = Flask(__name__)
CORS(app)  # Add CORS support to allow cross-origin requests

model = None

host = os.getenv("POSTGRES_HOST")
dbname = os.getenv("POSTGRES_DB")
user = os.getenv("POSTGRES_USER")
password = os.getenv("POSTGRES_PASSWORD")

root_directory = os.getenv("ROOT_PATH")
image_directory = 'images'
delete_directory = 'deleted'

batch_size = os.getenv("BATCH_SIZE")
clip_path = os.getenv("CLIP_PATH")


@app.route('/api/duplicates/encode', methods=['GET', 'OPTIONS'])
def duplicates_encode():
    if request.method == 'OPTIONS':
        # Respond to the preflight request
        response = jsonify({'message': 'Preflight request success'})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
    
    success = batch_encode_images(root_directory, image_directory,
                                  host, dbname, user, password, batch_size, clip_path)

    if success:
        message = None
    else:
        message = "Environment variable BATCH_SIZE is not an integer!"
    
    return jsonify({'success': success, 'message': message})

@app.route('/api/duplicates/clusters', methods=['POST', 'OPTIONS'])  # Allow both POST and OPTIONS requests
def duplicates_clusters():
    if request.method == 'OPTIONS':
        # Respond to the preflight request
        response = jsonify({'message': 'Preflight request success'})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
    
    data = request.get_json()  # Get input data from the request
    
    thresh = float(data['threshold'])
    search_string = data['search_string']
    min_community_size = 2
    init_max_size = 1000

    # Connect to the PostgreSQL database
    with psycopg.connect(host=host,
                         dbname=dbname,
                         user=user,
                         password=password) as conn:
        # Create a cursor
        with conn.cursor() as cur:
            # Retrieve the embeddings and relative locations that match the search string
            cur.execute("SELECT embedding, relative_location FROM image_embeddings WHERE relative_location LIKE %s",
                        ('%' + search_string + '%',))
            rows = cur.fetchall()

            # Separate embeddings and relative locations into lists
            embeddings = [np.frombuffer(row[0], dtype=np.float32, count=512).reshape(1, -1) for row in rows if row[0] is not None]
            file_locations = [row[1] for row in rows if row[0] is not None]
    
    if embeddings:
        concatenated_embeddings = np.concatenate(embeddings, axis=0)
        
        init_max_size = min(len(concatenated_embeddings), init_max_size)
        unique_communities = community_detection(concatenated_embeddings,
                                                 threshold=thresh,
                                                 min_community_size=min_community_size,
                                                 init_max_size=init_max_size)
    else:
        unique_communities = []
    
    return jsonify({'clusters': unique_communities, 'file_locations': file_locations})

@app.route('/api/duplicates/pruning', methods=['POST', 'OPTIONS'])  # Allow both POST and OPTIONS requests
def duplicates_pruning():
    if request.method == 'OPTIONS':
        # Respond to the preflight request
        response = jsonify({'message': 'Preflight request success'})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
    
    file_locations = request.get_json()
    file_locations_array = "{" + ",".join(file_locations) + "}"

    # Set up your PostgreSQL connection
    with psycopg.connect(host=host,
                         dbname=dbname,
                         user=user,
                         password=password) as conn:
        # Create a cursor
        with conn.cursor() as cur:           
            cur.execute("""
                SELECT relative_location, image_name, image_size, image_dimensions, image_extension, image_date, image_deleted
                FROM image_details WHERE relative_location = ANY(%s)
            """, (file_locations_array,))
            
            rows = cur.fetchall()

    # Extract the columns from the fetched rows
    relative_locations = [row[0] for row in rows]
    image_names = [row[1] for row in rows]
    image_sizes = [row[2] for row in rows]
    image_dimensions = [row[3] for row in rows]
    image_extensions = [row[4] for row in rows]
    image_dates = [row[5] for row in rows]
    image_deleteds = [row[6] for row in rows]
    
    full_locations = [os.path.join([image_directory, delete_directory][deleted], relative_location)
                      for relative_location, deleted in zip(relative_locations, image_deleteds)]

    # Create the response data
    response = {
        'relative_locations': relative_locations,
        'full_locations': full_locations,
        'image_names': image_names,
        'image_sizes': image_sizes,
        'image_dimensions': image_dimensions,
        'image_extensions': image_extensions,
        'image_dates': image_dates,
        'image_deleteds': image_deleteds
    }
    
    return jsonify(response)

@app.route('/api/duplicates/delete', methods=['POST', 'OPTIONS'])  # Allow both POST and OPTIONS requests
def duplicate_delete():
    if request.method == 'OPTIONS':
        # Respond to the preflight request
        response = jsonify({'message': 'Preflight request success'})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
        
    file_locations = request.get_json()
    
    # Set up your PostgreSQL connection
    with psycopg.connect(host=host,
                         dbname=dbname,
                         user=user,
                         password=password) as conn:
        # Create a cursor
        with conn.cursor() as cur:
            for file_location in file_locations:
                restored_path = os.path.join(root_directory, image_directory, file_location)
                deleted_path = os.path.join(root_directory, delete_directory, file_location)
                path = Path(deleted_path)
                path.parent.mkdir(parents=True, exist_ok=True)
                os.rename(restored_path, deleted_path)
                
                cur.execute(
                    """
                    UPDATE image_details
                    SET image_deleted = True
                    WHERE relative_location = %s
                    """,
                    (file_location,)
                )
            
            conn.commit()
    
    return jsonify({'success': True})

@app.route('/api/duplicates/perma_delete', methods=['DELETE', 'OPTIONS'])  # Allow both DELETE and OPTIONS requests
def duplicate_perma_delete():
    if request.method == 'OPTIONS':
        # Respond to the preflight request
        response = jsonify({'message': 'Preflight request success'})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
    
    # Set up your PostgreSQL connection
    with psycopg.connect(host=host,
                         dbname=dbname,
                         user=user,
                         password=password) as conn:
        # Create a cursor
        with conn.cursor() as cur:
            deleted_directory = os.path.join(root_directory, delete_directory)
            path = Path(deleted_directory)
            shutil.rmtree(path)
            path.mkdir(parents=True, exist_ok=True)
            
            cur.execute(
                """
                SELECT relative_location
                FROM image_details
                WHERE image_deleted = True
                """
            )
            
            rows = cur.fetchall()
            file_locations = "{" + ",".join([row[0] for row in rows]) + "}"
            
            cur.execute(
                """
                DELETE FROM image_details
                WHERE relative_location = ANY(%s)
                """,
                (file_locations,)
            )
            
            cur.execute(
                """
                DELETE FROM image_embeddings
                WHERE relative_location = ANY(%s)
                """,
                (file_locations,)
            )
            
            conn.commit()
    
    return jsonify({'success': True})

@app.route('/api/duplicates/restore', methods=['POST', 'OPTIONS'])  # Allow both POST and OPTIONS requests
def duplicate_restore():
    if request.method == 'OPTIONS':
        # Respond to the preflight request
        response = jsonify({'message': 'Preflight request success'})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
        
    file_locations = request.get_json()
    
    # Set up your PostgreSQL connection
    with psycopg.connect(host=host,
                         dbname=dbname,
                         user=user,
                         password=password) as conn:
        # Create a cursor
        with conn.cursor() as cur:
            for file_location in file_locations:
                restored_path = os.path.join(root_directory, image_directory, file_location)
                deleted_path = os.path.join(root_directory, delete_directory, file_location)
                path = Path(restored_path)
                path.parent.mkdir(parents=True, exist_ok=True)
                os.rename(deleted_path, restored_path)
                
                cur.execute(
                    """
                    UPDATE image_details
                    SET image_deleted = False
                    WHERE relative_location = %s
                    """,
                    (file_location,)
                )
            
            conn.commit()
    
    return jsonify({'success': True})

@app.route('/api/duplicates/rename', methods=['POST', 'OPTIONS'])  # Allow both POST and OPTIONS requests
def duplicate_rename():
    if request.method == 'OPTIONS':
        # Respond to the preflight request
        response = jsonify({'message': 'Preflight request success'})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
    
    data = request.get_json()
    
    new_name = data['new_name']
    old_relative_location = data['old_relative_location']
    
    old_reloc_path = Path(old_relative_location)
    new_relative_location = old_reloc_path.with_name(new_name).as_posix()
    
    old_path = os.path.join(root_directory, image_directory, old_relative_location)
    new_path = os.path.join(root_directory, image_directory, new_relative_location)
    
    if not os.path.exists(new_path):
        to_return = True
        os.rename(old_path, new_path)
        
        with psycopg.connect(host=host,
                             dbname=dbname,
                             user=user,
                             password=password) as conn:
            # Create a cursor
            with conn.cursor() as cur:
                cur.execute(
                        """
                        UPDATE image_details
                        SET relative_location = %s,
                            image_name = %s
                        WHERE relative_location = %s
                        """,
                        (new_relative_location, new_name, old_relative_location)
                    )
                
                cur.execute(
                        """
                        UPDATE image_embeddings
                        SET relative_location = %s
                        WHERE relative_location = %s
                        """,
                        (new_relative_location, old_relative_location)
                    )
                
                conn.commit()
    else:
        to_return = False
    
    return jsonify({'success': to_return})

@app.route('/api/duplicates/load_model', methods=['GET'])  # Allow both POST and OPTIONS requests
def duplicates_load_model():
    global model
    
    # Load the tokenizer and model
    model_name = "clip-ViT-B-32"
    model = SentenceTransformer(model_name, cache_folder=clip_path)
    return jsonify({'success': True})

@app.route('/api/duplicates/unload_model', methods=['GET'])  # Allow both POST and OPTIONS requests
def duplicates_unload_model():
    global model
    
    # Unload the tokenizer and model
    print('Unloading duplicates model!')
    model = None
    return jsonify({'success': True})

@app.route('/api/duplicates/text_search', methods=['POST', 'OPTIONS'])  # Allow both POST and OPTIONS requests
def duplicates_text_search():
    if request.method == 'OPTIONS':
        # Respond to the preflight request
        response = jsonify({'message': 'Preflight request success'})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
    
    data = request.get_json()
    
    text_input = data['text_input']
    search_string = data['search_string']
    
    text_emb = model.encode([text_input], convert_to_tensor=True)

    # Connect to the PostgreSQL database
    with psycopg.connect(host=host,
                         dbname=dbname,
                         user=user,
                         password=password) as conn:
        # Create a cursor
        with conn.cursor() as cur:
            # Retrieve the embeddings and relative locations that match the search string
            cur.execute("SELECT embedding, relative_location FROM image_embeddings WHERE relative_location LIKE %s",
                        ('%' + search_string + '%',))
            rows = cur.fetchall()

            # Separate embeddings and relative locations into lists
            embeddings = [np.frombuffer(row[0], dtype=np.float32, count=512).reshape(1, -1) for row in rows if row[0] is not None]
            file_locations = [row[1] for row in rows if row[0] is not None]
    
    if embeddings:
        concatenated_embeddings = Tensor(np.concatenate(embeddings, axis=0)).to(text_emb.device)
        
        cos_scores = util.cos_sim(concatenated_embeddings, text_emb).cpu().numpy().tolist()
        sorted_scores = sorted(enumerate(cos_scores), key=lambda x: x[1], reverse=True)
    else:
        sorted_scores = []
    
    return jsonify({
        'image_directory': image_directory,
        'sorted_scores': sorted_scores,
        'file_locations': file_locations,
        'root_directory': image_directory})
    