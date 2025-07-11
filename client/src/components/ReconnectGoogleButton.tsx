import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function ReconnectGoogleButton() {
  const handleReconnect = async () => {
    console.log('🔄 [RECONNECT] Initiating Google OAuth reconnect...');
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          include_granted_scopes: 'true',
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/youtube',
            'https://www.googleapis.com/auth/youtube.force-ssl',
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/yt-analytics.readonly'
          ].join(' ')
        }
      }
    });
  };

  return (
    <Button 
      onClick={handleReconnect}
      variant="outline"
      className="gap-2"
    >
      <RefreshCw className="h-4 w-4" />
      Reconnect Google Account
    </Button>
  );
}