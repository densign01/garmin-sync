'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const SUPPORT_EMAIL = 'daniel.ensign+gsync@gmail.com'

export default function SupportPage() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('general')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const subjectLine = `[Garmin Sync ${category}] ${subject}`
    const body = `${message}\n\n---\nSent from Garmin Sync Support Page`

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`
  }

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

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Support</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Have a question, found a bug, or want to request a feature? We&apos;d love to hear from you.
        </p>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-medium text-slate-900 dark:text-white mb-1">Report a Bug</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Something not working? Let us know.</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="font-medium text-slate-900 dark:text-white mb-1">Feature Request</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Have an idea? We&apos;re listening.</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-slate-900 dark:text-white mb-1">General Question</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Need help getting started?</p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Contact Us</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <option value="general">General Question</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="account">Account Issue</option>
              </select>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                required
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please describe your issue or question in detail..."
                rows={5}
                className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Open in Email App
            </Button>

            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              This will open your default email app with the message pre-filled.
            </p>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              Or email us directly at{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-6 text-sm">
          <Link href="/privacy" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            Privacy Policy
          </Link>
          <Link href="/" className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            Home
          </Link>
        </div>
      </main>
    </div>
  )
}
