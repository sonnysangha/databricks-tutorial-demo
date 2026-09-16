"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="panel p-8">
      <h1 className="text-xl font-semibold">Feedback could not be loaded</h1>
      <p className="mt-3 text-sm text-muted">
        Check the Databricks connection and saved data, then try again. No
        sample data or partial totals have been substituted.
      </p>
      <button onClick={reset} className="primary-button mt-5">
        Try again
      </button>
    </div>
  );
}
