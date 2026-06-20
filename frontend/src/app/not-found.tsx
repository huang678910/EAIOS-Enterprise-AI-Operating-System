import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="text-center px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-blue-50 flex items-center justify-center">
          <span className="text-4xl font-bold text-blue-500">404</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-sm text-gray-500 mb-8 max-w-md">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          Back to Chat
        </Link>
      </div>
    </div>
  );
}
