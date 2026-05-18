import { useRef, useState, useCallback } from 'react'
import { useAuth } from '#/contexts/AuthContext'

type AudioSource = 'mic' | 'tab'

type TranscriptLine = {
  start: number
  end: number
  text: string
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function useWhisperStream() {
  const { session } = useAuth()
  const [active, setActive] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [source, setSource] = useState<AudioSource>('mic')

  const socketRef = useRef<WebSocket | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const transcriptLinesRef = useRef<TranscriptLine[]>([])
  const sentenceBufferRef = useRef('')
  const sentenceStartRef = useRef<number | null>(null)
  const partialRef = useRef('')
  const cleanedUpRef = useRef(false)

  const getAudioStream = (selectedSource: AudioSource) => {
    if (selectedSource === 'mic') {
      return navigator.mediaDevices.getUserMedia({ audio: true })
    }

    return navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    })
  }

  const updateTranscript = useCallback(() => {
    const finalText = transcriptLinesRef.current
      .map(
        (line) =>
          `[${formatTime(line.start)} → ${formatTime(line.end)}] ${line.text}`,
      )
      .join('\n')

    const liveText = sentenceBufferRef.current
      ? [sentenceBufferRef.current, partialRef.current]
          .filter(Boolean)
          .join(' ')
          .trim()
      : partialRef.current.trim()

    const combined = liveText
      ? `${finalText}${finalText ? '\n' : ''}[live] ${liveText}`
      : finalText

    setTranscript(combined)
  }, [])

  const flushSentence = useCallback((endTime: number) => {
    const text = sentenceBufferRef.current.trim()
    if (!text) return

    transcriptLinesRef.current.push({
      start: sentenceStartRef.current ?? endTime,
      end: endTime,
      text,
    })

    sentenceBufferRef.current = ''
    sentenceStartRef.current = null
  }, [])

  const cleanup = useCallback(async () => {
    if (cleanedUpRef.current) return
    cleanedUpRef.current = true

    try {
      await audioCtxRef.current?.close()
    } catch {}

    streamRef.current?.getTracks().forEach((t) => t.stop())

    socketRef.current = null
    audioCtxRef.current = null
    streamRef.current = null

    transcriptLinesRef.current = []
    sentenceBufferRef.current = ''
    sentenceStartRef.current = null
    partialRef.current = ''

    setActive(false)
  }, [])

  const stop = useCallback(() => {
    socketRef.current?.close()
    void cleanup()
  }, [cleanup])

  const start = useCallback(
    async (selectedSource: AudioSource = source) => {
      cleanedUpRef.current = false
      transcriptLinesRef.current = []
      sentenceBufferRef.current = ''
      sentenceStartRef.current = null
      partialRef.current = ''

      setTranscript('')
      setSource(selectedSource)

      const socket = new WebSocket(import.meta.env.VITE_WHISPER_SERVER_URL)
      socketRef.current = socket

      socket.onopen = async () => {
        socket.send(
          JSON.stringify({
            token: session?.access_token,
          }),
        )

        let stream: MediaStream
        try {
          stream = await getAudioStream(selectedSource)
        } catch (err) {
          console.warn('Audio permission/device error:', err)
          stop()
          return
        }

        streamRef.current = stream

        const audioCtx = new AudioContext({ sampleRate: 16000 })
        audioCtxRef.current = audioCtx

        const workletCode = `
          class VowProcessor extends AudioWorkletProcessor {
            process(inputs) {
              const input = inputs[0]
              if (input && input[0]) {
                this.port.postMessage(input[0].buffer)
              }
              return true
            }
          }
          registerProcessor('vow-processor', VowProcessor)
        `

        const blob = new Blob([workletCode], { type: 'application/javascript' })
        const url = URL.createObjectURL(blob)

        await audioCtx.audioWorklet.addModule(url)
        URL.revokeObjectURL(url)

        const sourceNode = audioCtx.createMediaStreamSource(stream)
        const workletNode = new AudioWorkletNode(audioCtx, 'vow-processor')

        workletNode.port.onmessage = (event) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(event.data)
          }
        }

        sourceNode.connect(workletNode)

        if (audioCtx.state === 'suspended') {
          await audioCtx.resume()
        }

        setActive(true)
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string)
          const text = data?.metadata?.transcript?.trim()
          if (!text) return

          if (data.message === 'AddPartialTranscript') {
            partialRef.current = text
            updateTranscript()
            return
          }

          if (data.message === 'AddTranscript') {
            const start = data?.metadata?.start_time ?? 0
            const end = data?.metadata?.end_time ?? start

            if (sentenceStartRef.current === null) {
              sentenceStartRef.current = start
            }

            sentenceBufferRef.current = sentenceBufferRef.current
              ? `${sentenceBufferRef.current} ${text}`
              : text

            const chunkLooksComplete =
              /[.!?]$/.test(text) || sentenceBufferRef.current.length >= 120

            if (chunkLooksComplete) {
              flushSentence(end)
            }

            partialRef.current = ''
            updateTranscript()
          }
        } catch {
          // ignore malformed packets
        }
      }

      socket.onerror = (err) => {
        console.error('[WS] socket error', err)
      }

      socket.onclose = () => {
        void cleanup()
      }
    },
    [cleanup, flushSentence, source, stop, updateTranscript],
  )

  return {
    active,
    transcript,
    start,
    stop,
    source,
  }
}
