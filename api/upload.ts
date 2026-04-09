import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createReadStream } from 'node:fs'
import formidable, { type File as FormidableFile } from 'formidable'
import { AssemblyAI } from 'assemblyai'

export const config = {
  api: {
    bodyParser: false,
  },
}

type UploadJson = { upload_url: string } | { error: string }

export default async function handler(req: VercelRequest, res: VercelResponse<UploadJson>) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Missing ASSEMBLYAI_API_KEY' })
    return
  }

  try {
    const file = await parseSingleFile(req)
    if (!file) {
      res.status(400).json({ error: 'Missing file field' })
      return
    }

    const client = new AssemblyAI({ apiKey })
    const stream = createReadStream(file.filepath)

    const uploaded = await client.files.upload(stream)
    const upload_url =
      typeof uploaded === 'string'
        ? uploaded
        : isRecord(uploaded) && typeof uploaded.upload_url === 'string'
          ? uploaded.upload_url
          : null

    if (!upload_url) {
      res.status(502).json({ error: 'Unexpected upload response from AssemblyAI' })
      return
    }

    res.status(200).json({ upload_url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    res.status(500).json({ error: message })
  }
}

async function parseSingleFile(req: VercelRequest): Promise<FormidableFile | null> {
  const form = formidable({
    multiples: false,
    maxFileSize: 500 * 1024 * 1024,
  })

  return await new Promise((resolve, reject) => {
    form.parse(req, (err, _fields, files) => {
      if (err) {
        reject(err)
        return
      }
      const f = files.file
      if (!f) {
        resolve(null)
        return
      }
      resolve(Array.isArray(f) ? f[0] ?? null : f)
    })
  })
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

