"""
Elasticsearch Memory Backend
===========================

Inspired by: "Why Elasticsearch Is the Best Memory for AI Agents: A Deep Dive into Agentic Architecture"
Source: dev.to/omkar598/why-elasticsearch-is-the-best-memory-for-ai-agents-a-deep-dive-into-agentic-architecture-137l

Core Philosophy:
- Elasticsearch excels at temporal analytics (episodic memory)
- Semantic/Vector Search enables meaning retrieval (semantic memory)
- Native support for complex aggregations and time-based queries
- Horizontal scalability and real-time search capabilities
- Built-in relevance scoring for intelligent retrieval

This module implements a comprehensive memory backend using Elasticsearch,
supporting episodic memory, semantic memory, and temporal analytics.
"""

import json
import uuid
from datetime import datetime, timedelta
from typing import Any, Optional
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod

try:
    from elasticsearch import Elasticsearch, NotFoundError
    ES_AVAILABLE = True
except ImportError:
    ES_AVAILABLE = False


class MemoryType(Enum):
    """Types of memory supported."""
    EPISODIC = "episodic"       # Specific past experiences
    SEMANTIC = "semantic"       # General knowledge and facts
    PROCEDURAL = "procedural"   # How to do things
    WORKING = "working"          # Current context
    VECTOR = "vector"           # Embedding-based semantic search


@dataclass
class MemoryEntry:
    """A single memory entry."""
    memory_id: str
    content: str
    memory_type: MemoryType
    agent_id: str
    session_id: str
    task_id: Optional[str]
    created_at: str
    updated_at: str
    importance: float  # 0.0 - 1.0
    access_count: int = 0
    last_accessed: Optional[str] = None
    embedding: Optional[list[float]] = None
    metadata: dict = field(default_factory=dict)
    tags: list[str] = field(default_factory=list)
    entities: list[dict] = field(default_factory=list)  # Extracted entities
    expires_at: Optional[str] = None


@dataclass
class MemorySearchResult:
    """Result from memory search."""
    entry: MemoryEntry
    score: float
    highlights: list[str]


@dataclass
class MemoryAnalytics:
    """Analytics about memory usage."""
    total_memories: int
    by_type: dict
    by_agent: dict
    recent_access_patterns: dict
    memory_health: dict


@dataclass
class TemporalInsight:
    """Insight from temporal analysis."""
    insight_type: str
    description: str
    evidence: list[str]
    timestamp: str


class MemoryBackend(ABC):
    """Abstract base class for memory backends."""

    @abstractmethod
    async def store(self, entry: MemoryEntry) -> str:
        """Store a memory entry."""
        pass

    @abstractmethod
    async def retrieve(self, memory_id: str) -> Optional[MemoryEntry]:
        """Retrieve a specific memory."""
        pass

    @abstractmethod
    async def search(
        self,
        query: str,
        memory_type: Optional[MemoryType] = None,
        agent_id: Optional[str] = None,
        limit: int = 10
    ) -> list[MemorySearchResult]:
        """Search memories."""
        pass


