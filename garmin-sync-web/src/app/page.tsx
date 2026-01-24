import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">Garmin Sync</span>
          </div>
          <nav className="flex gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center max-w-2xl">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
            Plan workouts with AI.
            <br />
            Push to your Garmin.
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-400 px-2">
            Type your workout in plain English. Our AI parses it, syncs to your Garmin watch,
            and tracks your progress. Simple strength training, finally.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link href="/signup">Get started free</Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="border-t border-slate-200/50 dark:border-slate-800/50 py-12 sm:py-16 bg-white/50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4 sm:px-6">
          <h2 className="sr-only">Features</h2>
          <div className="grid gap-8 sm:gap-10 md:grid-cols-3">
            <div className="text-center px-4">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4" aria-hidden="true">💬</div>
              <h3 className="font-semibold text-base sm:text-lg text-slate-900 dark:text-white">Plain Text Input</h3>
              <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm sm:text-base">
                &quot;Bench 3x10 @ 185, Rows 3x12 @ 135&quot; – that&apos;s all you need
              </p>
            </div>
            <div className="text-center px-4">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4" aria-hidden="true">⌚</div>
              <h3 className="font-semibold text-base sm:text-lg text-slate-900 dark:text-white">Garmin Sync</h3>
              <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm sm:text-base">
                Push workouts to your watch. Track sets, reps, and rest timers.
              </p>
            </div>
            <div className="text-center px-4">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4" aria-hidden="true">🤖</div>
              <h3 className="font-semibold text-base sm:text-lg text-slate-900 dark:text-white">AI Coach</h3>
              <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm sm:text-base">
                Ask Gemini to plan your week. Analyze your progress. Get smarter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 dark:border-slate-800/50 py-6 sm:py-8">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Built for lifters who just want to train.
            </p>
            <nav className="flex gap-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              <Link href="/support" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Support
              </Link>
              <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Privacy
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
