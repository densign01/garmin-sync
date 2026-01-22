import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="text-xl font-bold">Garmin Sync</div>
          <nav className="flex gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Plan workouts with AI.
            <br />
            Push to your Garmin.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Type your workout in plain English. Our AI parses it, syncs to your Garmin watch,
            and tracks your progress. Simple strength training, finally.
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/signup">Get started free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="border-t py-16">
        <div className="container mx-auto px-4">
          <h2 className="sr-only">Features</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="text-3xl mb-4" aria-hidden="true">💬</div>
              <h3 className="font-semibold text-lg">Plain Text Input</h3>
              <p className="text-muted-foreground mt-2">
                &quot;Bench 3x10 @ 185, Rows 3x12 @ 135&quot; – that&apos;s all you need
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-4" aria-hidden="true">⌚</div>
              <h3 className="font-semibold text-lg">Garmin Sync</h3>
              <p className="text-muted-foreground mt-2">
                Push workouts to your watch. Track sets, reps, and rest timers.
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-4" aria-hidden="true">🤖</div>
              <h3 className="font-semibold text-lg">AI Coach</h3>
              <p className="text-muted-foreground mt-2">
                Ask Gemini to plan your week. Analyze your progress. Get smarter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Built for lifters who just want to train.
            </p>
            <nav className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/support" className="hover:text-foreground transition-colors">
                Support
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
