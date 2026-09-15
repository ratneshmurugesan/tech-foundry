from uuid import uuid4

__all__ = ["generate_id"]

def generate_id() -> str:
    return str(uuid4())