import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Video, 
  Calendar, 
  Sparkles, 
  Bot, 
  Copy, 
  Check,
  Zap,
  Crown,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import FuturisticVideoSelector from '@/components/FuturisticVideoSelector';

interface IntegratedCreateTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export default function IntegratedCreateTestModal({ isOpen, onClose }: IntegratedCreateTestModalProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [titles, setTitles] = useState(['', '', '', '', '']);
  const [rotationInterval, setRotationInterval] = useState('60');
  const [winnerMetric, setWinnerMetric] = useState('ctr');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [activeTab, setActiveTab] = useState('video');
  
  // AI Title Generation
  const [videoTopic, setVideoTopic] = useState('');
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [appliedTitles, setAppliedTitles] = useState<boolean[]>([false, false, false, false, false]);
  const [refreshCount, setRefreshCount] = useState(0);

  const { toast } = useToast();

  const createTestMutation = useMutation({
    mutationFn: async (testData: any) => {
      const response = await apiRequest('POST', '/api/tests', testData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: 'Success',
        description: 'A/B test created successfully!',
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create test',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setSelectedVideo(null);
    setTitles(['', '', '', '', '']);
    setRotationInterval('60');
    setWinnerMetric('ctr');
    setActiveTab('video');
    setVideoTopic('');
    setTitleSuggestions([]);
    setAppliedTitles([false, false, false, false, false]);
    setRefreshCount(0);
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    onClose();
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
    // Pre-populate first title with current video title
    const newTitles = [...titles];
    if (newTitles[0] === '') {
      newTitles[0] = video.title;
      setTitles(newTitles);
    }
    // Auto-populate video topic for AI generation
    setVideoTopic(video.title);
    setActiveTab('titles');
  };

  const generateAITitles = async () => {
    if (!videoTopic.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a video topic first',
        variant: 'destructive',
      });
      return;
    }

    if (refreshCount >= 5) {
      toast({
        title: 'Limit Reached',
        description: 'Maximum of 5 title refreshes reached',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingTitles(true);
    try {
      const response = await fetch('/api/generate-titles', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: videoTopic,
          framework: 'YouTube Title Mastery 2024-2025'
        })
      });

      if (!response.ok) {
        if (response.status === 403) {
          toast({
            title: 'Authority Plan Required',
            description: 'AI Title Generation is exclusive to Authority Plan subscribers',
            variant: 'destructive',
          });
          return;
        }
        throw new Error('Failed to generate titles');
      }

      const data = await response.json();
      setTitleSuggestions(data.titles);
      setRefreshCount(prev => prev + 1);
      setAppliedTitles([false, false, false, false, false]);

    } catch (error) {
      console.error('Error generating titles:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI titles',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  const applyTitleToSlot = (suggestionIndex: number, slotIndex: number) => {
    const newTitles = [...titles];
    newTitles[slotIndex] = titleSuggestions[suggestionIndex];
    setTitles(newTitles);

    const newAppliedTitles = [...appliedTitles];
    newAppliedTitles[slotIndex] = true;
    setAppliedTitles(newAppliedTitles);

    toast({
      title: 'Title Applied',
      description: `Title applied to slot ${slotIndex + 1}`,
    });
  };

  const updateTitle = (index: number, value: string) => {
    const newTitles = [...titles];
    newTitles[index] = value;
    setTitles(newTitles);

    const newAppliedTitles = [...appliedTitles];
    newAppliedTitles[index] = false;
    setAppliedTitles(newAppliedTitles);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVideo) {
      toast({
        title: 'Error',
        description: 'Please select a video',
        variant: 'destructive',
      });
      return;
    }

    const validTitles = titles.filter(title => title.trim() !== '');
    if (validTitles.length < 2) {
      toast({
        title: 'Error',
        description: 'Please provide at least 2 title variants',
        variant: 'destructive',
      });
      return;
    }

    if (endDate <= startDate) {
      toast({
        title: 'Error',
        description: 'End date must be after start date',
        variant: 'destructive',
      });
      return;
    }

    createTestMutation.mutate({
      videoId: selectedVideo.id,
      videoTitle: selectedVideo.title,
      titles: validTitles,
      rotationIntervalMinutes: parseInt(rotationInterval),
      winnerMetric,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            Create New A/B Test
          </DialogTitle>
          <p className="text-sm text-gray-600">
            AI-powered title optimization for maximum CTR and engagement
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="video" className="flex items-center space-x-2">
                <Video className="w-4 h-4" />
                <span>1. Select Video</span>
              </TabsTrigger>
              <TabsTrigger value="titles" className="flex items-center space-x-2" disabled={!selectedVideo}>
                <Bot className="w-4 h-4" />
                <span>2. Generate Titles</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-2" disabled={!selectedVideo}>
                <Calendar className="w-4 h-4" />
                <span>3. Test Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Video Selection */}
            <TabsContent value="video" className="mt-6">
              <FuturisticVideoSelector 
                onSelectVideo={handleVideoSelect}
                selectedVideoId={selectedVideo?.id}
              />
              
              {selectedVideo && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-800">
                        <strong>Selected:</strong> {selectedVideo.title}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Ready to generate optimized titles for A/B testing
                      </p>
                    </div>
                    <Button 
                      type="button"
                      onClick={() => setActiveTab('titles')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Next: Generate Titles <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* AI Title Generation & Management */}
            <TabsContent value="titles" className="mt-6 space-y-6">
              {/* AI Title Generator */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">AI-Powered Title Suggestions</h3>
                    <p className="text-orange-700">Authority Plan Exclusive - Powered by YouTube Title Mastery Framework</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="videoTopic">Video Topic or Description</Label>
                    <Input
                      id="videoTopic"
                      value={videoTopic}
                      onChange={(e) => setVideoTopic(e.target.value)}
                      placeholder="e.g., JavaScript tutorial for beginners, React hooks explained..."
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {refreshCount}/5 title refreshes used
                    </div>
                    <Button
                      type="button"
                      onClick={generateAITitles}
                      disabled={isGeneratingTitles || refreshCount >= 5 || !videoTopic.trim()}
                      className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                    >
                      {isGeneratingTitles ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate AI Titles
                        </>
                      )}
                    </Button>
                  </div>

                  {/* AI Suggestions */}
                  {titleSuggestions.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-3">AI-Generated Suggestions:</h4>
                      <div className="space-y-2">
                        {titleSuggestions.map((suggestion, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                            <span className="text-gray-900 flex-1">{suggestion}</span>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(suggestion);
                                  toast({ title: 'Copied!', description: 'Title copied to clipboard' });
                                }}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Select onValueChange={(slot) => applyTitleToSlot(index, parseInt(slot))}>
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Apply to..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {titles.map((_, slotIndex) => (
                                    <SelectItem key={slotIndex} value={slotIndex.toString()}>
                                      Title Slot {slotIndex + 1}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Title Variants */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-4">Title Variants (2-5 required)</h4>
                <div className="space-y-3">
                  {titles.map((title, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Label className="w-16 text-sm text-gray-600">Title {index + 1}:</Label>
                        <Input
                          value={title}
                          onChange={(e) => updateTitle(index, e.target.value)}
                          placeholder={index < 2 ? "Required" : "Optional"}
                          className={appliedTitles[index] ? "border-green-300 bg-green-50" : ""}
                        />
                        {appliedTitles[index] && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <Check className="w-3 h-3 mr-1" />
                            AI Applied
                          </Badge>
                        )}
                      </div>
                      {index >= 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateTitle(index, '')}
                          className="text-gray-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-between">
                  <p className="text-sm text-gray-600">
                    {titles.filter(t => t.trim()).length}/5 titles entered
                  </p>
                  <Button 
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    disabled={titles.filter(t => t.trim()).length < 2}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Next: Test Settings <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Test Settings */}
            <TabsContent value="settings" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="rotationInterval">Rotation Interval</Label>
                  <Select value={rotationInterval} onValueChange={setRotationInterval}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="360">6 hours</SelectItem>
                      <SelectItem value="720">12 hours</SelectItem>
                      <SelectItem value="1440">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="winnerMetric">Success Metric</Label>
                  <Select value={winnerMetric} onValueChange={setWinnerMetric}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ctr">Click-Through Rate (CTR)</SelectItem>
                      <SelectItem value="views">Total Views</SelectItem>
                      <SelectItem value="combined">Combined Metrics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    type="datetime-local"
                    value={startDate.toISOString().slice(0, 16)}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    type="datetime-local"
                    value={endDate.toISOString().slice(0, 16)}
                    onChange={(e) => setEndDate(new Date(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-6">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTestMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createTestMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating Test...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Create A/B Test
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}