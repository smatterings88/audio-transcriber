import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AssemblyAI } from 'assemblyai'

type Body = {
  upload_url?: unknown
  options?: unknown
}

type Options = {
  speaker_labels: boolean
  language_detection: boolean
  punctuate: boolean
  format_text: boolean
}

type TranscribeJson = { transcript_id: string } | { error: string }

export default async function handler(
  req: VercelRequest,
  res: VercelResponse<TranscribeJson>,
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Missing ASSEMBLYAI_API_KEY' })
    return
  }

  const body = (req.body ?? {}) as Body
  const upload_url = typeof body.upload_url === 'string' ? body.upload_url : null
  const options = parseOptions(body.options)

  if (!upload_url) {
    res.status(400).json({ error: 'Missing upload_url' })
    return
  }
  if (!options) {
    res.status(400).json({ error: 'Missing or invalid options' })
    return
  }

  try {
    const client = new AssemblyAI({ apiKey })
    const submitted = await client.transcripts.submit({
      audio_url: upload_url,
      speech_models: ['universal-2'],
      speaker_labels: options.speaker_labels,
      ...(options.language_detection
        ? { language_detection: true }
        : { language_detection: false, language_code: 'en' }),
      punctuate: options.punctuate,
      format_text: options.format_text,
    })

    const id =
      typeof submitted === 'string'
        ? submitted
        : isRecord(submitted) && typeof submitted.id === 'string'
          ? submitted.id
          : null

    if (!id) {
      res.status(502).json({ error: 'Unexpected submit response from AssemblyAI' })
      return
    }

    res.status(200).json({ transcript_id: id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit transcript'
    res.status(500).json({ error: message })
  }
}

function parseOptions(v: unknown): Options | null {
  if (!isRecord(v)) return null
  const o = v as Record<string, unknown>
  const speaker_labels = typeof o.speaker_labels === 'boolean' ? o.speaker_labels : null
  const language_detection =
    typeof o.language_detection === 'boolean' ? o.language_detection : null
  const punctuate = typeof o.punctuate === 'boolean' ? o.punctuate : null
  const format_text = typeof o.format_text === 'boolean' ? o.format_text : null
  if (
    speaker_labels == null ||
    language_detection == null ||
    punctuate == null ||
    format_text == null
  ) {
    return null
  }
  return { speaker_labels, language_detection, punctuate, format_text }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

