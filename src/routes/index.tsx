import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { LogOut, History } from 'lucide-react'

import { useWhisperStream } from '#/hooks/use-stream'
import { supabase } from '#/lib/supabase'
import { useAuth } from '#/contexts/AuthContext'
import { useNetwork } from '#/hooks/use-network'

import { TranscriptDisplay } from '#/components/TranscriptDisplay'
import { InsightCard } from '#/components/InsightCard'
import { SourceSelector } from '#/components/SourceSelector'
import { StartButton } from '#/components/StartButton'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const { active, segments, liveText, insights, start, stop } =
    useWhisperStream()
  const { user, isLoading } = useAuth()
  const { isOnline } = useNetwork()

  const [source, setSource] = useState<'mic' | 'tab'>('mic')
  const [disableRecBtn, setDisableRecBtn] = useState(false)

  useEffect(() => {
    return () => {
      if (active) stop()
    }
  }, [active, stop])

  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: '/login' })
    }
  }, [user, isLoading, navigate])

  if (isLoading) {
    return <div className="min-h-screen bg-black" />
  }

  if (!user) {
    return null
  }

  const toggleSession = async () => {
    setDisableRecBtn(true)

    if (active) {
      stop()

      setDisableRecBtn(false)
      return
    }

    start(source)
    setDisableRecBtn(false)
  }

  return (
    <div className="size-full bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 text-white overflow-auto relative">
      <div className="max-w-5xl mx-auto p-6 space-y-8 min-h-screen relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-green-400' : 'bg-zinc-600'}`}
              />
              {active && (
                <div className="absolute inset-0 rounded-full bg-green-400 animate-ping" />
              )}
            </div>

            <span className="text-sm text-zinc-400 uppercase tracking-wider font-semibold">
              {active ? 'LIVE' : 'IDLE'}
            </span>

            {user && (
              <span className="text-xs text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800 ml-2 hidden sm:inline-block">
                {user.email}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <StartButton
                isRecording={active}
                onClick={toggleSession}
                disabled={!isOnline || disableRecBtn}
              />
              <SourceSelector
                selectedSource={source}
                onSourceChange={setSource}
              />
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/meetings"
                className="p-2 ml-2 text-zinc-500 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-md transition-all duration-200"
                title="Past Meetings"
              >
                <History className="w-6 h-6" />
              </Link>

              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  window.location.href = '/login'
                }}
                className="p-2 text-zinc-500 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-md transition-all duration-200"
                title="Sign Out"
              >
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <TranscriptDisplay
          segments={segments}
          liveText={liveText}
          isListening={active}
        />

        <div className="space-y-6 flex-1 pb-10">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Insights
          </h2>

          {insights.length > 0 ? (
            <div
              className="space-y-3 h-[500px] overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-zinc-700"
              style={{ scrollbarWidth: 'thin' }}
            >
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-zinc-500 text-sm">No insights yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