class ElasticsearchMemoryBackend(MemoryBackend):
    """
    Elasticsearch-based memory backend for AI agents.

    Features:
    - Multi-type memory storage (episodic, semantic, procedural, working, vector)
    - Semantic search using vector embeddings
    - Temporal analytics and pattern detection
    - Real-time indexing and search
    - Horizontal scalability
    """

    # Index names
    INDEX_PREFIX = "agent_memory"
    INDEX_TYPES = {
        MemoryType.EPISODIC: f"{INDEX_PREFIX}_episodic",
        MemoryType.SEMANTIC: f"{INDEX_PREFIX}_semantic",
        MemoryType.PROCEDURAL: f"{INDEX_PREFIX}_procedural",
        MemoryType.WORKING: f"{INDEX_PREFIX}_working",
        MemoryType.VECTOR: f"{INDEX_PREFIX}_vector"
    }

    # Unified index for cross-type queries
    UNIFIED_INDEX = f"{INDEX_PREFIX}_unified"

    def __init__(
        self,
        hosts: Optional[list[str]] = None,
        api_key: Optional[str] = None,
        cloud_id: Optional[str] = None,
        index_prefix: Optional[str] = None,
        enable_vector_search: bool = True,
        vector_dimension: int = 1536,
        embedding_model: str = "openai/text-embedding-ada-002"
    ):
        """
        Initialize the Elasticsearch Memory Backend.

        Args:
            hosts: List of Elasticsearch hosts
            api_key: API key for authentication
            cloud_id: Elastic Cloud ID
            index_prefix: Prefix for all index names
            enable_vector_search: Whether to enable vector search
            vector_dimension: Dimension of embeddings
            embedding_model: Model for generating embeddings
        """
        if not ES_AVAILABLE:
            raise ImportError("elasticsearch package not installed")

        self.hosts = hosts or ["http://localhost:9200"]
        self.enable_vector_search = enable_vector_search
        self.vector_dimension = vector_dimension
        self.embedding_model = embedding_model

        if index_prefix:
            self.INDEX_PREFIX = index_prefix
            self.INDEX_TYPES = {k: f"{index_prefix}_{v.value}" for k, v in MemoryType.__members__.items()}
            self.UNIFIED_INDEX = f"{index_prefix}_unified"

        # Initialize client
        client_kwargs = {"hosts": self.hosts}
        if api_key:
            client_kwargs["api_key"] = api_key
        if cloud_id:
            client_kwargs["cloud_id"] = cloud_id

        self.client = Elasticsearch(**client_kwargs)

        # Create indices
        self._ensure_indices()

    def _ensure_indices(self) -> None:
        """Ensure all required indices exist with proper mappings."""
        # Unified index mapping
        unified_mapping = {
            "mappings": {
                "properties": {
                    "memory_id": {"type": "keyword"},
                    "content": {"type": "text", "analyzer": "standard"},
                    "memory_type": {"type": "keyword"},
                    "agent_id": {"type": "keyword"},
                    "session_id": {"type": "keyword"},
                    "task_id": {"type": "keyword"},
                    "created_at": {"type": "date"},
                    "updated_at": {"type": "date"},
                    "importance": {"type": "float"},
                    "access_count": {"type": "integer"},
                    "last_accessed": {"type": "date"},
                    "tags": {"type": "keyword"},
                    "entities": {
                        "type": "nested",
                        "properties": {
                            "type": {"type": "keyword"},
                            "value": {"type": "text"},
                            "confidence": {"type": "float"}
                        }
                    },
                    "expires_at": {"type": "date"},
                    "metadata": {"type": "object", "enabled": True}
                }
            },
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 0,
                "index": {
                    "refresh_interval": "1s"
                }
            }
        }

        # Vector index with dense vector field
        vector_mapping = {
            "mappings": {
                "properties": {
                    "memory_id": {"type": "keyword"},
                    "content": {"type": "text", "analyzer": "standard"},
                    "memory_type": {"type": "keyword"},
                    "agent_id": {"type": "keyword"},
                    "session_id": {"type": "keyword"},
                    "created_at": {"type": "date"},
                    "embedding": {
                        "type": "dense_vector",
                        "dims": self.vector_dimension,
                        "index": True,
                        "similarity": "cosine"
                    }
                }
            }
        }

        # Create indices
        for index_name in set(self.INDEX_TYPES.values()):
            if index_name.endswith("_vector"):
                mapping = vector_mapping
            else:
                mapping = unified_mapping

            if not self.client.indices.exists(index=index_name):
                self.client.indices.create(index=index_name, body=mapping)

    async def store(self, entry: MemoryEntry) -> str:
        """Store a memory entry."""
        entry.memory_id = entry.memory_id or f"mem_{uuid.uuid4().hex[:12]}"

        # Get the appropriate index
        index_name = self.INDEX_TYPES.get(entry.memory_type, self.UNIFIED_INDEX)

        # Generate embedding if vector search enabled
        if self.enable_vector_search and entry.embedding is None:
            entry.embedding = await self._generate_embedding(entry.content)

        # Prepare document
        doc = self._entry_to_doc(entry)

        # Store in type-specific index
        self.client.index(
            index=index_name,
            id=entry.memory_id,
            document=doc
        )

        # Also store in unified index for cross-type queries
        self.client.index(
            index=self.UNIFIED_INDEX,
            id=entry.memory_id,
            document=doc
        )

        return entry.memory_id

    async def retrieve(self, memory_id: str) -> Optional[MemoryEntry]:
        """Retrieve a specific memory."""
        try:
            result = self.client.get(index=self.UNIFIED_INDEX, id=memory_id)
            return self._doc_to_entry(result["_source"])
        except NotFoundError:
            return None

    async def search(
        self,
        query: str,
        memory_type: Optional[MemoryType] = None,
        agent_id: Optional[str] = None,
        session_id: Optional[str] = None,
        task_id: Optional[str] = None,
        tags: Optional[list[str]] = None,
        time_range: Optional[tuple[str, str]] = None,
        min_importance: float = 0.0,
        limit: int = 10,
        include_vector_results: bool = True
    ) -> list[MemorySearchResult]:
        """
        Search memories with various filters.

        Args:
            query: Text search query
            memory_type: Filter by memory type
            agent_id: Filter by agent
            session_id: Filter by session
            task_id: Filter by task
            tags: Filter by tags
            time_range: Tuple of (start_date, end_date)
            min_importance: Minimum importance score
            limit: Maximum results
            include_vector_results: Whether to include vector similarity results

        Returns:
            List of MemorySearchResult
        """
        results: list[MemorySearchResult] = []

        # Determine which indices to search
        indices = [self.UNIFIED_INDEX]
        if memory_type:
            type_index = self.INDEX_TYPES.get(memory_type)
            if type_index:
                indices = [type_index]

        # Build query
        must_clauses = [
            {"match": {"content": query}}
        ]

        # Add filters
        filter_clauses = []

        if agent_id:
            filter_clauses.append({"term": {"agent_id": agent_id}})
        if session_id:
            filter_clauses.append({"term": {"session_id": session_id}})
        if task_id:
            filter_clauses.append({"term": {"task_id": task_id}})
        if memory_type:
            filter_clauses.append({"term": {"memory_type": memory_type.value}})
        if min_importance > 0:
            filter_clauses.append({"range": {"importance": {"gte": min_importance}}})
        if tags:
            filter_clauses.append({"terms": {"tags": tags}})
        if time_range:
            filter_clauses.append({
                "range": {
                    "created_at": {
                        "gte": time_range[0],
                        "lte": time_range[1]
                    }
                }
            })

        # Execute search
        search_body = {
            "query": {
                "bool": {
                    "must": must_clauses,
                    "filter": filter_clauses
                }
            },
            "highlight": {
                "fields": {
                    "content": {
                        "fragment_size": 150,
                        "number_of_fragments": 3
                    }
                }
            },
            "size": limit,
            "sort": [
                {"_score": "desc"},
                {"importance": "desc"},
                {"created_at": "desc"}
            ]
        }

        response = self.client.search(index=",".join(indices), body=search_body)

        for hit in response["hits"]["hits"]:
            entry = self._doc_to_entry(hit["_source"])
            highlights = hit.get("highlight", {}).get("content", [])

            results.append(MemorySearchResult(
                entry=entry,
                score=hit["_score"],
                highlights=highlights
            ))

        # Also search vectors if enabled and query is complex
        if include_vector_results and self.enable_vector_search and len(query.split()) > 2:
            vector_results = await self._search_vectors(query, agent_id, limit)
            results.extend(vector_results)

        # Sort by score and deduplicate
        results.sort(key=lambda r: r.score, reverse=True)
        seen = set()
        unique_results = []
        for r in results:
            if r.entry.memory_id not in seen:
                seen.add(r.entry.memory_id)
                unique_results.append(r)

        return unique_results[:limit]

    async def search_vectors(
        self,
        embedding: list[float],
        agent_id: Optional[str] = None,
        limit: int = 10,
        min_similarity: float = 0.7
    ) -> list[MemorySearchResult]:
        """Search by vector similarity."""
        return await self._search_vectors("", agent_id, limit, embedding, min_similarity)

    async def get_episodic_memory(
        self,
        agent_id: str,
        session_id: Optional[str] = None,
        time_range: Optional[tuple[str, str]] = None,
        limit: int = 50
    ) -> list[MemoryEntry]:
        """
        Get episodic memories (specific past experiences).

        Args:
            agent_id: Agent to get memories for
            session_id: Optional session filter
            time_range: Tuple of (start_date, end_date)
            limit: Maximum results

        Returns:
            List of episodic memory entries
        """
        return await self._get_memories_by_type(
            MemoryType.EPISODIC,
            agent_id,
            session_id,
            time_range,
            limit
        )

    async def get_semantic_memory(
        self,
        agent_id: str,
        query: Optional[str] = None,
        limit: int = 50
    ) -> list[MemoryEntry]:
        """
        Get semantic memories (general knowledge).

        Args:
            agent_id: Agent to get memories for
            query: Optional search query
            limit: Maximum results

        Returns:
            List of semantic memory entries
        """
        if query:
            results = await self.search(
                query,
                memory_type=MemoryType.SEMANTIC,
                agent_id=agent_id,
                limit=limit
            )
            return [r.entry for r in results]
        else:
            memories = await self._get_memories_by_type(
                MemoryType.SEMANTIC,
                agent_id,
                limit=limit
            )
            return memories

    async def get_temporal_patterns(
        self,
        agent_id: str,
        time_window: str = "7d"
    ) -> list[TemporalInsight]:
        """
        Analyze temporal patterns in agent's memories.

        Args:
            agent_id: Agent to analyze
            time_window: Time window for analysis (e.g., "7d", "30d")

        Returns:
            List of temporal insights
        """
        insights: list[TemporalInsight] = []

        # Get memories in time window
        now = datetime.now()
        if time_window.endswith("d"):
            days = int(time_window[:-1])
            start = (now - timedelta(days=days)).isoformat()
        else:
            start = (now - timedelta(days=7)).isoformat()

        # Aggregation query for patterns
        aggs = {
            "memory_types": {
                "terms": {"field": "memory_type"}
            },
            "hourly_distribution": {
                "date_histogram": {
                    "field": "created_at",
                    "calendar_interval": "hour"
                }
            },
            "daily_distribution": {
                "date_histogram": {
                    "field": "created_at",
                    "calendar_interval": "day"
                }
            },
            "avg_importance": {
                "avg": {"field": "importance"}
            },
            "top_tags": {
                "terms": {"field": "tags", "size": 10}
            }
        }

        query = {
            "query": {
                "bool": {
                    "filter": [
                        {"term": {"agent_id": agent_id}},
                        {"range": {"created_at": {"gte": start}}}
                    ]
                }
            },
            "aggs": aggs
        }

        response = self.client.search(
            index=self.UNIFIED_INDEX,
            body=query,
            size=0
        )

        aggs_data = response.get("aggregations", {})

        # Analyze patterns
        if "memory_types" in aggs_data:
            buckets = aggs_data["memory_types"]["buckets"]
            if buckets:
                most_common = buckets[0]
                insights.append(TemporalInsight(
                    insight_type="dominant_memory_type",
                    description=f"Most common memory type: {most_common['key']} ({most_common['doc_count']} entries)",
                    evidence=[f"{b['key']}: {b['doc_count']}" for b in buckets],
                    timestamp=now.isoformat()
                ))

        if "daily_distribution" in aggs_data:
            buckets = aggs_data["daily_distribution"]["buckets"]
            if len(buckets) > 1:
                # Find days with most activity
                sorted_buckets = sorted(buckets, key=lambda x: x["doc_count"], reverse=True)
                if sorted_buckets[0]["doc_count"] > sorted_buckets[1]["doc_count"] * 1.5:
                    insights.append(TemporalInsight(
                        insight_type="peak_activity",
                        description=f"Peak activity on {sorted_buckets[0]['key_as_string'][:10]}",
                        evidence=[f"{b['key_as_string'][:10]}: {b['doc_count']} memories" for b in sorted_buckets[:5]],
                        timestamp=now.isoformat()
                    ))

        if "avg_importance" in aggs_data:
            avg_imp = aggs_data["avg_importance"]["value"]
            if avg_imp:
                insights.append(TemporalInsight(
                    insight_type="average_importance",
                    description=f"Average memory importance: {avg_imp:.2f}",
                    evidence=[],
                    timestamp=now.isoformat()
                ))

        return insights

    async def get_analytics(self, agent_id: Optional[str] = None) -> MemoryAnalytics:
        """Get comprehensive memory analytics."""
        # Build filter
        filter_clauses = []
        if agent_id:
            filter_clauses.append({"term": {"agent_id": agent_id}})

        query = {
            "query": {"bool": {"filter": filter_clauses}} if filter_clauses else {"match_all": {}}
        }

        response = self.client.count(index=self.UNIFIED_INDEX, body=query)

        # Get breakdown by type
        type_agg = {
            "aggs": {
                "by_type": {"terms": {"field": "memory_type"}},
                "by_agent": {"terms": {"field": "agent_id", "size": 20}}
            },
            "size": 0
        }

        type_response = self.client.search(
            index=self.UNIFIED_INDEX,
            body={**query, **type_agg}
        )

        by_type = {}
        for bucket in type_response["aggregations"]["by_type"]["buckets"]:
            by_type[bucket["key"]] = bucket["doc_count"]

        by_agent = {}
        for bucket in type_response["aggregations"]["by_agent"]["buckets"]:
            by_agent[bucket["key"]] = bucket["doc_count"]

        return MemoryAnalytics(
            total_memories=response["count"],
            by_type=by_type,
            by_agent=by_agent,
            recent_access_patterns={},  # Would require access tracking
            memory_health={"status": "healthy", "total": response["count"]}
        )

    async def update_access(self, memory_id: str) -> None:
        """Update access statistics for a memory."""
        self.client.update(
            index=self.UNIFIED_INDEX,
            id=memory_id,
            body={
                "script": {
                    "source": """
                        ctx._source.access_count = (ctx._source.access_count ?: 0) + 1;
                        ctx._source.last_accessed = params.now;
                    """,
                    "params": {"now": datetime.now().isoformat()}
                }
            }
        )

    async def delete(self, memory_id: str) -> bool:
        """Delete a memory entry."""
        try:
            # Delete from all indices
            for index_name in set(self.INDEX_TYPES.values()):
                try:
                    self.client.delete(index=index_name, id=memory_id)
                except NotFoundError:
                    pass

            self.client.delete(index=self.UNIFIED_INDEX, id=memory_id)
            return True
        except Exception:
            return False

    async def consolidate(self, agent_id: str, strategy: str = "importance") -> int:
        """
        Consolidate memories to manage storage.

        Args:
            agent_id: Agent to consolidate memories for
            strategy: Consolidation strategy ('importance', 'recency', 'deduplication')

        Returns:
            Number of memories deleted
        """
        deleted = 0

        if strategy == "importance":
            # Delete low-importance memories
            query = {
                "query": {
                    "bool": {
                        "filter": [
                            {"term": {"agent_id": agent_id}},
                            {"term": {"memory_type": MemoryType.EPISODIC.value}},
                            {"range": {"importance": {"lt": 0.2}}}
                        ]
                    }
                }
            }

            # Delete old memories with low importance
            response = self.client.delete_by_query(
                index=self.UNIFIED_INDEX,
                body=query
            )
            deleted = response.get("deleted", 0)

        elif strategy == "deduplication":
            # Find and merge duplicate memories
            # (simplified - real implementation would use embeddings)
            pass

        return deleted

    # ========================================
    # Private Helper Methods
    # ========================================

    async def _generate_embedding(self, text: str) -> list[float]:
        """Generate embedding for text."""
        # This would integrate with an embedding API
        # Placeholder: return random vector
        import random
        return [random.random() for _ in range(self.vector_dimension)]

    async def _search_vectors(
        self,
        query: str,
        agent_id: Optional[str],
        limit: int,
        embedding: Optional[list[float]] = None,
        min_similarity: float = 0.7
    ) -> list[MemorySearchResult]:
        """Search by vector similarity."""
        results: list[MemorySearchResult] = []

        # Generate embedding from query if not provided
        if embedding is None:
            embedding = await self._generate_embedding(query)

        # Build query
        must_clauses = [
            {"exists": {"field": "embedding"}}
        ]
        filter_clauses = []

        if agent_id:
            filter_clauses.append({"term": {"agent_id": agent_id}})

        search_body = {
            "query": {
                "script_score": {
                    "query": {
                        "bool": {
                            "must": must_clauses,
                            "filter": filter_clauses
                        }
                    },
                    "script": {
                        "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                        "params": {"query_vector": embedding}
                    }
                }
            },
            "size": limit,
            "min_score": min_similarity
        }

        try:
            response = self.client.search(
                index=self.INDEX_TYPES[MemoryType.VECTOR],
                body=search_body
            )

            for hit in response["hits"]["hits"]:
                entry = self._doc_to_entry(hit["_source"])
                results.append(MemorySearchResult(
                    entry=entry,
                    score=hit["_score"],
                    highlights=[]
                ))
        except Exception:
            pass

        return results

    async def _get_memories_by_type(
        self,
        memory_type: MemoryType,
        agent_id: str,
        session_id: Optional[str] = None,
        time_range: Optional[tuple[str, str]] = None,
        limit: int = 50
    ) -> list[MemoryEntry]:
        """Get memories by type."""
        filter_clauses = [
            {"term": {"memory_type": memory_type.value}},
            {"term": {"agent_id": agent_id}}
        ]

        if session_id:
            filter_clauses.append({"term": {"session_id": session_id}})

        if time_range:
            filter_clauses.append({
                "range": {
                    "created_at": {
                        "gte": time_range[0],
                        "lte": time_range[1]
                    }
                }
            })

        query = {
            "query": {"bool": {"filter": filter_clauses}},
            "sort": [{"created_at": "desc"}],
            "size": limit
        }

        index_name = self.INDEX_TYPES.get(memory_type, self.UNIFIED_INDEX)
        response = self.client.search(index=index_name, body=query)

        return [self._doc_to_entry(hit["_source"]) for hit in response["hits"]["hits"]]

    def _entry_to_doc(self, entry: MemoryEntry) -> dict:
        """Convert MemoryEntry to Elasticsearch document."""
        doc = {
            "memory_id": entry.memory_id,
            "content": entry.content,
            "memory_type": entry.memory_type.value,
            "agent_id": entry.agent_id,
            "session_id": entry.session_id,
            "task_id": entry.task_id,
            "created_at": entry.created_at,
            "updated_at": entry.updated_at,
            "importance": entry.importance,
            "access_count": entry.access_count,
            "last_accessed": entry.last_accessed,
            "metadata": entry.metadata,
            "tags": entry.tags,
            "entities": entry.entities,
            "expires_at": entry.expires_at
        }

        if entry.embedding:
            doc["embedding"] = entry.embedding

        return doc

    def _doc_to_entry(self, doc: dict) -> MemoryEntry:
        """Convert Elasticsearch document to MemoryEntry."""
        return MemoryEntry(
            memory_id=doc["memory_id"],
            content=doc["content"],
            memory_type=MemoryType(doc["memory_type"]),
            agent_id=doc["agent_id"],
            session_id=doc["session_id"],
            task_id=doc.get("task_id"),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
            importance=doc.get("importance", 0.5),
            access_count=doc.get("access_count", 0),
            last_accessed=doc.get("last_accessed"),
            embedding=doc.get("embedding"),
            metadata=doc.get("metadata", {}),
            tags=doc.get("tags", []),
            entities=doc.get("entities", []),
            expires_at=doc.get("expires_at")
        )


