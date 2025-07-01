from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# This is for development, to allow your React frontend
# to talk to your backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # The default port for Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def read_root():
    return {"status": "ok"}