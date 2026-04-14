-- RAG storage has moved fully to Qdrant.
-- Remove legacy MySQL RAG tables if they still exist.

DROP TABLE IF EXISTS rag_chunks;
DROP TABLE IF EXISTS rag_documents;
