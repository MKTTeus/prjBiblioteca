"""Normalize Vercel rewrites that route API requests through api/index.py."""

import os
import re
from urllib.parse import parse_qsl, urlencode

from starlette.responses import JSONResponse


_ROUTE_QUERY_PARAM = "__vercel_path"
_SAFE_SEGMENT = re.compile(r"^[A-Za-z0-9_.~-]+$")


class VercelRewritePathMiddleware:
    """Restore /api/<route> from the path captured by vercel.json's rewrite."""

    def __init__(self, app):
        self.app = app
        self.enabled = bool(os.getenv("VERCEL"))

    async def __call__(self, scope, receive, send):
        if not self.enabled or scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        query_items = parse_qsl(
            scope.get("query_string", b"").decode("latin-1"),
            keep_blank_values=True,
        )
        routed_paths = [
            value for key, value in query_items if key == _ROUTE_QUERY_PARAM
        ]
        if not routed_paths:
            await self.app(scope, receive, send)
            return

        suffix = routed_paths[-1].strip("/")
        segments = suffix.split("/") if suffix else []
        if any(
            segment in {".", ".."} or not _SAFE_SEGMENT.fullmatch(segment)
            for segment in segments
        ):
            response = JSONResponse(
                status_code=400,
                content={"detail": "Caminho de API inválido"},
            )
            await response(scope, receive, send)
            return

        path = "/api" + (f"/{suffix}" if suffix else "")
        normalized_scope = dict(scope)
        normalized_scope["path"] = path
        normalized_scope["raw_path"] = path.encode("utf-8")
        normalized_scope["query_string"] = urlencode(
            [(key, value) for key, value in query_items if key != _ROUTE_QUERY_PARAM]
        ).encode("ascii")

        await self.app(normalized_scope, receive, send)
