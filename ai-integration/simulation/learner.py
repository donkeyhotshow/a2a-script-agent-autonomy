"""
ML Learning module for rnj-L simulation
Handles embedding generation and FAISS index management
"""
import os
import numpy as np
from typing import List, Optional, Tuple
from sentence_transformers import SentenceTransformer

from .storage import ConversationRecord, VectorIndex, ConversationStore
from .config import SimulationConfig, get_config


class EmbeddingLearner:
    """
    Manages embedding generation and FAISS index building
    Uses lightweight CPU-optimized models
    """
    
    def __init__(self, model_name: Optional[str] = None, config: Optional[SimulationConfig] = None):
        self.config = config or get_config()
        self.model_name = model_name or self.config.embedding_model
        self._model: Optional[SentenceTransformer] = None
        self._embedding_dim: Optional[int] = None
    
    @property
    def model(self) -> SentenceTransformer:
        """Lazy loading of the embedding model"""
        if self._model is None:
            print(f"Loading embedding model: {self.model_name}")
            self._model = SentenceTransformer(self.model_name)
            # Get embedding dimension
            test_embedding = self._model.encode("test", show_progress_bar=False)
            self._embedding_dim = len(test_embedding)
            print(f"Model loaded. Embedding dimension: {self._embedding_dim}")
        return self._model
    
    @property
    def embedding_dim(self) -> int:
        """Get embedding dimension"""
        if self._embedding_dim is None:
            # Trigger model loading
            _ = self.model
        return self._embedding_dim
    
    def encode(self, texts: List[str], show_progress: bool = False) -> np.ndarray:
        """
        Generate embeddings for a list of texts
        
        Args:
            texts: List of text strings to encode
            show_progress: Whether to show progress bar
            
        Returns:
            numpy array of shape (len(texts), embedding_dim)
        """
        if not texts:
            return np.array([]).reshape(0, self.embedding_dim)
        
        # Encode texts
        embeddings = self.model.encode(
            texts, 
            show_progress_bar=show_progress,
            convert_to_numpy=True
        )
        
        return embeddings
    
    def encode_single(self, text: str) -> np.ndarray:
        """Generate embedding for a single text"""
        embeddings = self.encode([text], show_progress=False)
        return embeddings[0]
    
    def build_index(self, records: List[ConversationRecord]) -> VectorIndex:
        """
        Build FAISS index from conversation records
        
        Args:
            records: List of conversation records
            
        Returns:
            VectorIndex with FAISS index and metadata
        """
        import faiss
        
        if not records:
            # Return empty index
            return VectorIndex(
                embeddings=np.array([]).reshape(0, self.embedding_dim),
                record_ids=[],
                faiss_index=None
            )
        
        # Extract prompts and generate embeddings
        prompts = [r.prompt_text for r in records]
        print(f"Generating embeddings for {len(prompts)} records...")
        embeddings = self.encode(prompts, show_progress=True)
        
        # Create FAISS index
        print("Building FAISS index...")
        
        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(embeddings)
        
        # Create index
        index = faiss.IndexFlatIP(self.embedding_dim)  # Inner product = cosine similarity for normalized vectors
        
        # Add embeddings to index
        index.add(embeddings)
        
        # Extract record IDs
        record_ids = [r.id for r in records]
        
        print(f"Index built with {index.ntotal} vectors")
        
        return VectorIndex(
            embeddings=embeddings,
            record_ids=record_ids,
            faiss_index=index
        )
    
    def update_index(self, new_records: List[ConversationRecord], 
                     existing_index: Optional[VectorIndex] = None) -> VectorIndex:
        """
        Incrementally update index with new records
        
        Args:
            new_records: New records to add
            existing_index: Existing index to update (if None, builds new index)
            
        Returns:
            Updated VectorIndex
        """
        import faiss
        
        if existing_index is None or existing_index.is_empty():
            # Build new index
            return self.build_index(new_records)
        
        if not new_records:
            return existing_index
        
        # Generate embeddings for new records
        prompts = [r.prompt_text for r in new_records]
        print(f"Generating embeddings for {len(prompts)} new records...")
        new_embeddings = self.encode(prompts, show_progress=True)
        
        # Normalize
        faiss.normalize_L2(new_embeddings)
        
        # Add to existing index
        existing_index.faiss_index.add(new_embeddings)
        
        # Update metadata
        existing_index.embeddings = np.vstack([existing_index.embeddings, new_embeddings])
        existing_index.record_ids.extend([r.id for r in new_records])
        
        print(f"Index updated. Total vectors: {existing_index.faiss_index.ntotal}")
        
        return existing_index
    
    def search_similar(self, query: str, index: VectorIndex, k: int = 5) -> Tuple[List[str], List[float]]:
        """
        Search for similar prompts in the index
        
        Args:
            query: Query text
            index: FAISS index to search
            k: Number of nearest neighbors
            
        Returns:
            Tuple of (record_ids, distances)
        """
        if index.is_empty() or index.faiss_index is None:
            return [], []
        
        # Generate query embedding
        query_embedding = self.encode_single(query)
        
        # Normalize
        import faiss
        query_embedding = query_embedding.reshape(1, -1)
        faiss.normalize_L2(query_embedding)
        
        # Search
        k = min(k, len(index))
        distances, indices = index.faiss_index.search(query_embedding, k)
        
        # Get record IDs
        record_ids = [index.record_ids[i] for i in indices[0]]
        
        # Convert distances to similarity scores (0-1 range)
        # FAISS returns inner products for normalized vectors = cosine similarity
        similarities = distances[0].tolist()
        
        return record_ids, similarities
    
    def compute_similarity(self, text1: str, text2: str) -> float:
        """
        Compute cosine similarity between two texts
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Cosine similarity score (0-1)
        """
        embeddings = self.encode([text1, text2], show_progress=False)
        
        # Compute cosine similarity
        norm1 = np.linalg.norm(embeddings[0])
        norm2 = np.linalg.norm(embeddings[1])
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        similarity = np.dot(embeddings[0], embeddings[1]) / (norm1 * norm2)
        
        # Convert to 0-1 range (cosine similarity is -1 to 1)
        return (similarity + 1) / 2
    
    def get_stats(self) -> dict:
        """Get learner statistics"""
        return {
            "model_name": self.model_name,
            "embedding_dim": self.embedding_dim if self._embedding_dim else None,
            "model_loaded": self._model is not None
        }


