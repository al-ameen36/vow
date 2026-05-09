import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { useWhisperStream } from '#/hooks/use-stream'
import { supabase } from '#/lib/supabase'

import { TranscriptDisplay } from '#/components/TranscriptDisplay'
import { InsightCard } from '#/components/InsightCard'
import { SourceSelector } from '#/components/SourceSelector'
import { StartButton } from '#/components/StartButton'
import { InsightFilter } from '#/components/InsightFilter'

export const Route = createFileRoute('/')({
  component: Home,

  loader: async () => {
    const { data: insights } = await supabase
      .from('insights')
      .select()
      .order('created_at', { ascending: false })

    return {
      insights: insights ?? [],
    }
  },
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
  start_time?: number
  end_time?: number
  status?: 'pending' | 'accepted' | 'rejected'
}

type FilterType = 'all' | 'flagged' | 'general'

function formatTime(seconds?: number) {
  if (seconds == null) return '--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function Home() {
  const { active, transcript, start, stop } = useWhisperStream()
  const { insights: initialInsights } = Route.useLoaderData()
  const [source, setSource] = useState<'mic' | 'tab'>('mic')
  const [insights, setInsights] = useState<Insight[]>(initialInsights)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const meetingIdRef = useRef(crypto.randomUUID())

  useEffect(() => {
    const channel = supabase
      .channel('insights-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'insights',
          filter: `meeting_id=eq.${meetingIdRef.current}`,
        },
        (payload) => {
          setInsights((prev) => [payload.new as Insight, ...prev])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const toggleSession = () => {
    if (active) {
      stop()
      return
    }
    start(source, meetingIdRef.current)
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
          </div>
          <div className="flex items-center gap-4">
            <StartButton isRecording={active} onClick={toggleSession} />
            <SourceSelector selectedSource={source} onSourceChange={setSource} />
          </div>
        </div>

        {/* Transcript Display */}
        <TranscriptDisplay transcript={transcript} isListening={active} />



        {/* Insights Section */}
        {insights.length > 0 && (
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
                className="space-y-3 h-[450px] overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-zinc-700" 
                style={{ scrollbarWidth: 'thin' }}
              >
                {filteredInsights.map((insight, idx) => {
                  const isResolved =
                    insight.status === 'accepted' ||
                    insight.status === 'rejected'
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
                      timestamp={`${formatTime(insight.start_time)} → ${formatTime(insight.end_time)}`}
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
                  No {activeFilter} insights yet
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
