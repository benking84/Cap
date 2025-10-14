"use client";

export default function Error({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col justify-center items-center p-6 min-h-screen text-center">
      <h1 className="mb-2 text-2xl font-semibold">Something went wrong</h1>
      <p className="mb-4 text-gray-500">Please try again.</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 text-white rounded-md bg-blue-600"
      >
        Reload
      </button>
    </div>
  );
}


