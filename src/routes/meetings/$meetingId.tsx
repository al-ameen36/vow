import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ArrowLeft, Clock, CalendarDays } from 'lucide-react'
import { supabase } from '#/lib/supabase'

import { InsightCard } from '#/components/InsightCard'
import { TranscriptDisplay } from '#/components/TranscriptDisplay'
import { formatTime } from '#/lib/utils'

type Meeting = {
  id: string
  title: string
  start_time: string | null
  end_time: string | null
  created_at: string
}

type Insight = {
  id: string
  type: 'update' | 'flag'
  summary: string
  start_ts: number | null
  end_ts: number | null
  status: 'pending' | 'accepted' | 'rejected' | null
}

export const Route = createFileRoute('/meetings/$meetingId')({
  component: MeetingDetail,
  loader: async ({ params }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw redirect({ to: '/login' })
    }

    const { meetingId } = params

    // 1. Fetch meeting
    const { data: meeting } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single()

    if (!meeting) {
      throw new Error('Meeting not found')
    }

    // 2. Fetch insights
    const { data: insights } = await supabase
      .from('insights')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('start_ts', { ascending: true })

    // 3. Fetch transcripts
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('*')
      .eq('meeting_id', meetingId)

    // Combine full transcript
    const fullTranscript = transcripts?.[0].transcript || ''

    return {
      meeting: meeting as Meeting,
      insights: (insights ?? []) as Insight[],
      transcript: fullTranscript,
    }
  },
})

function MeetingDetail() {
  const { meeting, insights, transcript } = Route.useLoaderData()

  const flags = insights.filter((i) => i.type === 'flag')
  const updates = insights.filter((i) => i.type === 'update')

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div>
          <Link
            to="/meetings"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent mb-2">
                {meeting.title || 'Untitled Session'}
              </h1>
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" />
                  <span>
                    {new Date(meeting.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(meeting.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Full Transcript */}
          <div className="space-y-4">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-semibold">
              Session Transcript
            </h2>
            <div className="h-[60vh] bg-zinc-950 border border-zinc-900 rounded-2xl overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
              <TranscriptDisplay
                transcript={
                  transcript ||
                  'No transcript data was recorded for this meeting.'
                }
                isListening={false}
              />
            </div>
          </div>

          {/* Right Column: Insights */}
          <div>
            {/* Important */}
            {flags.length > 0 && (
              <div>
                <h2 className="text-sm uppercase tracking-widest text-amber-500 font-semibold mb-10 border-b border-zinc-900 pb-2">
                  Important insights ({flags.length})
                </h2>
                <div className="space-y-3 h-[600px] overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-zinc-800">
                  {flags.map((insight, idx) => {
                    const isResolved =
                      insight.status === 'accepted' ||
                      insight.status === 'rejected'
                    const titleAddendum = isResolved
                      ? ` (${insight.status?.toUpperCase()})`
                      : ''
                    return (
                      <InsightCard
                        key={insight.id ?? idx}
                        type="COMMITMENT"
                        title={'COMMITMENT' + titleAddendum}
                        description={insight.summary}
                        timestamp={`${formatTime(insight.start_ts)} → ${formatTime(insight.end_ts)}`}
                        isFlagged={false}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* General */}
            {updates.length > 0 && (
              <div>
                <h2 className="text-sm uppercase tracking-widest text-blue-500 font-semibold mb-4 mt-10 border-b border-zinc-900 pb-2">
                  General ({updates.length})
                </h2>
                <div className="space-y-8 h-[600px] overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-zinc-800">
                  {updates.map((insight, idx) => {
                    return (
                      <InsightCard
                        key={insight.id ?? idx}
                        type="UPDATE"
                        title="UPDATE"
                        description={insight.summary}
                        timestamp={`${formatTime(insight.start_ts)} → ${formatTime(insight.end_ts)}`}
                        isFlagged={false}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {insights.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 bg-zinc-950/50 rounded-xl border border-zinc-800/50 border-dashed scrollbar-thin">
                <p className="text-zinc-500 text-sm">
                  No insights were detected.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
