import { useMemo, useState } from 'react'
import { Check, ClipboardCopy, Download, RotateCcw } from 'lucide-react'

import { type Transcript } from '../lib/api'
import { cn } from '../lib/utils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'

export function TranscriptResult(props: {
  transcript: Transcript
  speakerLabelsEnabled: boolean
  onStartOver: () => void
}) {
  const { transcript, speakerLabelsEnabled, onStartOver } = props
  const [copied, setCopied] = useState(false)

  const text = transcript.text ?? ''
  const wordCount = useMemo(() => countWords(text), [text])

  const lines = useMemo(() => {
    if (!speakerLabelsEnabled) return null
    if (!transcript.utterances || transcript.utterances.length === 0) return null
    return transcript.utterances.map((u, idx) => ({
      key: `${u.start}-${u.end}-${idx}`,
      speaker: u.speaker,
      text: u.text,
    }))
  }, [speakerLabelsEnabled, transcript.utterances])

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  function downloadTxt() {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transcript.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-400">
          <span className="text-zinc-200 font-medium">{wordCount}</span> words
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void copy()}>
            {copied ? <Check /> : <ClipboardCopy />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button type="button" variant="outline" onClick={downloadTxt}>
            <Download />
            Download .txt
          </Button>
          <Button type="button" variant="secondary" onClick={onStartOver}>
            <RotateCcw />
            Start over
          </Button>
        </div>
      </div>

      <Separator />

      <ScrollArea className="h-[360px] rounded-xl border border-zinc-800 bg-zinc-950/30">
        <div className="space-y-3 p-4 text-sm leading-6 text-zinc-100">
          {lines ? (
            lines.map((l) => (
              <div key={l.key} className="flex items-start gap-3">
                <Badge className={cn('mt-0.5', speakerColorClass(l.speaker))}>
                  {formatSpeaker(l.speaker)}
                </Badge>
                <div className="min-w-0 whitespace-pre-wrap text-zinc-100">
                  {l.text}
                </div>
              </div>
            ))
          ) : (
            <div className="whitespace-pre-wrap">{text}</div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

function formatSpeaker(raw: string): string {
  if (!raw) return 'Speaker'
  const m = raw.match(/^[A-Za-z]$/) ? raw.toUpperCase() : raw
  return `Speaker ${m}`
}

function speakerColorClass(speaker: string): string {
  const palette = [
    'border-violet-800/60 bg-violet-950/40 text-violet-100',
    'border-cyan-800/60 bg-cyan-950/40 text-cyan-100',
    'border-emerald-800/60 bg-emerald-950/40 text-emerald-100',
    'border-amber-800/60 bg-amber-950/40 text-amber-100',
    'border-fuchsia-800/60 bg-fuchsia-950/40 text-fuchsia-100',
    'border-sky-800/60 bg-sky-950/40 text-sky-100',
  ]
  const idx = Math.abs(hashString(speaker)) % palette.length
  return palette[idx]
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

