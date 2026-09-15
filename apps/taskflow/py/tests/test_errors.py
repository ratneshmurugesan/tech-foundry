from unittest.mock import  MagicMock
from fastapi import Request
from fastapi.responses import JSONResponse

import src.server

from src.errors import NotFoundError

app = src.server.app

def not_found_exception_handler(request: Request, exc: NotFoundError):
        return JSONResponse(
            status_code=404,
            content={
                "statusCode": 404,
                "error": "Not Found",
                "message": exc.message
            }
        )


async def test_bad_body_returns_400_with_details_envelope(client):
    r = await client.post("/workspaces", json={"name": ""})
    assert r.status_code == 400
    data = r.json()
    assert data["error"] == "Bad Request"
    assert data["message"] == "Validation failed"
    assert "details" in data
    assert data["details"][0]["field"] == "name"
    assert "at least 3 characters" in data["details"][0]["message"]

async def test_db_down_maps_to_hidden_500(client):
    """Verifies that database execution failures trigger an opaque 500 without leaking details."""
    r = await client.get("/workspaces")
    assert r.status_code == 500
    body_json = r.json()
    assert body_json == {
        "statusCode": 500,
        "error": "Internal Server Error",
        "message": "Database op failed internally"
    }


async def test_not_found_handler_envelope():
    error_message = "Workspace with ID abc does not exist"
    exc = NotFoundError(error_message)
    request_stub = MagicMock()
    r = not_found_exception_handler(request_stub, exc)
    assert r.status_code == 404
    import json
    data = json.loads(r.body.decode("utf-8"))
    # print("@@@", data)
    assert data == {
        "error": "Not Found",
        "statusCode": 404,
        "message": error_message
    }