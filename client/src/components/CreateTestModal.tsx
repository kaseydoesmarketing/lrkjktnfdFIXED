import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CreateTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateTestModal({ isOpen, onClose }: CreateTestModalProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [rotationInterval, setRotationInterval] = useState('30');
  const [titles, setTitles] = useState(['', '']);
  const [winnerMetric, setWinnerMetric] = useState('ctr');
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
    
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      toast({
        title: 'Error',
        description: 'Please enter a valid YouTube URL',
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

    createTestMutation.mutate({
      videoId,
      videoTitle: validTitles[0], // Use first title as default video title
      titles: validTitles,
      rotationIntervalMinutes: parseInt(rotationInterval),
      winnerMetric,
    });
  };

  const handleClose = () => {
    setVideoUrl('');
    setRotationInterval('30');
    setTitles(['', '']);
    setWinnerMetric('ctr');
    onClose();
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
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New A/B Test</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video URL Input */}
          <div>
            <Label htmlFor="videoUrl">YouTube Video URL</Label>
            <Input
              id="videoUrl"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
            />
          </div>

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

          {/* Title Variants */}
          <div>
            <Label>Title Variants (2-5 titles)</Label>
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
