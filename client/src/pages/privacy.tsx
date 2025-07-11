export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <a href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800">
            ← Back to Home
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Privacy Policy for TitleTesterPro
            </h1>
            <p className="text-gray-600">Last updated: June 18, 2025</p>
          </div>
          
          <div className="prose max-w-none">
            <p className="text-gray-700 mb-6">
              Welcome to TitleTesterPro ("we", "our", or "us"). This Privacy Policy explains how we collect, use, and protect your
              information when you use our web application at https://titletesterpro.com.
            </p>

            <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="mb-4">
              We collect the following information through your Google account when you sign in:
            </p>
            <ul className="list-disc ml-6 mb-6 space-y-1">
              <li>Your Google email address</li>
              <li>Your public YouTube profile</li>
              <li>Access to your uploaded videos</li>
              <li>Permission to update the titles of your videos for testing purposes</li>
            </ul>
            <p className="mb-6">
              We do not access private videos, comments, subscriptions, or upload/delete any content on your behalf.
            </p>

            <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="mb-4">We use your data to:</p>
            <ul className="list-disc ml-6 mb-6 space-y-1">
              <li>Authenticate your YouTube account</li>
              <li>Allow you to select videos for title testing</li>
              <li>Temporarily update video titles to run A/B tests</li>
              <li>Display analytics from your YouTube dashboard</li>
            </ul>
            <p className="mb-6">
              We do not sell, rent, or share your personal data with third parties.
            </p>

            <h2 className="text-xl font-semibold mb-4">3. Data Storage and Security</h2>
            <ul className="list-disc ml-6 mb-6 space-y-1">
              <li>All access tokens and refresh tokens are encrypted at rest.</li>
              <li>We use secure HTTPS connections.</li>
              <li>Only essential data is stored for analytics and test performance tracking.</li>
            </ul>

            <h2 className="text-xl font-semibold mb-4">4. Third-Party Services</h2>
            <p className="mb-4">We use the following Google APIs:</p>
            <ul className="list-disc ml-6 mb-6 space-y-1">
              <li>YouTube Data API v3</li>
              <li>Google OAuth2 (Sign-in)</li>
            </ul>
            <p className="mb-6">
              You may revoke our access at any time via your Google account permissions page:{' '}
              <a 
                href="https://myaccount.google.com/permissions" 
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://myaccount.google.com/permissions
              </a>
            </p>

            <h2 className="text-xl font-semibold mb-4">5. Your Rights</h2>
            <p className="mb-4">You may:</p>
            <ul className="list-disc ml-6 mb-6 space-y-1">
              <li>Request deletion of your account and associated data</li>
              <li>View and manage the titles being tested</li>
              <li>Disconnect your Google account at any time</li>
            </ul>
            <p className="mb-6">
              To request data deletion, email:{' '}
              <a href="mailto:kaseydoesmarketing@gmail.com" className="text-blue-600 hover:underline">
                kaseydoesmarketing@gmail.com
              </a>
            </p>

            <h2 className="text-xl font-semibold mb-4">6. Contact Us</h2>
            <p>
              If you have questions or concerns, please contact:{' '}
              <a href="mailto:kaseydoesmarketing@gmail.com" className="text-blue-600 hover:underline">
                kaseydoesmarketing@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}