def build_index_from_history(learner: Optional[EmbeddingLearner] = None) -> Optional[VectorIndex]:
    """
    Build index from all rnj-1 history
    
    Args:
        learner: EmbeddingLearner instance (created if None)
        
    Returns:
        VectorIndex or None if no history
    """
    store = ConversationStore()
    history = store.get_rnj1_history()
    
    if not history:
        print("No rnj-1 history found")
        return None
    
    print(f"Building index from {len(history)} rnj-1 records...")
    
    if learner is None:
        learner = EmbeddingLearner()
    
    index = learner.build_index(history)
    
    # Save index
    store.save_index(index)
    
    return index


def update_index_with_new_records(learner: Optional[EmbeddingLearner] = None) -> Optional[VectorIndex]:
    """
    Update index with new records since last index build
    
    Args:
        learner: EmbeddingLearner instance (created if None)
        
    Returns:
        Updated VectorIndex
    """
    store = ConversationStore()
    
    # Load existing index
    existing_index = store.load_index()
    
    # Get records not in index
    if existing_index and existing_index.record_ids:
        all_records = store.get_rnj1_history()
        existing_ids = set(existing_index.record_ids)
        new_records = [r for r in all_records if r.id not in existing_ids]
    else:
        # No existing index, build from all history
        return build_index_from_history(learner)
    
    if not new_records:
        print("No new records to add")
        return existing_index
    
    print(f"Adding {len(new_records)} new records to index...")
    
    if learner is None:
        learner = EmbeddingLearner()
    
    updated_index = learner.update_index(new_records, existing_index)
    
    # Save updated index
    store.save_index(updated_index)
    
    return updated_index
