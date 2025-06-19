import { Link } from 'wouter';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center space-x-6">
            <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Privacy Policy
            </Link>
            <span className="text-gray-400">•</span>
            <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Terms of Service
            </Link>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              © 2025 TitleTesterPro. All rights reserved.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Contact: <a href="mailto:kaseydoesmarketing@gmail.com" className="hover:text-gray-600">kaseydoesmarketing@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}