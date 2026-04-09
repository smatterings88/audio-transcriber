import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AssemblyAI } from 'assemblyai'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Missing ASSEMBLYAI_API_KEY' })
    return
  }

  const id = typeof req.query.id === 'string' ? req.query.id : null
  if (!id) {
    res.status(400).json({ error: 'Missing transcript id' })
    return
  }

  try {
    const client = new AssemblyAI({ apiKey })
    const transcript = await client.transcripts.get(id)
    res.status(200).json(transcript)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch status'
    res.status(500).json({ error: message })
  }
}

