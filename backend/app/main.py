from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import AppError
from app.api.endpoints import router as api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Universal File Size Optimization & Format Conversion Engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*", "ngrok-skip-browser-warning"],
    expose_headers=["*", "ngrok-skip-browser-warning", "X-Processing-Result"]
)

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_dict()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": str(exc)
        }
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router)
