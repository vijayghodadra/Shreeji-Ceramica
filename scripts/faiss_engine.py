import os
import json
import numpy as np
import faiss
import google.generativeai as genai
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import sys
import io
import re

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("VITE_GEMINI_API_KEY"))

INDEX_PATH = "faiss_index.idx"
METADATA_PATH = "faiss_metadata.json"

app = Flask(__name__)
CORS(app)

class SearchEngine:
    def __init__(self):
        self.index = None
        self.metadata = []
        self.load()

    def load(self):
        if os.path.exists(INDEX_PATH) and os.path.exists(METADATA_PATH):
            print("Loading index...", flush=True)
            try:
                self.index = faiss.read_index(INDEX_PATH)
                with open(METADATA_PATH, 'r', encoding='utf-8') as f:
                    self.metadata = json.load(f)
                print(f"Loaded {len(self.metadata)} products.", flush=True)
            except Exception as e:
                print(f"Error loading: {e}", flush=True)

    def build_index(self):
        print("Starting full indexing...", flush=True)
        all_products = []
        # Load products from local JSON files
        for brand, fpath in [('AQUANT', './src/data/aquant_products.json'), ('KOHLER', './src/data/products.json')]:
            if os.path.exists(fpath):
                with open(fpath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for p in data:
                        p['brand'] = brand
                        all_products.append(p)

        if not all_products:
            print("No data found!", flush=True)
            return
            
        print(f"Total products to process: {len(all_products)}", flush=True)
        
        batch_size = 50
        embeddings = []
        self.metadata = []
        total_batches = (len(all_products) - 1) // batch_size + 1

        for i in range(0, len(all_products), batch_size):
            batch = all_products[i : i + batch_size]
            # Construct text representation for embedding
            texts = [f"{p.get('productCode', '')} {p.get('productName', '')} {p.get('color', '')} {p.get('brand', '')}" for p in batch]
            
            curr_batch = (i // batch_size) + 1
            print(f"Processing Batch {curr_batch}/{total_batches}...", flush=True)
            
            backoff = 35
            success = False
            while not success:
                try:
                    result = genai.embed_content(
                        model="models/gemini-embedding-001",
                        content=texts,
                        task_type="retrieval_document"
                    )
                    embeddings.extend(result['embedding'])
                    self.metadata.extend(batch)
                    success = True
                except Exception as e:
                    if "429" in str(e):
                        print(f"Quota hit. Waiting {backoff}s...", flush=True)
                        time.sleep(backoff)
                        backoff = min(backoff + 25, 120)
                    else:
                        print(f"CRITICAL ERROR at Batch {curr_batch}: {e}", flush=True)
                        break
            
            time.sleep(2) # Base delay

            # Periodic persistence to avoid data loss
            if curr_batch % 5 == 0:
                print(f"Checkpoint save: {len(self.metadata)} products indexed.", flush=True)
                v_tmp = np.array(embeddings).astype('float32')
                i_tmp = faiss.IndexFlatIP(v_tmp.shape[1])
                faiss.normalize_L2(v_tmp)
                i_tmp.add(v_tmp)
                faiss.write_index(i_tmp, INDEX_PATH)
                with open(METADATA_PATH, 'w', encoding='utf-8') as f:
                    json.dump(self.metadata, f, indent=2)
                self.index = i_tmp

        if not embeddings: return
        
        final_vectors = np.array(embeddings).astype('float32')
        self.index = faiss.IndexFlatIP(final_vectors.shape[1])
        faiss.normalize_L2(final_vectors)
        self.index.add(final_vectors)
        
        faiss.write_index(self.index, INDEX_PATH)
        with open(METADATA_PATH, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, indent=2)
            
        print(f"FULL INDEXING COMPLETE! {len(self.metadata)} products searchable.", flush=True)

    def search(self, query, brand_filter=None, top_k=10):
        if not self.metadata:
            return []
            
        # Normalize search query
        q_clean = query.strip().upper()
        q_norm = re.sub(r'[^A-Z0-9]', '', q_clean)
        
        # 1. EXACT/STRATEGIC MATCHES (BOOSTED)
        exact_results = []
        for p in self.metadata:
            if brand_filter and p.get('brand') != brand_filter:
                continue
            
            code = str(p.get('productCode', '')).upper()
            code_norm = re.sub(r'[^A-Z0-9]', '', code)
            
            if q_norm == code_norm:
                p_copy = p.copy()
                p_copy['similarity'] = 2.0 # Force to top
                exact_results.append(p_copy)
            elif q_norm in code_norm and len(q_norm) >= 3:
                p_copy = p.copy()
                p_copy['similarity'] = 1.2 # Strong partial match
                exact_results.append(p_copy)
                
        # 2. SEMANTIC SEARCH (VECTOR)
        semantic_results = []
        if self.index is not None:
            try:
                res = genai.embed_content(
                    model="models/gemini-embedding-001",
                    content=query,
                    task_type="retrieval_query"
                )
                qv = np.array([res['embedding']]).astype('float32')
                faiss.normalize_L2(qv)
                scores, indices = self.index.search(qv, top_k * 5)
                
                for s, idx in zip(scores[0], indices[0]):
                    if idx < 0 or idx >= len(self.metadata): continue
                    p = self.metadata[idx]
                    
                    if brand_filter and p.get('brand') != brand_filter:
                        continue
                        
                    # Skip if already in exact matches
                    if any(e.get('productCode') == p.get('productCode') for e in exact_results):
                        continue
                        
                    p_copy = p.copy()
                    p_copy['similarity'] = float(s)
                    semantic_results.append(p_copy)
            except Exception as e:
                print(f"Semantic search error: {e}", flush=True)

        combined = exact_results + semantic_results
        combined.sort(key=lambda x: x['similarity'], reverse=True)
        return combined[:top_k]

engine = SearchEngine()

@app.route('/index', methods=['POST'])
def run_indexing():
    import threading
    threading.Thread(target=engine.build_index).start()
    return jsonify({"status": "indexing_started"})

@app.route('/search', methods=['GET'])
def search_api():
    q = request.args.get('q', '')
    b = request.args.get('brand', None)
    if not q: return jsonify([])
    return jsonify(engine.search(q, brand_filter=b))

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok", 
        "indexed_count": len(engine.metadata),
        "total_expected": 2820
    })

if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    if len(sys.argv) > 1 and sys.argv[1] == "index":
        engine.build_index()
    else:
        app.run(port=5001, debug=False)
