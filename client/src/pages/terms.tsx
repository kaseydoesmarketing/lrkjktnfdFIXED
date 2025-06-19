import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function Terms() {

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            asChild
            className="mb-4"
          >
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Terms of Service for TitleTesterPro
            </CardTitle>
            <p className="text-center text-gray-600">Effective Date: June 18, 2025</p>
          </CardHeader>
          <CardContent className="prose max-w-none">
            <p className="text-gray-700 mb-6">
              Welcome to TitleTesterPro. These Terms of Service ("Terms") govern your access and use of our web application
              ("Service").
            </p>
            <p className="mb-6">
              By using our application, you agree to the following terms:
            </p>

            <h2 className="text-xl font-semibold mb-4">1. Use of the Service</h2>
            <p className="mb-4">
              TitleTesterPro provides tools for YouTube creators to A/B test different video titles and analyze performance metrics
              (e.g., CTR, views, watch time).
            </p>
            <p className="mb-4">You agree to:</p>
            <ul className="list-disc ml-6 mb-6 space-y-1">
              <li>Use the app only on videos you own</li>
              <li>Not manipulate analytics data or artificially inflate views</li>
              <li>Abide by YouTube's Terms of Service and community guidelines</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4">2. Account Requirements</h2>
            <p className="mb-4">You must:</p>
            <ul className="list-disc ml-6 mb-6 space-y-1">
              <li>Be 13 years or older</li>
              <li>Have a valid Google account</li>
              <li>Own or manage the YouTube channel associated with the videos being tested</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4">3. Limitation of Liability</h2>
            <p className="mb-4">We are not responsible for:</p>
            <ul className="list-disc ml-6 mb-6 space-y-1">
              <li>Decrease in YouTube performance caused by testing</li>
              <li>API downtime or errors from Google services</li>
              <li>Any account suspension related to misuse of the YouTube platform</li>
            </ul>
            <p className="mb-6">
              Use this tool at your own discretion. It is intended for educational and optimization purposes only.
            </p>

            <h2 className="text-xl font-semibold mb-4">4. API Access and Rate Limits</h2>
            <p className="mb-6">
              TitleTesterPro depends on Google's YouTube API. Excessive usage or misuse of the platform may result in limitations
              or bans from Google, which are outside our control.
            </p>

            <h2 className="text-xl font-semibold mb-4">5. Termination</h2>
            <p className="mb-4">We reserve the right to suspend or delete your access if:</p>
            <ul className="list-disc ml-6 mb-6 space-y-1">
              <li>You violate these terms</li>
              <li>You abuse the app or attempt to access unauthorized data</li>
              <li>Google revokes or restricts our API access</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4">6. Modifications</h2>
            <p className="mb-6">
              We may update these Terms from time to time. You'll be notified of major changes via email or in-app banners.
            </p>

            <h2 className="text-xl font-semibold mb-4">7. Contact</h2>
            <p>
              If you have any questions, reach out to:{' '}
              <a href="mailto:kaseydoesmarketing@gmail.com" className="text-blue-600 hover:underline">
                kaseydoesmarketing@gmail.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}