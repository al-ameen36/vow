import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { LogOut, History } from 'lucide-react'

import { useWhisperStream } from '#/hooks/use-stream'
import { supabase } from '#/lib/supabase'
import { useAuth } from '#/contexts/AuthContext'

import { TranscriptDisplay } from '#/components/TranscriptDisplay'
import { InsightCard } from '#/components/InsightCard'
import { SourceSelector } from '#/components/SourceSelector'
import { StartButton } from '#/components/StartButton'
import { InsightFilter } from '#/components/InsightFilter'
import { formatTime } from '#/lib/utils'
import { useNetwork } from '#/hooks/use-network'

export const Route = createFileRoute('/')({
  component: Home,
})

type Insight = {
  id?: string
  meeting_id?: string
  type: 'update' | 'flag'
  summary: string
  assignee?: string | null
  assigner?: string | null
  commitment?: string | null
  implication?: string | null
  start_ts?: number
  end_ts?: number
  status?: 'pending' | 'accepted' | 'rejected'
}

type FilterType = 'all' | 'flagged' | 'general'

function Home() {
  const navigate = useNavigate()
  const { active, transcript, start, stop } = useWhisperStream()
  const { user, isLoading } = useAuth()
  const { isOnline } = useNetwork()
  const [source, setSource] = useState<'mic' | 'tab'>('mic')
  const [insights, setInsights] = useState<Insight[]>([])
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [meetingId, setMeetingId] = useState<string | null>(null)
  const [disableRecBtn, setDisableRecBtn] = useState(false)

  // Cleanup websocket when navigating away
  useEffect(() => {
    return () => {
      if (active) stop()
    }
  }, [active, stop])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: '/login' })
    }
  }, [user, isLoading, navigate])

  if (isLoading) {
    return <div className="min-h-screen bg-black" />
  }

  if (!user) {
    return null // useEffect handles redirect
  }

  const toggleSession = async () => {
    setDisableRecBtn(true)

    if (active) {
      stop()
      if (meetingId) {
        await supabase
          .from('meetings')
          .update({ status: 'completed', end_time: new Date().toISOString() })
          .eq('id', meetingId)
      }

      setDisableRecBtn(false)
      return
    }

    const nextMeetingId = crypto.randomUUID()
    setMeetingId(nextMeetingId)
    // Clear insights from previous run
    setInsights([])

    // 2. Start the WebSocket
    start(source)
    setDisableRecBtn(false)
  }

  const handleAcceptCommitment = async (id: string) => {
    setInsights((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'accepted' } : i)),
    )
    await supabase.from('insights').update({ status: 'accepted' }).eq('id', id)
  }

  const handleRejectCommitment = async (id: string) => {
    setInsights((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'rejected' } : i)),
    )
    await supabase.from('insights').update({ status: 'rejected' }).eq('id', id)
  }

  const filteredInsights = insights.filter((insight) => {
    if (activeFilter === 'flagged') return insight.type === 'flag'
    if (activeFilter === 'general') return insight.type === 'update'
    return true // 'all'
  })

  const filterCounts = {
    all: insights.length,
    flagged: insights.filter((i) => i.type === 'flag').length,
    general: insights.filter((i) => i.type === 'update').length,
  }

  return (
    <div className="size-full bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 text-white overflow-auto relative">
      <div className="absolute inset-x-0 inset-y-0 h-full w-full pointer-events-none">
        {/* Can put background decorations here if wanted */}
      </div>
      <div className="max-w-5xl mx-auto p-6 space-y-8 min-h-screen relative z-10">
        {/* Header */}
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
                onClick={handleSignOut}
                className="p-2 text-zinc-500 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-md transition-all duration-200"
                title="Sign Out"
              >
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Transcript Display */}
        <TranscriptDisplay transcript={transcript} isListening={active} />

        {/* Insights Section */}
        <div className="space-y-6 flex-1 pb-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Insights
            </h2>
            <InsightFilter
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              counts={filterCounts}
            />
          </div>

          {/* All Insights in One List */}
          {filteredInsights.length > 0 ? (
            <div
              className="space-y-3 h-[500px] overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-zinc-700"
              style={{ scrollbarWidth: 'thin' }}
            >
              {filteredInsights.map((insight, idx) => {
                const isResolved =
                  insight.status === 'accepted' || insight.status === 'rejected'
                const titleAddendum = isResolved
                  ? ` (${insight.status?.toUpperCase()})`
                  : ''

                return (
                  <InsightCard
                    key={insight.id ?? idx}
                    type={insight.type === 'flag' ? 'COMMITMENT' : 'UPDATE'}
                    title={
                      (insight.type === 'flag'
                        ? 'COMMITMENT DETECTED'
                        : 'UPDATE') + titleAddendum
                    }
                    description={insight.summary}
                    timestamp={`${formatTime(insight.start_ts)} → ${formatTime(insight.end_ts)}`}
                    isFlagged={false}
                    onAccept={
                      insight.type === 'flag' && !isResolved && insight.id
                        ? () => handleAcceptCommitment(insight.id!)
                        : undefined
                    }
                    onReject={
                      insight.type === 'flag' && !isResolved && insight.id
                        ? () => handleRejectCommitment(insight.id!)
                        : undefined
                    }
                  />
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-zinc-500 text-sm">
                No {activeFilter === 'all' ? '' : activeFilter} insights yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
