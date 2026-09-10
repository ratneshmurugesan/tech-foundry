from uvicorn import run as uvicorn_run
from .server import app

def main() -> None:
    # init_db() is handled by FastAPI's startup event in server.py
    uvicorn_run("src.main:app", host="0.0.0.0", port=8001, reload=True)

if __name__ == "__main__":
    main()