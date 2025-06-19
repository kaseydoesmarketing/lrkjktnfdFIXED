import { Button } from "@/components/ui/button";

interface DemoModeButtonProps {
  onEnterDemo: () => void;
}

export default function DemoModeButton({ onEnterDemo }: DemoModeButtonProps) {
  return (
    <div className="text-center space-y-4">
      <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Demo Mode Available
        </h3>
        <p className="text-blue-700 mb-4">
          Experience TitleTesterPro with sample data while we complete YouTube API verification.
        </p>
        <Button 
          onClick={onEnterDemo}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Enter Demo Mode
        </Button>
      </div>
      
      <div className="text-sm text-gray-600">
        <p>
          <strong>Note:</strong> Demo mode uses sample YouTube data to showcase functionality.
          Full YouTube integration will be available after Google OAuth verification.
        </p>
      </div>
    </div>
  );
}