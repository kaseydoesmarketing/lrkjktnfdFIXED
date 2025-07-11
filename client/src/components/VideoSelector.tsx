import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Clock, Play, AlertCircle } from 'lucide-react';
import { ReconnectGoogleButton } from '@/components/ReconnectGoogleButton';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
  duration: string;
  status: string;
}

interface VideoSelectorProps {
  onSelectVideo: (video: Video) => void;
  selectedVideoId?: string;
}

export default function VideoSelector({ onSelectVideo, selectedVideoId }: VideoSelectorProps) {
  const { data: videos, isLoading, error } = useQuery({
    queryKey: ['/api/videos/recent'],
    retry: false,
  });

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatDuration = (duration: string) => {
    // Convert PT15M30S to 15:30 format
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatPublishedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Select a Video to Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="w-32 h-20 bg-gray-700 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle authentication errors
  if (error) {
    const errorMessage = (error as any)?.message || '';
    const isAuthError = errorMessage.includes('YouTube account not connected') || 
                       errorMessage.includes('YouTube authorization expired') ||
                       errorMessage.includes('authentication') || 
                       errorMessage.includes('YouTube access');
    
    if (isAuthError) {
      return (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">YouTube Connection Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-300 mb-6">
                We need to connect to your YouTube account to fetch your videos and manage title tests.
              </p>
              <ReconnectGoogleButton />
            </div>
          </CardContent>
        </Card>
      );
    }
  }

  if (!videos || (videos as Video[]).length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Select a Video to Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-8">
            No recent videos found. Make sure your YouTube channel has published videos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Select a Video to Test</CardTitle>
        <p className="text-sm text-gray-400">Choose from your recent videos to start A/B testing titles</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {(videos as Video[]).map((video: Video) => (
            <div 
              key={video.id} 
              className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedVideoId === video.id ? 'border-red-500 bg-red-500/10' : 'border-gray-600 bg-gray-700'
              }`}
              onClick={() => onSelectVideo(video)}
            >
              <div className="flex space-x-4">
                <div className="relative flex-shrink-0">
                  <img 
                    src={video.thumbnail} 
                    alt={video.title}
                    className="w-32 h-20 object-cover rounded"
                  />
                  <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                    {formatDuration(video.duration)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white mb-2 line-clamp-2">
                    {video.title}
                  </h3>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-400 mb-2">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{formatViewCount(video.viewCount)} views</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatPublishedDate(video.publishedAt)}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                    {video.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs bg-gray-600 text-gray-300">
                      Video ID: {video.id}
                    </Badge>
                    {selectedVideoId === video.id && (
                      <Badge className="bg-red-500 text-white">
                        Selected
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}