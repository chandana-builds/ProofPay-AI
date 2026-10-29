from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.services.seed_data import seed_database
from app.routers import dashboard, investigations, vendors, reviews, settings as settings_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    
    # Seed default trusted vendors and scenarios if empty
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    
    yield

app = FastAPI(
    title="ProofPay AI API",
    description="Evidence-Driven Payment Fraud Prevention Platform powered by NVIDIA Nemotron & Nebius Token Factory",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all in development/demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(dashboard.router)
app.include_router(investigations.router)
app.include_router(vendors.router)
app.include_router(reviews.router)
app.include_router(settings_router.router)

@app.get("/")
def root_status():
    return {
        "service": "ProofPay AI Backend API",
        "status": "OPERATIONAL",
        "version": "1.0.0",
        "nebius_model": settings.NEBIUS_MODEL,
        "docs_url": "/docs"
    }
