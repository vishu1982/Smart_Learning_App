import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

# Configure dnspython to use Google and Cloudflare public DNS resolvers.
# This permanently resolves "All nameservers failed to answer the query ... IN SRV"
# timeouts caused by mobile hotspots, iPhone/Android tethering, or restrictive local Wi-Fi.
try:
    import dns.resolver
    resolver = dns.resolver.Resolver(configure=False)
    resolver.nameservers = ['8.8.8.8', '1.1.1.1', '8.8.4.4', '1.0.0.1']
    resolver.timeout = 5.0
    resolver.lifetime = 5.0
    dns.resolver.default_resolver = resolver
except Exception:
    pass

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
        
        # Enable secure TLS using certifi CA bundle for Atlas connections
        if (
            "mongodb.net" in settings.MONGODB_URI
            or "tls=true" in settings.MONGODB_URI
            or "ssl=true" in settings.MONGODB_URI
            or "mongodb+srv://" in settings.MONGODB_URI
        ):
            kwargs["tlsCAFile"] = certifi.where()

        db_instance.client = AsyncIOMotorClient(settings.MONGODB_URI, **kwargs)
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        await db_instance.client.admin.command('ping')
        print(f" [DB] Connected successfully to MongoDB Atlas: '{settings.DATABASE_NAME}'")
    except Exception as e:
        err_msg = str(e)
        if "TLSV1_ALERT_INTERNAL_ERROR" in err_msg or "SSL handshake failed" in err_msg:
            print("\n" + "="*75)
            print(" [DB NETWORK BLOCKED] MongoDB Atlas rejected the TLS connection.")
            print(" CAUSE: Your current network IP is not whitelisted in MongoDB Atlas.")
            print(" HOW TO FIX PERMANENTLY (Takes 30 seconds):")
            print(" 1. Go to https://cloud.mongodb.com/ and log in.")
            print(" 2. In the left sidebar under 'SECURITY', click 'Network Access'.")
            print(" 3. Click '+ ADD IP ADDRESS'.")
            print(" 4. Click 'ALLOW ACCESS FROM ANYWHERE' (entry: 0.0.0.0/0), then click 'Confirm'.")
            print("    (0.0.0.0/0 ensures you can connect from Mobile Hotspot, Home Wi-Fi,")
            print("     College Wi-Fi, and when deploying to Vercel/Render without being blocked).")
            print(" 5. Wait ~1 minute for Atlas to apply the rule, then restart.")
            print("="*75 + "\n")
        elif "IN SRV" in err_msg or "nameservers failed" in err_msg:
            print("\n" + "="*75)
            print(" [DB DNS NOTICE] Local network DNS failed to resolve the SRV record.")
            print(" TIP: If using a mobile hotspot, switch to the direct connection string in backend/.env:")
            print(" MONGODB_URI=mongodb://Vishubh:gxL1OoirbsQA9f48@ac-5tlwp7u-shard-00-00.zwejdog.mongodb.net:27017,ac-5tlwp7u-shard-00-01.zwejdog.mongodb.net:27017,ac-5tlwp7u-shard-00-02.zwejdog.mongodb.net:27017/smart_learning_db?ssl=true&replicaSet=atlas-wi9amp-shard-0&authSource=admin")
            print("="*75 + "\n")
        else:
            print(f" [DB WARNING] MongoDB Atlas Connection Notice: {e}")

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        print(" [DB] MongoDB connection closed.")

def get_database():
    return db_instance.db
