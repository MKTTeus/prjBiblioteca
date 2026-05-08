"""Vercel Serverless Function entrypoint.

The FastAPI app stays in src/backend for local development with uvicorn.
Vercel imports this module and exposes the same app as a Python function.
"""

from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[1] / "src" / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app  # noqa: E402
