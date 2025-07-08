import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Video, 
  Eye, 
  Clock, 
  TrendingUp, 
  Search, 
  Filter, 
  Maximize2, 
  Minimize2, 
  Sparkles,
  Bot,
  BarChart3,
  Target,
  Zap,
  Star,
  Calendar,
  PlayCircle,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
  duration: string;
  status: string;
  engagement?: {
    ctr?: number;
    avgViewDuration?: number;
    likeRatio?: number;
  };
  aiInsights?: {
    titleOptimizationScore: number;
    thumbnailScore: number;
    contentCategory: string;
    suggestedImprovements: string[];
    viralPotential: 'Low' | 'Medium' | 'High';
  };
}

interface FuturisticVideoSelectorProps {
  onSelectVideo: (video: Video) => void;
  selectedVideoId?: string;
}

export default function FuturisticVideoSelector({ onSelectVideo, selectedVideoId }: FuturisticVideoSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch real YouTube videos
  const { data: videos = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/videos/channel'],
    retry: 2,
    refetchOnWindowFocus: false
  });

  // Filter videos based on search query
  const filteredVideos = videos.filter(video => 
    video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort videos
  const sortedVideos = [...filteredVideos].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    } else if (sortBy === 'views') {
      return b.viewCount - a.viewCount;
    } else if (sortBy === 'engagement') {
      return (b.engagement?.ctr || 0) - (a.engagement?.ctr || 0);
    }
    return 0;
  });

  // Apply filters
  const finalVideos = sortedVideos.filter(video => {
    if (filterBy === 'all') return true;
    if (filterBy === 'high-ctr') return (video.engagement?.ctr || 0) > 5;
    if (filterBy === 'low-views') return video.viewCount < 10000;
    return true;
  });

  const handleVideoSelect = (video: Video) => {
    onSelectVideo(video);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const formatViews = (views: number): string => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const formatDuration = (duration: string): string => {
    // YouTube duration format: PT15M51S
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0:00';
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Loading your videos...</h3>
              <p className="text-gray-600">Fetching your YouTube channel content</p>
            </div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex space-x-4">
                <Skeleton className="w-32 h-20 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex space-x-4">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-center">
        <p className="text-red-800 mb-2">Failed to load videos</p>
        <p className="text-red-600 text-sm mb-4">{error.message || 'Please make sure you are logged in with YouTube'}</p>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          Try again
        </Button>
      </div>
    );
  }

  // No videos state
  if (!isLoading && !error && finalVideos.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
        <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-700 font-medium mb-2">
          {searchQuery ? 'No videos found' : 'No videos in your channel yet'}
        </p>
        <p className="text-gray-500 text-sm">
          {searchQuery ? 'Try adjusting your search' : 'Upload videos to your YouTube channel to start testing'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Video className="w-5 h-5" />
              Select a Video to Test
            </h3>
            <p className="text-gray-600 mt-1">Choose from your YouTube channel videos</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search your videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>

          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="views">Most Views</SelectItem>
                <SelectItem value="engagement">Best CTR</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-[140px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Videos</SelectItem>
                <SelectItem value="high-ctr">High CTR</SelectItem>
                <SelectItem value="low-views">Low Views</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Video List with Custom Scrollbar */}
      <div className={`space-y-3 overflow-y-auto custom-scrollbar ${isExpanded ? 'max-h-[600px]' : 'max-h-[400px]'}`}>
        {finalVideos.map((video) => (
          <div
            key={video.id}
            onClick={() => handleVideoSelect(video)}
            className={`
              bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer
              ${selectedVideoId === video.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-100'}
            `}
          >
            <div className="flex p-4 space-x-4">
              {/* Thumbnail */}
              <div className="relative flex-shrink-0">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-32 h-20 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/api/placeholder/320/180';
                  }}
                />
                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                  {formatDuration(video.duration)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate pr-2">
                  {video.title}
                </h4>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatViews(video.viewCount)} views
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(video.publishedAt)}
                  </span>
                  {video.engagement?.ctr && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {video.engagement.ctr.toFixed(1)}% CTR
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                  {video.description || 'No description'}
                </p>
              </div>

              {/* Select Button */}
              <div className="flex-shrink-0">
                <Button
                  size="sm"
                  variant={selectedVideoId === video.id ? "default" : "outline"}
                >
                  {selectedVideoId === video.id ? 'Selected' : 'Select'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {videos.length > 10 && !searchQuery && (
        <div className="text-center">
          <Button variant="outline" className="w-full">
            Load more videos
          </Button>
        </div>
      )}
    </div>
  );
}