from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Helper function to convert ObjectId to string
def poster_helper(poster) -> dict:
    return {
        "id": str(poster["_id"]),
        "title": poster["title"],
        "date": poster["date"],
        "location": poster["location"],
        "image": poster["image"],
        "createdAt": poster.get("createdAt", "")
    }


# Define Models
class PosterCreate(BaseModel):
    title: str
    date: str
    location: str
    image: str  # base64 encoded image


class PosterUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    location: Optional[str] = None
    image: Optional[str] = None


class Poster(BaseModel):
    id: str
    title: str
    date: str
    location: str
    image: str
    createdAt: str


# Poster Routes
@api_router.post("/posters", response_model=Poster)
async def create_poster(poster: PosterCreate):
    poster_dict = poster.dict()
    poster_dict["createdAt"] = datetime.utcnow().isoformat()
    
    result = await db.posters.insert_one(poster_dict)
    new_poster = await db.posters.find_one({"_id": result.inserted_id})
    
    return poster_helper(new_poster)


@api_router.get("/posters", response_model=List[Poster])
async def get_all_posters():
    posters = await db.posters.find().sort("date", 1).to_list(1000)
    return [poster_helper(poster) for poster in posters]


@api_router.get("/posters/{poster_id}", response_model=Poster)
async def get_poster(poster_id: str):
    try:
        poster = await db.posters.find_one({"_id": ObjectId(poster_id)})
        if poster:
            return poster_helper(poster)
        raise HTTPException(status_code=404, detail="Poster not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.put("/posters/{poster_id}", response_model=Poster)
async def update_poster(poster_id: str, poster_update: PosterUpdate):
    try:
        update_data = {k: v for k, v in poster_update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        result = await db.posters.update_one(
            {"_id": ObjectId(poster_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Poster not found")
        
        updated_poster = await db.posters.find_one({"_id": ObjectId(poster_id)})
        return poster_helper(updated_poster)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.delete("/posters/{poster_id}")
async def delete_poster(poster_id: str):
    try:
        result = await db.posters.delete_one({"_id": ObjectId(poster_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Poster not found")
        
        return {"message": "Poster deleted successfully", "id": poster_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.get("/")
async def root():
    return {"message": "Poster Collection API"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
