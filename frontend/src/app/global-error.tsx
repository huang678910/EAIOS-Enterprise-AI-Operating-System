"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-[#f8fafc]">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-50 flex items-center justify-center">
              <span className="text-3xl font-bold text-red-500">!</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Critical Error</h1>
            <p className="text-sm text-gray-500 mb-8 max-w-md">
              The application encountered a critical error. Please refresh the page.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
