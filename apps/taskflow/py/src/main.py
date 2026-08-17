from uvicorn import run
from .server import app

def main() -> None:
    run(app, host="0.0.0.0", port=8000)
    print(f"Day 2 Python track: COMPLETE")

if __name__ == "__main__":
    main()