import re
import time
import uuid
from pathlib import Path

_UNSAFE = re.compile(r"[^\w\s.\-]")


def sanitize_filename(filename: str) -> str:
    """Return safe basename only — strips path traversal and unsafe chars."""
    name = Path(filename).name  # basename only, removes any path component
    name = _UNSAFE.sub("_", name)
    return name or "upload"


def unique_stored_name(original_filename: str) -> str:
    """Prepend a timestamp+uuid prefix so stored names are always unique."""
    safe = sanitize_filename(original_filename)
    prefix = f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}"
    return f"{prefix}-{safe}"
