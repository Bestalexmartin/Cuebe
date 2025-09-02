from fastapi import APIRouter
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["script-elements"])

# All script element endpoints have been consolidated into shows.py unified endpoints.
