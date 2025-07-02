import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Video, Calendar } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import FuturisticVideoSelector from '@/components/FuturisticVideoSelector';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

interface CreateTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateTestModal({ isOpen, onClose }: CreateTestModalProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [rotationInterval, setRotationInterval] = useState('30');
  const [titles, setTitles] = useState(['', '']);
  const [winnerMetric, setWinnerMetric] = useState('ctr');
  const [activeTab, setActiveTab] = useState('select');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
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

  const extractVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let videoId = '';
    let videoTitle = '';
    
    if (activeTab === 'select' && selectedVideo) {
      videoId = selectedVideo.id;
      videoTitle = selectedVideo.title;
    } else if (activeTab === 'manual') {
      const extractedId = extractVideoId(videoUrl);
      if (!extractedId) {
        toast({
          title: 'Error',
          description: 'Please enter a valid YouTube URL',
          variant: 'destructive',
        });
        return;
      }
      videoId = extractedId;
      videoTitle = titles[0] || 'YouTube Video';
    } else {
      toast({
        title: 'Error',
        description: 'Please select a video or enter a YouTube URL',
        variant: 'destructive',
      });
      return;
    }

    const validTitles = titles.filter(title => title.trim() !== '');
    if (validTitles.length < 2) {
      toast({
        title: 'Error',
        description: 'Please enter at least 2 title variants',
        variant: 'destructive',
      });
      return;
    }

    // Validate dates
    if (endDate <= startDate) {
      toast({
        title: 'Error',
        description: 'End date must be after start date',
        variant: 'destructive',
      });
      return;
    }

    createTestMutation.mutate({
      videoId,
      videoTitle,
      titles: validTitles,
      rotationIntervalMinutes: parseInt(rotationInterval),
      winnerMetric,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  };

  const handleClose = () => {
    setVideoUrl('');
    setSelectedVideo(null);
    setRotationInterval('30');
    setTitles(['', '']);
    setWinnerMetric('ctr');
    setActiveTab('select');
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    onClose();
  };

  const handleVideoSelect = (video: any) => {
    setSelectedVideo(video);
    // Pre-populate first title with current video title
    const newTitles = [...titles];
    if (newTitles[0] === '') {
      newTitles[0] = video.title;
      setTitles(newTitles);
    }
  };

  const addTitleVariant = () => {
    if (titles.length < 5) {
      setTitles([...titles, '']);
    }
  };

  const removeTitleVariant = (index: number) => {
    if (titles.length > 2) {
      setTitles(titles.filter((_, i) => i !== index));
    }
  };

  const updateTitle = (index: number, value: string) => {
    const newTitles = [...titles];
    newTitles[index] = value;
    setTitles(newTitles);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New A/B Test</DialogTitle>
          <p className="text-sm text-gray-600">
            Select a video from your channel or enter a YouTube URL to start testing titles
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video Selection Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="select" className="flex items-center space-x-2">
                <Video className="w-4 h-4" />
                <span>Select from Channel</span>
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Enter URL Manually</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="select" className="mt-4">
              <FuturisticVideoSelector 
                onSelectVideo={handleVideoSelect}
                selectedVideoId={selectedVideo?.id}
              />
              {selectedVideo && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Selected:</strong> {selectedVideo.title}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Ready to create A/B test with this video
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="manual" className="mt-4">
              <div>
                <Label htmlFor="videoUrl">YouTube Video URL</Label>
                <Input
                  id="videoUrl"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required={activeTab === 'manual'}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Rotation Interval */}
          <div>
            <Label>Rotation Interval</Label>
            <Select value={rotationInterval} onValueChange={setRotationInterval}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
                <SelectItem value="480">8 hours</SelectItem>
                <SelectItem value="720">12 hours</SelectItem>
                <SelectItem value="1440">24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Test Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(startDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <input
                    type="date"
                    className="w-full p-3 border rounded-md"
                    value={format(startDate, "yyyy-MM-dd")}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(endDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <input
                    type="date"
                    className="w-full p-3 border rounded-md"
                    value={format(endDate, "yyyy-MM-dd")}
                    onChange={(e) => setEndDate(new Date(e.target.value))}
                    min={format(new Date(startDate.getTime() + 24 * 60 * 60 * 1000), "yyyy-MM-dd")}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-sm text-gray-600 mt-1">
                No maximum time limit - run tests as long as needed
              </p>
            </div>
          </div>

          {/* Title Variants */}
          <div>
            <Label>Title Variants (2-5 titles)</Label>
            <p className="text-sm text-gray-600 mb-3">
              TitleTesterPro will automatically change your video's title on YouTube according to the rotation schedule. 
              Each title will be tested for the duration you specify, and analytics will be collected to determine the winner.
            </p>
            <div className="space-y-3 mt-2">
              {titles.map((title, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Input
                    value={title}
                    onChange={(e) => updateTitle(index, e.target.value)}
                    placeholder={`Enter title variant ${index + 1}...`}
                    required
                  />
                  {titles.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTitleVariant(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {titles.length < 5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTitleVariant}
                className="mt-3 text-primary hover:text-indigo-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add another variant
              </Button>
            )}
          </div>

          {/* Winner Metric */}
          <div>
            <Label>Winner Determination</Label>
            <RadioGroup value={winnerMetric} onValueChange={setWinnerMetric} className="mt-2">
              <div className="grid grid-cols-2 gap-4">
                <Label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="ctr" />
                  <div>
                    <div className="font-medium text-gray-900">Click-Through Rate</div>
                    <div className="text-sm text-gray-600">Best CTR wins</div>
                  </div>
                </Label>
                <Label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="avd" />
                  <div>
                    <div className="font-medium text-gray-900">View Duration</div>
                    <div className="text-sm text-gray-600">Longest AVD wins</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Actions */}
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
