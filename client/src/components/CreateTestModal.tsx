import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  viewCount: number;
  publishedAt: string;
  analytics?: {
    impressions: number;
    ctr: number;
  };
}

export default function CreateTestModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [titleVariants, setTitleVariants] = useState(['', '']);
  const [rotationInterval, setRotationInterval] = useState(30);
  const [testDuration, setTestDuration] = useState(24);

  // Fetch user's YouTube videos with analytics
  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ['/api/youtube/videos-with-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/youtube/videos-with-analytics', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch videos');
      return response.json();
    }
  });

  const createTestMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to create test');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Test created successfully!' });
      onSuccess();
    },
    onError: () => {
      toast({
        title: 'Failed to create test',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = () => {
    if (!selectedVideo || titleVariants.some(t => !t.trim())) {
      toast({ 
        title: 'Please select a video and enter all title variants',
        variant: 'destructive'
      });
      return;
    }

    createTestMutation.mutate({
      videoId: selectedVideo.id,
      videoTitle: selectedVideo.title,
      thumbnailUrl: selectedVideo.thumbnail,
      titles: titleVariants.filter(t => t.trim()),
      rotationIntervalMinutes: rotationInterval,
      winnerMetric: 'ctr',
      testDurationHours: testDuration
    });
  };

  const addTitleVariant = () => {
    if (titleVariants.length < 5) {
      setTitleVariants([...titleVariants, '']);
    }
  };

  const removeTitleVariant = (index: number) => {
    if (titleVariants.length > 2) {
      setTitleVariants(titleVariants.filter((_, i) => i !== index));
    }
  };

  const updateTitleVariant = (index: number, value: string) => {
    const updated = [...titleVariants];
    updated[index] = value;
    setTitleVariants(updated);
  };



  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">Create New A/B Test</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Video Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Select Video</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No videos found. Upload videos to your YouTube channel first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className={`
                      border-2 rounded-lg p-3 cursor-pointer transition-all
                      ${selectedVideo?.id === video.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-24 object-cover rounded mb-2"
                    />
                    <h4 className="font-medium text-sm line-clamp-2">{video.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {video.viewCount.toLocaleString()} views
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Title Variants */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Title Variants</h3>
              <Button
                onClick={addTitleVariant}
                disabled={titleVariants.length >= 5}
                size="sm"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Variant
              </Button>
            </div>
            <div className="space-y-3">
              {titleVariants.map((title, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Title variant ${index + 1}`}
                    value={title}
                    onChange={(e) => updateTitleVariant(index, e.target.value)}
                    className="flex-1"
                  />
                  {titleVariants.length > 2 && (
                    <Button
                      onClick={() => removeTitleVariant(index)}
                      size="icon"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Test Settings */}
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-2">Rotation Interval</Label>
              <Select 
                value={rotationInterval.toString()} 
                onValueChange={(v) => setRotationInterval(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every hour</SelectItem>
                  <SelectItem value="120">Every 2 hours</SelectItem>
                  <SelectItem value="360">Every 6 hours</SelectItem>
                  <SelectItem value="1440">Every 24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-base font-semibold mb-2">Test Duration</Label>
              <Select 
                value={testDuration.toString()} 
                onValueChange={(v) => setTestDuration(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">3 days</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                  <SelectItem value="336">14 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedVideo || titleVariants.some(t => !t.trim()) || createTestMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {createTestMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Test'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createTestMutation.isPending}
            >
              {createTestMutation.isPending ? 'Creating...' : 'Start A/B Test'}
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}
