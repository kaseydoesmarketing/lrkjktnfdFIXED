import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Channel {
  id: string;
  title: string;
  thumbnail: string;
}

export default function SelectChannel() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/auth/channels', { 
        credentials: 'include' 
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }
      
      const data = await response.json();
      setChannels(data.channels);
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast({
        title: 'Error',
        description: 'Failed to load YouTube channels. Please try logging in again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChannel = async (channelId: string, channelTitle: string) => {
    setSelecting(true);
    try {
      const response = await fetch('/api/auth/save-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          channelId, 
          channelTitle 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save channel selection');
      }

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error saving channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to save channel selection. Please try again.',
        variant: 'destructive'
      });
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your YouTube channels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Select Your YouTube Channel</CardTitle>
            <p className="text-gray-600 mt-2">
              We found multiple channels associated with your Google account. 
              Please select the channel you want to use with TitleTesterPro.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {channels.map((channel) => (
                <Card 
                  key={channel.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleSelectChannel(channel.id, channel.title)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <img 
                        src={channel.thumbnail} 
                        alt={channel.title}
                        className="w-16 h-16 rounded-full"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{channel.title}</h3>
                        <p className="text-sm text-gray-500">ID: {channel.id}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={selecting}
                      >
                        {selecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Select'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}