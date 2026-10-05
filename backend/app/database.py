from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    if "<db_username>" in settings.MONGODB_URI or "<db_password>" in settings.MONGODB_URI:
        print(" [DB WARNING] MONGODB_URI contains '<db_username>' or '<db_password>' placeholders.")
        print(" [DB ACTION REQUIRED] Please replace <db_username> and <db_password> in backend/.env with your real MongoDB Atlas user credentials!")
        return

    try:
        db_instance.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        await db_instance.client.admin.command('ping')
        print(f" [DB] Connected successfully to MongoDB Atlas: '{settings.DATABASE_NAME}'")
    except Exception as e:
        print(f" [DB WARNING] MongoDB Atlas Connection Notice: {e}")

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        print(" [DB] MongoDB connection closed.")

def get_database():
    return db_instance.db
