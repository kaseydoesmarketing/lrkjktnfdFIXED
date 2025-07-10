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
        scopes: 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/yt-analytics.readonly',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
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