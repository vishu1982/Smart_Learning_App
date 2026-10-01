import os
import urllib.request
import urllib.parse
import json
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/videos", tags=["Videos"])

@router.get("/search")
def search_educational_videos(query: str = Query(..., min_length=1)):
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key or api_key == "YOUR_YOUTUBE_API_KEY_HERE":
        raise HTTPException(status_code=500, detail="YOUTUBE_API_KEY is not configured in backend/.env. Please get an API key from Google Cloud Console and add it.")

    # We enforce study-related videos by appending keywords and using the Education category
    search_query = f"{query} educational course tutorial"
    
    params = {
        "part": "snippet",
        "q": search_query,
        "type": "video",
        "videoCategoryId": "27",  # 27 is Education in YouTube API
        "maxResults": "12",
        "key": api_key,
        "safeSearch": "strict",
        "relevanceLanguage": "en"
    }
    
    query_string = urllib.parse.urlencode(params)
    url = f"https://www.googleapis.com/youtube/v3/search?{query_string}"
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
        videos = []
        for item in data.get("items", []):
            videos.append({
                "videoId": item["id"]["videoId"],
                "title": item["snippet"]["title"],
                "description": item["snippet"]["description"],
                "thumbnail": item["snippet"]["thumbnails"]["high"]["url"],
                "channelTitle": item["snippet"]["channelTitle"]
            })
            
        return videos
    except urllib.error.HTTPError as e:
        error_info = e.read().decode()
        raise HTTPException(status_code=e.code, detail=f"YouTube API Error: {error_info}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
