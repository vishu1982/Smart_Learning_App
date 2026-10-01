import React, { useState } from 'react';
import { Search, PlayCircle, BookOpen, AlertCircle } from 'lucide-react';
import { axiosClient } from '../api/axiosClient';

export default function VideosPage() {
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setSelectedVideo(null);
    setVideos([]);
    
    try {
      const res = await axiosClient.get(`/videos/search?query=${encodeURIComponent(query)}`);
      setVideos(res.data);
      if (res.data.length === 0) {
        setError("No educational videos found for that topic. Try another search.");
      }
    } catch (err) {
      if (err.response?.data?.detail?.includes('YOUTUBE_API_KEY')) {
         setError("YouTube API Key is missing. The admin needs to set YOUTUBE_API_KEY in the backend .env file.");
      } else {
         setError(err.response?.data?.detail || "Failed to fetch videos.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-3xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
          <PlayCircle className="h-8 w-8" />
          Educational Videos
        </h1>
        <p className="text-red-100 font-medium max-w-xl">
          Search for study materials, course tutorials, and educational lectures. 
          Results are strictly filtered to ensure they are related to education.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to learn today? (e.g., 'React Hooks', 'Quantum Physics')"
          className="flex-1 px-4 py-3 bg-transparent text-sm focus:outline-none"
        />
        <button 
          type="submit" 
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md shadow-red-200 transition flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? 'Searching...' : <><Search className="h-4 w-4" /> Search</>}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Video Player */}
        <div className="lg:col-span-2">
          {selectedVideo ? (
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 flex flex-col h-[500px]">
              <div className="w-full bg-black flex-1 relative">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1`}
                  title={selectedVideo.title}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900 mb-1">{selectedVideo.title}</h3>
                <p className="text-sm font-semibold text-slate-500 mb-3">{selectedVideo.channelTitle}</p>
                <p className="text-sm text-slate-600 line-clamp-2">{selectedVideo.description}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl h-[500px] flex flex-col items-center justify-center text-slate-400 gap-3">
              <BookOpen className="h-12 w-12 text-slate-300" />
              <p className="font-medium text-sm">Search and select a video to start watching.</p>
            </div>
          )}
        </div>

        {/* Video Results List */}
        <div className="lg:col-span-1 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[500px]">
          <h3 className="text-sm font-bold uppercase text-slate-500 mb-4 flex items-center justify-between">
            Search Results
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{videos.length} found</span>
          </h3>
          <div className="overflow-y-auto pr-2 space-y-4 flex-1">
            {videos.length === 0 && !loading && !error && (
               <p className="text-sm text-slate-400 text-center py-10">No results to display.</p>
            )}
            {videos.map((video) => (
              <div 
                key={video.videoId}
                onClick={() => setSelectedVideo(video)}
                className={`flex gap-3 p-2 -mx-2 rounded-xl cursor-pointer transition ${selectedVideo?.videoId === video.videoId ? 'bg-red-50' : 'hover:bg-slate-50'}`}
              >
                <img 
                  src={video.thumbnail} 
                  alt={video.title} 
                  className="w-28 h-20 object-cover rounded-lg bg-slate-200 shrink-0"
                />
                <div className="flex flex-col justify-center min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2 mb-1 leading-tight" dangerouslySetInnerHTML={{ __html: video.title }}></h4>
                  <p className="text-[10px] font-semibold text-slate-500 truncate">{video.channelTitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}