# Fallback in-memory implementation when Elasticsearch is not available
class InMemoryBackend(MemoryBackend):
    """In-memory fallback when Elasticsearch is not available."""

    def __init__(self):
        self.memories: dict[str, MemoryEntry] = {}

    async def store(self, entry: MemoryEntry) -> str:
        entry.memory_id = entry.memory_id or f"mem_{uuid.uuid4().hex[:12]}"
        self.memories[entry.memory_id] = entry
        return entry.memory_id

    async def retrieve(self, memory_id: str) -> Optional[MemoryEntry]:
        return self.memories.get(memory_id)

    async def search(
        self,
        query: str,
        memory_type: Optional[MemoryType] = None,
        agent_id: Optional[str] = None,
        limit: int = 10
    ) -> list[MemorySearchResult]:
        results = []
        query_lower = query.lower()

        for entry in self.memories.values():
            if memory_type and entry.memory_type != memory_type:
                continue
            if agent_id and entry.agent_id != agent_id:
                continue

            # Simple text matching
            if query_lower in entry.content.lower():
                score = entry.content.lower().count(query_lower) * entry.importance
                results.append(MemorySearchResult(
                    entry=entry,
                    score=score,
                    highlights=[entry.content[:200]]
                ))

        results.sort(key=lambda r: r.score, reverse=True)
        return results[:limit]


# Export for integration
__all__ = [
    'ElasticsearchMemoryBackend',
    'InMemoryBackend',
    'MemoryBackend',
    'MemoryEntry',
    'MemorySearchResult',
    'MemoryAnalytics',
    'TemporalInsight',
    'MemoryType'
]
