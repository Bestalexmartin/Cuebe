# backend/routers/docs_search.py

import os
import re
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Query, HTTPException, Depends
from pydantic import BaseModel
from routers.auth import get_current_user

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

def get_content_directory(content_type: str) -> Path:
    """Get the content directory path, checking multiple possible locations"""
    possible_paths = [
        Path(f"/{content_type}"),  # Docker mount
        Path(__file__).parent.parent.parent / content_type,  # Project root (parent of backend/)
        Path(__file__).parent.parent / content_type,  # Backend directory  
        Path.cwd() / content_type,  # Current working directory
    ]
    
    for path in possible_paths:
        if path.exists():
            return path
    
    # Return the most likely path even if it doesn't exist (for error messages)
    return Path(__file__).parent.parent.parent / content_type

def build_search_index():
    """Build the search index from documentation and tutorial files"""
    global search_index
    
    documents = []
    
    # Index documentation files
    docs_dir = get_content_directory("docs")
    if docs_dir.exists():
        for md_file in docs_dir.rglob("*.md"):
            doc = process_markdown_file(md_file, docs_dir, "documentation")
            if doc:
                documents.append(doc)
    else:
        print(f"Docs directory not found: {docs_dir}")
    
    # Index tutorial files  
    tutorials_dir = get_content_directory("tutorials")
    if tutorials_dir.exists():
        for md_file in tutorials_dir.rglob("*.md"):
            doc = process_markdown_file(md_file, tutorials_dir, "tutorial")
            if doc:
                documents.append(doc)
    else:
        print(f"Tutorials directory not found: {tutorials_dir}")
    
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


def search_documents(query: str, limit: int = 10, content_type: str = None) -> List[SearchResult]:
    """Search through the document index with improved scoring"""
    if not query.strip():
        return []
    
    query_lower = query.lower().strip()
    query_terms = [term.strip() for term in query_lower.split() if term.strip()]
    results = []
    
    # Filter documents by content type before searching if specified
    documents_to_search = search_index["documents"]
    if content_type:
        documents_to_search = [doc for doc in search_index["documents"] if doc["content_type"] == content_type]
    
    for doc in documents_to_search:
        score = 0.0
        snippet = ""
        title_lower = doc["title"].lower()
        content_lower = doc["content"].lower()
        
        # Score calculations for each term
        for term in query_terms:
            term_score = 0.0
            
            # Exact title match (highest weight)
            if title_lower == term:
                term_score += 50.0
            # Title contains term (high weight)
            elif term in title_lower:
                term_score += 20.0
            
            # Exact heading match (high weight)
            for heading in doc["headings"]:
                heading_lower = heading.lower()
                if heading_lower == term:
                    term_score += 30.0
                elif term in heading_lower:
                    term_score += 10.0
            
            # Content matches (lower weight, but consider frequency)
            if term in content_lower:
                # Count occurrences for frequency-based scoring
                occurrences = content_lower.count(term)
                term_score += min(occurrences * 2.0, 10.0)  # Cap at 10 points for content
            
            score += term_score
        
        # Bonus for multi-term queries where all terms are found
        if len(query_terms) > 1:
            all_terms_in_title = all(term in title_lower for term in query_terms)
            all_terms_in_content = all(term in content_lower for term in query_terms)
            
            if all_terms_in_title:
                score += 15.0
            elif all_terms_in_content:
                score += 5.0
        
        # Extract better snippet if we have a match
        if score > 0:
            # For single term, find best match location
            if len(query_terms) == 1:
                term = query_terms[0]
                match_index = content_lower.find(term)
            else:
                # For multiple terms, find location with most terms nearby
                best_index = 0
                best_count = 0
                for i in range(0, len(content_lower), 50):
                    window = content_lower[i:i+200]
                    count = sum(1 for term in query_terms if term in window)
                    if count > best_count:
                        best_count = count
                        best_index = i
                match_index = best_index
            
            if match_index >= 0:
                # Extract snippet around match
                start = max(0, match_index - 80)
                end = min(len(doc["content"]), match_index + 120)
                snippet = doc["content"][start:end].strip()
                
                # Clean up snippet
                snippet = re.sub(r'\n+', ' ', snippet)
                snippet = re.sub(r'\s+', ' ', snippet)
                if start > 0:
                    snippet = "..." + snippet
                if end < len(doc["content"]):
                    snippet = snippet + "..."
        
        # Add to results if we have a meaningful score
        if score > 0:
            results.append(SearchResult(
                file_path=doc["file_path"],
                title=doc["title"],
                category=doc["category"],
                url=doc["url"],
                snippet=snippet or doc["title"],
                relevance_score=round(score / 10.0, 1),
                content_type=doc["content_type"]
            ))
    
    # Sort by relevance score (highest first)
    results.sort(key=lambda x: x.relevance_score, reverse=True)
    
    return results[:limit]

@router.get("/search", response_model=SearchResponse)
async def search_docs(
    q: str = Query(..., description="Search query"),
    limit: int = Query(12, ge=1, le=50, description="Maximum number of results"),
    content_type: str = Query(None, description="Filter by content type: 'tutorial' or 'documentation'"),
    current_user: dict = Depends(get_current_user)
):
    """Search through documentation and tutorials"""
    
    # Build index if empty
    if not search_index["documents"]:
        build_search_index()
    
    if not search_index["documents"]:
        raise HTTPException(status_code=503, detail="Documentation index not available")
    
    results = search_documents(q, limit, content_type)
    
    return SearchResponse(
        results=results,
        total_results=len(results),
        query=q
    )

@router.post("/search/rebuild")
async def rebuild_search_index(current_user: dict = Depends(get_current_user)):
    """Rebuild the documentation search index"""
    build_search_index()
    return {
        "message": "Search index rebuilt successfully",
        "documents_indexed": len(search_index["documents"]),
        "last_updated": search_index["last_updated"]
    }

# Build index on module import
build_search_index()