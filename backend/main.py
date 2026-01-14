from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import trades, daily_summaries
from app.database import engine
from app.models import Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="0DTE Trading Journal API",
    description="API for tracking zero-days-to-expiration options trades",
    version="1.0.0"
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # React dev server
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(trades.router, prefix="/api/trades", tags=["trades"])
app.include_router(daily_summaries.router, prefix="/api/summaries", tags=["summaries"])

@app.get("/")
async def root():
    return {"message": "0DTE Trading Journal API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}