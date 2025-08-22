# backend/routers/docs_search.py

import os
import re
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/docs", tags=["documentation"])

# Global in-memory search index
search_index: Dict = {
    "documents": [],
    "last_updated": None
}

class SearchResult(BaseModel):
    file_path: str
    title: str
    category: str
    url: str
    snippet: str
    relevance_score: float
    content_type: str

class SearchResponse(BaseModel):
    results: List[SearchResult]
    total_results: int
    query: str

def extract_title_from_markdown(content: str) -> str:
    """Extract title from markdown content"""
    lines = content.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('# '):
            return line[2:].strip()
    return "Untitled"

def extract_headings_from_markdown(content: str) -> List[str]:
    """Extract all headings from markdown content"""
    headings = []
    for line in content.split('\n'):
        line = line.strip()
        if line.startswith('#'):
            # Remove markdown # symbols and clean up
            heading = re.sub(r'^#+\s*', '', line).strip()
            if heading:
                headings.append(heading)
    return headings

def get_category_from_path(file_path: str) -> str:
    """Extract category from file path"""
    parts = Path(file_path).parts
    if len(parts) > 1:
        return parts[-2]  # Parent directory name
    return "general"

def build_search_index():
    """Build the search index from documentation and tutorial files"""
    global search_index
    
    # Path resolution for Docker vs local development
    docs_dir = Path("/docs") if Path("/docs").exists() else Path(__file__).parent.parent / "docs"
    tutorials_dir = Path("/tutorials") if Path("/tutorials").exists() else Path(__file__).parent.parent / "tutorials"
    
    documents = []
    
    # Index documentation files
    if docs_dir.exists():
        for md_file in docs_dir.rglob("*.md"):
            documents.append(process_markdown_file(md_file, docs_dir, "documentation"))
    else:
        print(f"Docs directory not found: {docs_dir}")
    
    # Index tutorial files  
    if tutorials_dir.exists():
        for md_file in tutorials_dir.rglob("*.md"):
            documents.append(process_markdown_file(md_file, tutorials_dir, "tutorial"))
    else:
        print(f"Tutorials directory not found: {tutorials_dir}")
    
    # Filter out None results from failed processing
    documents = [doc for doc in documents if doc is not None]
    
    search_index["documents"] = documents
    search_index["last_updated"] = datetime.now().isoformat()
    
    print(f"Built search index with {len(documents)} documents")

def process_markdown_file(md_file: Path, base_dir: Path, content_type: str):
    """Process a single markdown file for indexing"""
    try:
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Calculate relative path from base directory
        relative_path = md_file.relative_to(base_dir)
        
        # Build document entry
        doc = {
            "file_path": str(relative_path),
            "title": extract_title_from_markdown(content),
            "category": get_category_from_path(str(relative_path)),
            "content": content,
            "headings": extract_headings_from_markdown(content),
            "url": f"/{content_type}s/{str(relative_path).replace('.md', '').replace(chr(92), '/')}",
            "content_type": content_type
        }
        
        return doc
        
    except Exception as e:
        print(f"Error processing {md_file}: {e}")
        return None


def search_documents(query: str, limit: int = 10) -> List[SearchResult]:
    """Search through the document index"""
    if not query.strip():
        return []
    
    query_lower = query.lower()
    results = []
    
    for doc in search_index["documents"]:
        score = 0.0
        snippet = ""
        
        # Search in title (higher weight)
        if query_lower in doc["title"].lower():
            score += 10.0
        
        # Search in headings (medium weight) 
        for heading in doc["headings"]:
            if query_lower in heading.lower():
                score += 5.0
        
        # Search in content (lower weight)
        content_lower = doc["content"].lower()
        if query_lower in content_lower:
            score += 1.0
            
            # Extract snippet around first match
            match_index = content_lower.find(query_lower)
            start = max(0, match_index - 100)
            end = min(len(doc["content"]), match_index + 100)
            snippet = doc["content"][start:end].strip()
            
            # Clean up snippet
            snippet = re.sub(r'\n+', ' ', snippet)
            snippet = re.sub(r'\s+', ' ', snippet)
            if start > 0:
                snippet = "..." + snippet
            if end < len(doc["content"]):
                snippet = snippet + "..."
        
        # If we found matches, add to results
        if score > 0:
            results.append(SearchResult(
                file_path=doc["file_path"],
                title=doc["title"],
                category=doc["category"],
                url=doc["url"],
                snippet=snippet or doc["title"],
                relevance_score=score,
                content_type=doc["content_type"]
            ))
    
    # Sort by relevance score (highest first)
    results.sort(key=lambda x: x.relevance_score, reverse=True)
    
    return results[:limit]

@router.get("/search", response_model=SearchResponse)
async def search_docs(
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results")
):
    """Search through documentation"""
    
    # Build index if empty
    if not search_index["documents"]:
        build_search_index()
    
    if not search_index["documents"]:
        raise HTTPException(status_code=503, detail="Documentation index not available")
    
    results = search_documents(q, limit)
    
    return SearchResponse(
        results=results,
        total_results=len(results),
        query=q
    )

@router.post("/search/rebuild")
async def rebuild_search_index():
    """Rebuild the documentation search index"""
    build_search_index()
    return {
        "message": "Search index rebuilt successfully",
        "documents_indexed": len(search_index["documents"]),
        "last_updated": search_index["last_updated"]
    }

# Build index on module import
build_search_index()