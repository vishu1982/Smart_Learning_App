import certifi
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
        kwargs = {"serverSelectionTimeoutMS": 5000}
        if "mongodb+srv://" in settings.MONGODB_URI:
            kwargs["tlsCAFile"] = certifi.where()

        db_instance.client = AsyncIOMotorClient(settings.MONGODB_URI, **kwargs)
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        await db_instance.client.admin.command('ping')
        print(f" [DB] Connected successfully to MongoDB Atlas: '{settings.DATABASE_NAME}'")
    except Exception as e:
        err_msg = str(e)
        if "TLSV1_ALERT_INTERNAL_ERROR" in err_msg or "SSL handshake failed" in err_msg:
            print("\n" + "="*70)
            print(" [DB NETWORK BLOCKED] MongoDB Atlas rejected the connection.")
            print(" CAUSE: Your current IP address is not whitelisted in MongoDB Atlas.")
            print(" HOW TO FIX (Takes 30 seconds):")
            print(" 1. Log in to https://cloud.mongodb.com/")
            print(" 2. In left sidebar, click 'Security' -> 'Network Access'")
            print(" 3. Click '+ ADD IP ADDRESS'")
            print(" 4. Click 'ALLOW ACCESS FROM ANYWHERE' (IP: 0.0.0.0/0) -> Confirm")
            print(" 5. Wait ~1 minute for Atlas to apply the rule, then restart.")
            print("="*70 + "\n")
        else:
            print(f" [DB WARNING] MongoDB Atlas Connection Notice: {e}")

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        print(" [DB] MongoDB connection closed.")

def get_database():
    return db_instance.db
