from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.routers import auth, materials, quizzes, ai_tutor, analytics, social, chat, videos

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Full-Stack Smart Learning Web Application API with MongoDB & Gemini AI (MCA Minor Project)",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api/v1")
app.include_router(materials.router, prefix="/api/v1")
app.include_router(quizzes.router,   prefix="/api/v1")
app.include_router(ai_tutor.router,  prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(social.router,    prefix="/api/v1")
app.include_router(chat.router,      prefix="/api/v1")
app.include_router(videos.router,    prefix="/api/v1")


@app.get("/api", tags=["Health"])
@app.get("/api/health", tags=["Health"])
@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "database": settings.DATABASE_NAME,
        "docs_url": "/api/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
