import React, { useState, useEffect } from 'react';
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
  const [videos, setVideos] = useState<Video[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [showAIInsights, setShowAIInsights] = useState(false);

  // Demo data with comprehensive video library
  const demoVideos: Video[] = [
    {
      id: 'video-1',
      title: 'Why Diddy Will NEVER Go to Prison (The Real Reason)',
      description: 'Deep dive analysis into the legal complexities...',
      thumbnail: '/api/placeholder/320/180',
      publishedAt: '2025-06-26T10:00:00Z',
      viewCount: 408000,
      duration: '12:34',
      status: 'public',
      engagement: { ctr: 8.2, avgViewDuration: 67, likeRatio: 94 },
      aiInsights: {
        titleOptimizationScore: 85,
        thumbnailScore: 78,
        contentCategory: 'News & Politics',
        suggestedImprovements: ['Add emotional trigger words for higher CTR', 'Consider A/B testing with question format'],
        viralPotential: 'High'
      }
    },
    {
      id: 'video-2',
      title: 'Why Diddy Is Gonna Walk Free (And Nobody\'s Ready for the Truth)',
      description: 'Controversial take on the ongoing legal situation...',
      thumbnail: '/api/placeholder/320/180',
      publishedAt: '2025-06-26T08:00:00Z',
      viewCount: 125000,
      duration: '15:22',
      status: 'public',
      engagement: { ctr: 5.4, avgViewDuration: 45, likeRatio: 76 },
      aiInsights: {
        titleOptimizationScore: 72,
        thumbnailScore: 65,
        contentCategory: 'News & Politics',
        suggestedImprovements: ['Title length optimal for mobile display', 'Strong hook but could be more specific'],
        viralPotential: 'Medium'
      }
    },
    {
      id: 'video-3',
      title: 'Complete React Tutorial for Beginners in 2025',
      description: 'Learn React from scratch with modern hooks and best practices...',
      thumbnail: '/api/placeholder/320/180',
      publishedAt: '2025-06-20T16:00:00Z',
      viewCount: 234000,
      duration: '45:12',
      status: 'public',
      engagement: { ctr: 7.8, avgViewDuration: 62, likeRatio: 91 },
      aiInsights: {
        titleOptimizationScore: 88,
        thumbnailScore: 85,
        contentCategory: 'Education',
        suggestedImprovements: ['Excellent educational format', 'Consider adding "Step by Step" for clarity'],
        viralPotential: 'High'
      }
    },
    {
      id: 'video-4',
      title: 'JavaScript ES2025 New Features You NEED to Know',
      description: 'Latest JavaScript features that will change how you code...',
      thumbnail: '/api/placeholder/320/180',
      publishedAt: '2025-06-18T12:00:00Z',
      viewCount: 89000,
      duration: '23:45',
      status: 'public',
      engagement: { ctr: 6.7, avgViewDuration: 58, likeRatio: 89 },
      aiInsights: {
        titleOptimizationScore: 82,
        thumbnailScore: 75,
        contentCategory: 'Technology',
        suggestedImprovements: ['Great use of urgency words', 'Consider specific number of features'],
        viralPotential: 'Medium'
      }
    },
    {
      id: 'video-5',
      title: 'Build a Full Stack App in 30 Minutes (React + Node.js)',
      description: 'Complete tutorial showing how to build and deploy a modern web app...',
      thumbnail: '/api/placeholder/320/180',
      publishedAt: '2025-06-15T14:30:00Z',
      viewCount: 156000,
      duration: '32:18',
      status: 'public',
      engagement: { ctr: 9.1, avgViewDuration: 71, likeRatio: 95 },
      aiInsights: {
        titleOptimizationScore: 94,
        thumbnailScore: 88,
        contentCategory: 'Tutorial',
        suggestedImprovements: ['Perfect time-based hook', 'Clear value proposition'],
        viralPotential: 'High'
      }
    },
    {
      id: 'video-6',
      title: 'CSS Grid vs Flexbox: Which Should You Use in 2025?',
      description: 'Comprehensive comparison of modern CSS layout methods...',
      thumbnail: '/api/placeholder/320/180',
      publishedAt: '2025-06-10T11:00:00Z',
      viewCount: 73000,
      duration: '18:22',
      status: 'public',
      engagement: { ctr: 5.9, avgViewDuration: 55, likeRatio: 87 },
      aiInsights: {
        titleOptimizationScore: 79,
        thumbnailScore: 70,
        contentCategory: 'Tutorial',
        suggestedImprovements: ['Good comparison format', 'Consider adding "Complete Guide"'],
        viralPotential: 'Medium'
      }
    },
    {
      id: 'video-7',
      title: '10 VS Code Extensions That Will Change Your Life',
      description: 'Must-have extensions for developers to boost productivity...',
      thumbnail: '/api/placeholder/320/180',
      publishedAt: '2025-06-08T09:15:00Z',
      viewCount: 198000,
      duration: '16:33',
      status: 'public',
      engagement: { ctr: 8.5, avgViewDuration: 64, likeRatio: 93 },
      aiInsights: {
        titleOptimizationScore: 91,
        thumbnailScore: 82,
        contentCategory: 'Technology',
        suggestedImprovements: ['Excellent numbered list format', 'Strong emotional language'],
        viralPotential: 'High'
      }
    },
    {
      id: 'video-8',
      title: 'Why 90% of Developers Fail (And How to Be the 10%)',
      description: 'Common mistakes developers make and how to avoid them...',
      thumbnail: '/api/placeholder/320/180',
      publishedAt: '2025-06-05T13:45:00Z',
      viewCount: 267000,
      duration: '21:17',
      status: 'public',
      engagement: { ctr: 9.8, avgViewDuration: 68, likeRatio: 92 },
      aiInsights: {
        titleOptimizationScore: 96,
        thumbnailScore: 90,
        contentCategory: 'Career',
        suggestedImprovements: ['Outstanding statistic usage', 'Perfect curiosity gap'],
        viralPotential: 'High'
      }
    }
  ];

  useEffect(() => {
    // Reset and show loading state whenever component mounts
    setIsLoading(true);
    setVideos([]); // Clear videos to ensure fresh loading experience
    
    // Simulate loading and fetching videos with staged AI analysis
    const timer1 = setTimeout(() => {
      // Stage 1: Initial video analysis
      const timer2 = setTimeout(() => {
        // Stage 2: AI insights generation
        const timer3 = setTimeout(() => {
          // Stage 3: Optimization recommendations
          setVideos(demoVideos);
          setIsLoading(false);
        }, 400);
        
        return () => clearTimeout(timer3);
      }, 600);
      
      return () => clearTimeout(timer2);
    }, 800);
    
    // Cleanup function to clear timers if component unmounts
    return () => {
      clearTimeout(timer1);
      setIsLoading(false);
    };
  }, []);

  const generateAIInsights = async (videoId: string) => {
    setIsAnalyzing(videoId);
    
    // Simulate AI analysis with Claude
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const updatedVideos = videos.map(video => {
      if (video.id === videoId && !video.aiInsights) {
        return {
          ...video,
          aiInsights: {
            titleOptimizationScore: Math.floor(Math.random() * 30) + 70,
            thumbnailScore: Math.floor(Math.random() * 25) + 65,
            contentCategory: 'Entertainment',
            suggestedImprovements: [
              'Consider adding emotional trigger words',
              'Test shorter title variants for mobile',
              'Thumbnail could use more vibrant colors'
            ],
            viralPotential: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)] as 'Low' | 'Medium' | 'High'
          }
        };
      }
      return video;
    });
    
    setVideos(updatedVideos);
    setIsAnalyzing(null);
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterBy === 'high-ctr' && (!video.engagement?.ctr || video.engagement.ctr < 7)) return false;
    if (filterBy === 'viral-potential' && video.aiInsights?.viralPotential !== 'High') return false;
    
    return matchesSearch;
  });

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    switch (sortBy) {
      case 'views':
        return b.viewCount - a.viewCount;
      case 'ctr':
        return (b.engagement?.ctr || 0) - (a.engagement?.ctr || 0);
      case 'ai-score':
        return (b.aiInsights?.titleOptimizationScore || 0) - (a.aiInsights?.titleOptimizationScore || 0);
      default:
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const formatDuration = (duration: string) => {
    return duration;
  };

  const getViralPotentialColor = (potential: string) => {
    switch (potential) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Enhanced Video Card Skeleton Component with Shimmer Effects
  const VideoCardSkeleton = ({ index = 0 }: { index?: number }) => (
    <div 
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex p-4 space-x-4">
        {/* Thumbnail Skeleton with Shimmer */}
        <div className="relative flex-shrink-0">
          <div className="w-32 h-20 rounded-lg bg-gray-200 skeleton-shimmer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-pulse"></div>
          </div>
          <div className="absolute bottom-1 right-1">
            <div className="w-8 h-4 bg-gray-300 rounded skeleton-shimmer"></div>
          </div>
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full skeleton-shimmer flex items-center justify-center">
              <div className="w-3 h-3 bg-gray-400 rounded-sm"></div>
            </div>
          </div>
        </div>
        
        {/* Content Skeleton with Staggered Animation */}
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded skeleton-shimmer w-full"></div>
            <div className="h-4 bg-gray-200 rounded skeleton-shimmer w-3/4"></div>
          </div>
          
          {/* Stats Row Skeleton */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-gray-200 rounded skeleton-shimmer"></div>
              <div className="w-12 h-3 bg-gray-200 rounded skeleton-shimmer"></div>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-gray-200 rounded skeleton-shimmer"></div>
              <div className="w-16 h-3 bg-gray-200 rounded skeleton-shimmer"></div>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-gray-200 rounded skeleton-shimmer"></div>
              <div className="w-8 h-3 bg-gray-200 rounded skeleton-shimmer"></div>
            </div>
          </div>
          
          {/* AI Insights Skeleton with Pill Shapes */}
          <div className="flex items-center space-x-2">
            <div className="w-16 h-5 bg-gradient-to-r from-blue-200 to-blue-300 rounded-full skeleton-shimmer"></div>
            <div className="w-20 h-5 bg-gradient-to-r from-purple-200 to-purple-300 rounded-full skeleton-shimmer"></div>
            <div className="w-12 h-5 bg-gradient-to-r from-green-200 to-green-300 rounded-full skeleton-shimmer"></div>
          </div>
        </div>
        
        {/* Action Button Skeleton */}
        <div className="flex-shrink-0">
          <div className="w-20 h-8 bg-gradient-to-r from-blue-200 to-blue-300 rounded-lg skeleton-shimmer"></div>
        </div>
      </div>
    </div>
  );

  // Enhanced Loading State with Multiple Skeletons
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Section Skeleton */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                <Bot className="w-8 h-8 text-white animate-bounce" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce delay-300">
                <Sparkles className="w-3 h-3 text-yellow-800" />
              </div>
            </div>
          </div>
          
          {/* Progress Indicators */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-150"></div>
              <Skeleton className="h-3 w-56" />
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-300"></div>
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </div>

        {/* Search and Filter Skeleton */}
        <div className="flex space-x-4">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>

        {/* Video Grid Skeleton */}
        <div className="space-y-4">
          {[...Array(6)].map((_, index) => (
            <VideoCardSkeleton key={index} index={index} />
          ))}
        </div>

        {/* Loading Text with Enhanced Animation */}
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-3 text-sm text-gray-600">
            <div className="relative">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
            </div>
            <span className="animate-pulse font-medium">Analyzing your YouTube videos...</span>
          </div>
          
          {/* Progress indicators */}
          <div className="mt-4 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-150"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-300"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Clean Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Select Video</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="views">Most Views</SelectItem>
              <SelectItem value="ctr">Best CTR</SelectItem>
              <SelectItem value="ai-score">AI Score</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Clean Video List */}
      <div className={`space-y-3 max-h-96 overflow-y-auto ${isExpanded ? 'max-h-full' : ''}`}>
        {sortedVideos.map((video) => (
          <div
            key={video.id}
            className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
              selectedVideoId === video.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onClick={() => onSelectVideo(video)}
          >
            {/* Thumbnail */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-16 bg-gray-200 rounded overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                  <PlayCircle className="w-6 h-6 text-white opacity-70" />
                </div>
              </div>
              <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded text-[10px]">
                {formatDuration(video.duration)}
              </div>
            </div>
            
            {/* Video Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 line-clamp-2 text-sm leading-tight">
                {video.title}
              </h4>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                <span>{formatNumber(video.viewCount)} views</span>
                <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
                {video.engagement && (
                  <>
                    <span className="text-green-600">{video.engagement.ctr}% CTR</span>
                    {video.aiInsights && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        AI: {video.aiInsights.titleOptimizationScore}/100
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Quick AI Insight */}
            {video.aiInsights && (
              <div className="flex-shrink-0 text-right">
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getViralPotentialColor(video.aiInsights.viralPotential)}`}>
                  <Zap className="w-3 h-3" />
                  {video.aiInsights.viralPotential}
                </div>
              </div>
            )}

            {/* Selection Indicator */}
            {selectedVideoId === video.id && (
              <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}

            {/* AI Analysis Button */}
            {!video.aiInsights && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  generateAIInsights(video.id);
                }}
                disabled={isAnalyzing === video.id}
                className="flex-shrink-0 text-xs px-2 py-1 h-8"
              >
                {isAnalyzing === video.id ? (
                  <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Bot className="w-3 h-3" />
                )}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* AI Insights Panel (Only when expanded) */}
      {isExpanded && selectedVideoId && (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          {(() => {
            const selectedVideo = sortedVideos.find(v => v.id === selectedVideoId);
            if (!selectedVideo?.aiInsights) return null;
            
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-500" />
                  <h4 className="font-medium text-gray-900">AI Optimization Insights</h4>
                  <Badge variant="outline" className="ml-auto">
                    Score: {selectedVideo.aiInsights.titleOptimizationScore}/100
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700 mb-2">Suggestions:</p>
                    <ul className="space-y-1 text-gray-600">
                      {selectedVideo.aiInsights.suggestedImprovements.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <Badge variant="secondary">{selectedVideo.aiInsights.contentCategory}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Viral Potential:</span>
                      <Badge className={getViralPotentialColor(selectedVideo.aiInsights.viralPotential)}>
                        {selectedVideo.aiInsights.viralPotential}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {sortedVideos.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No videos found matching your search</p>
        </div>
      )}
    </div>
  );
}