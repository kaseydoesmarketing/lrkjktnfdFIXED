// Fix for CreateTestModal.tsx - Replace the video selection section

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// Inside your CreateTestModal component, replace the hardcoded videos array with:

const CreateTestModal = ({ onClose }) => {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch real YouTube videos from API
  const { data: videos = [], isLoading, error } = useQuery({
    queryKey: ['youtube-videos'],
    queryFn: async () => {
      const response = await fetch('/api/videos/channel', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch videos');
      return response.json();
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Filter videos based on search
  const filteredVideos = videos.filter(video => 
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // In your JSX, replace the video selection section with:

  return (
    <>
      {/* ... existing modal header ... */}
      
      {activeTab === 'select' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-medium">Failed to load videos</p>
              <p className="text-sm">{error.message}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-sm underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Videos List - Scrollable */}
          {!isLoading && !error && (
            <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {filteredVideos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg font-medium">No videos found</p>
                  <p className="text-sm mt-1">Try adjusting your search or upload videos to your channel</p>
                </div>
              ) : (
                filteredVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => handleVideoSelect(video)}
                    className="group bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex space-x-3">
                      {/* Thumbnail */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
                          alt={video.title}
                          className="w-32 h-20 object-cover rounded"
                          onError={(e) => {
                            e.target.src = '/placeholder-video.png'; // Fallback image
                          }}
                        />
                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                          {formatVideoDuration(video.duration)}
                        </div>
                      </div>

                      {/* Video Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 text-sm">
                          {video.title}
                        </h3>
                        <div className="flex items-center space-x-3 mt-1 text-xs text-gray-600">
                          <span>{formatViewCount(video.viewCount)} views</span>
                          <span>{formatDate(video.publishedAt)}</span>
                          {video.analytics?.ctr && (
                            <span className="text-green-600 font-medium">
                              {video.analytics.ctr.toFixed(1)}% CTR
                            </span>
                          )}
                        </div>
                        
                        {/* Performance Badge */}
                        {video.analytics?.score && (
                          <div className="mt-2 inline-flex items-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              video.analytics.score >= 80 
                                ? 'bg-green-100 text-green-700'
                                : video.analytics.score >= 60
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              AI: {video.analytics.score}/100
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Load More Button (if needed) */}
          {videos.length > 20 && !searchQuery && (
            <button className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
              Load more videos
            </button>
          )}
        </div>
      )}
      
      {/* ... rest of your modal ... */}
    </>
  );
};

// Utility functions
const formatViewCount = (count) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 1) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

const formatVideoDuration = (duration) => {
  // Convert ISO 8601 duration to readable format
  if (!duration) return '';
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '';
  
  const hours = (match[1] || '').replace('H', '');
  const minutes = (match[2] || '').replace('M', '');
  const seconds = (match[3] || '').replace('S', '');
  
  if (hours) {
    return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
  }
  return `${minutes || '0'}:${seconds.padStart(2, '0')}`;
};