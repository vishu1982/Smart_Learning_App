from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    try:
        db_instance.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=3000)
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        print(f" [DB] Connected successfully to MongoDB: '{settings.DATABASE_NAME}'")
    except Exception as e:
        print(f" [DB WARNING] MongoDB Connection Notice: {e}")

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        print(" [DB] MongoDB connection closed.")

def get_database():
    return db_instance.db
