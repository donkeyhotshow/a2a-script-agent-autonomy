"""
Storage layer for rnj-L simulation system
Handles conversation records and vector index persistence
"""
import os
import json
import shutil
import uuid
import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
import numpy as np

from .config import get_config, SimulationConfig


@dataclass
class ConversationRecord:
    """Record of a single conversation interaction"""
    id: str
    timestamp: float
    model: str  # "rnj-1" or "rnj-L"
    prompt_text: str
    response_text: str
    prompt_embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "model": self.model,
            "prompt_text": self.prompt_text,
            "response_text": self.response_text,
            "prompt_embedding": self.prompt_embedding,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConversationRecord":
        """Create from dictionary"""
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            timestamp=data.get("timestamp", datetime.datetime.now().timestamp()),
            model=data.get("model", "unknown"),
            prompt_text=data.get("prompt_text", ""),
            response_text=data.get("response_text", ""),
            prompt_embedding=data.get("prompt_embedding"),
            metadata=data.get("metadata", {})
        )


@dataclass
class VectorIndex:
    """FAISS index wrapper with metadata"""
    embeddings: np.ndarray  # Shape: (n_samples, embedding_dim)
    record_ids: List[str]   # Parallel array of record IDs
    faiss_index: Any = None  # FAISS index object
    
    def __len__(self) -> int:
        return len(self.record_ids) if self.record_ids else 0
    
    def is_empty(self) -> bool:
        return len(self) == 0


class ConversationStore:
    """Manages conversation records and vector index storage"""
    
    def __init__(self, config: Optional[SimulationConfig] = None):
        self.config = config or get_config()
        self._ensure_directories()
    
    def _ensure_directories(self) -> None:
        """Create necessary directories if they don't exist"""
        os.makedirs(self.config.records_path, exist_ok=True)
        os.makedirs(self.config.backup_path, exist_ok=True)
    
    def add(self, record: ConversationRecord) -> None:
        """Save a conversation record to disk"""
        # Generate unique filename
        timestamp = int(record.timestamp)
        filename = f"record_{timestamp}_{record.id}.json"
        filepath = os.path.join(self.config.records_path, filename)
        
        # Save record
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(record.to_dict(), f, indent=2, ensure_ascii=False)
    
    def get_all(self, model: Optional[str] = None) -> List[ConversationRecord]:
        """Load all conversation records, optionally filtered by model"""
        records = []
        
        if not os.path.exists(self.config.records_path):
            return records
        
        for filename in os.listdir(self.config.records_path):
            if not filename.endswith('.json'):
                continue
            
            filepath = os.path.join(self.config.records_path, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    record = ConversationRecord.from_dict(data)
                    
                    # Filter by model if specified
                    if model is None or record.model == model:
                        records.append(record)
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Could not load record {filename}: {e}")
                continue
        
        # Sort by timestamp
        records.sort(key=lambda r: return records
    
    r.timestamp)
        def get_since(self, timestamp: float) -> List[ConversationRecord]:
        """Get records created after a specific timestamp"""
        all_records = self.get_all()
        return [r for r in all_records if r.timestamp > timestamp]
    
    def get_rnj1_history(self) -> List[ConversationRecord]:
        """Get all rnj-1 interaction history"""
        return self.get_all(model=self.config.target_model)
    
    def get_count(self, model: Optional[str] = None) -> int:
        """Get count of records, optionally filtered by model"""
        if model is None:
            return len([f for f in os.listdir(self.config.records_path) 
                       if f.endswith('.json')])
        
        count = 0
        for record in self.get_all():
            if record.model == model:
                count += 1
        return count
    
    def save_index(self, index: VectorIndex) -> None:
        """Save FAISS index to disk"""
        import faiss
        
        # Save FAISS index
        faiss.write_index(index.faiss_index, self.config.vector_index_path)
        
        # Save metadata
        metadata = {
            "record_ids": index.record_ids,
            "embedding_dim": index.embeddings.shape[1] if len(index.embeddings) > 0 else 0,
            "count": len(index)
        }
        metadata_path = self.config.vector_index_path + ".meta.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
    
    def load_index(self) -> Optional[VectorIndex]:
        """Load FAISS index from disk"""
        import faiss
        
        if not os.path.exists(self.config.vector_index_path):
            return None
        
        try:
            # Load FAISS index
            faiss_index = faiss.read_index(self.config.vector_index_path)
            
            # Load metadata
            metadata_path = self.config.vector_index_path + ".meta.json"
            record_ids = []
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                    record_ids = metadata.get("record_ids", [])
            
            # Reconstruct embeddings array
            n_total = faiss_index.ntotal
            if n_total > 0:
                # Extract embeddings from index
                embeddings = faiss_index.reconstruct_n(0, n_total)
            else:
                embeddings = np.array([])
            
            return VectorIndex(
                embeddings=embeddings,
                record_ids=record_ids,
                faiss_index=faiss_index
            )
        except Exception as e:
            print(f"Error loading index: {e}")
            return None
    
    def index_exists(self) -> bool:
        """Check if vector index exists"""
        return os.path.exists(self.config.vector_index_path)
    
    def backup(self) -> str:
        """Create backup of all data"""
        timestamp = int(datetime.datetime.now().timestamp())
        backup_dir = os.path.join(self.config.backup_path, f"backup_{timestamp}")
        os.makedirs(backup_dir, exist_ok=True)
        
        # Backup records
        records_backup = os.path.join(backup_dir, "records")
        if os.path.exists(self.config.records_path):
            shutil.copytree(self.config.records_path, records_backup)
        
        # Backup index
        if os.path.exists(self.config.vector_index_path):
            shutil.copy2(self.config.vector_index_path, backup_dir)
            meta_path = self.config.vector_index_path + ".meta.json"
            if os.path.exists(meta_path):
                shutil.copy2(meta_path, backup_dir)
        
        # Backup config
        if os.path.exists(self.config.config_path):
            shutil.copy2(self.config.config_path, backup_dir)
        
        return backup_dir
    
    def get_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        return {
            "total_records": self.get_count(),
            "rnj1_records": self.get_count(self.config.target_model),
            "rnjL_records": self.get_count(self.config.simulated_model),
            "index_exists": self.index_exists(),
            "records_path": self.config.records_path,
            "index_path": self.config.vector_index_path
        }
    
    def clear_all(self) -> None:
        """Clear all records and index (use with caution)"""
        # Clear records
        if os.path.exists(self.config.records_path):
            shutil.rmtree(self.config.records_path)
            os.makedirs(self.config.records_path, exist_ok=True)
        
        # Clear index
        if os.path.exists(self.config.vector_index_path):
            os.remove(self.config.vector_index_path)
        meta_path = self.config.vector_index_path + ".meta.json"
        if os.path.exists(meta_path):
            os.remove(meta_path)


def save_record(record: ConversationRecord, path: str) -> None:
    """Standalone function to save a record"""
    store = ConversationStore()
    store.add(record)


def load_records(path: str, model_filter: Optional[str] = None) -> List[ConversationRecord]:
    """Standalone function to load records"""
    store = ConversationStore()
    if model_filter:
        return store.get_all(model_filter)
    return store.get_all()


def get_rnj1_history() -> List[ConversationRecord]:
    """Get all rnj-1 interaction history"""
    store = ConversationStore()
    return store.get_rnj1_history()
