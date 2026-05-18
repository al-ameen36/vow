export type Insight = {
  id: string
  content: string
  segment_id: string
  start_time: number
  type: string
}

export type Segment = {
  id: string
  content: string
  end_time: number
  meeting_id: string
  start_time: number
}
