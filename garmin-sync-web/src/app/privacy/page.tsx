import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy - Garmin Sync',
  description: 'Privacy policy for Garmin Sync workout app',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">Garmin Sync</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Privacy Policy</h1>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Last updated: January 19, 2026
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">What We Collect</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Garmin Sync collects the minimum data necessary to provide the service:
            </p>
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
              <li><strong>Account information:</strong> Email address for authentication</li>
              <li><strong>Garmin connection:</strong> OAuth tokens to sync workouts with your Garmin account</li>
              <li><strong>Workout data:</strong> Workouts you create and activities synced from Garmin</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">How We Use Your Data</h2>
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
              <li>To authenticate you and provide access to your account</li>
              <li>To push workouts to your Garmin device</li>
              <li>To sync and display your completed activities</li>
              <li>To improve the service based on usage patterns</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Data Storage</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Your data is stored securely using Supabase, which provides enterprise-grade security
              including encryption at rest and in transit. Garmin OAuth tokens are encrypted before storage.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Third-Party Services</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
              <li><strong>Supabase:</strong> Authentication and database</li>
              <li><strong>Garmin Connect:</strong> Workout sync (via your authorized connection)</li>
              <li><strong>Google Gemini:</strong> AI-powered workout text parsing (your workout text is processed but not stored by Google)</li>
              <li><strong>Vercel:</strong> Hosting</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Your Rights</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              You can:
            </p>
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
              <li>Disconnect your Garmin account at any time</li>
              <li>Request deletion of your account and all associated data</li>
              <li>Export your workout data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Contact</h2>
            <p className="text-slate-600 dark:text-slate-300">
              For privacy questions or data requests, contact us at{' '}
              <a
                href="mailto:daniel.ensign+gsync@gmail.com"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                daniel.ensign+gsync@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            &larr; Back to Home
          </Link>
        </div>
      </main>
    </div>
  )
}
