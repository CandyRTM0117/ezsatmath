import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
})

const EXT_CONTENT_TYPES: Record<string, string> = {
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif:  'image/gif',
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (!key) return new NextResponse('Missing key', { status: 400 })

  try {
    const result = await s3.send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key })
    )

    // result.Body is a Node.js Readable with SDK stream helpers — NOT a Web ReadableStream.
    // transformToByteArray() is the correct way to consume it in a Next.js route handler.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bytes = await (result.Body as any).transformToByteArray()

    // Derive content type from the key extension. R2 often stores files as
    // application/octet-stream when ContentType wasn't set on upload, which
    // causes browsers to refuse rendering the response as an image.
    const ext = key.split('.').pop()?.toLowerCase() ?? ''
    const contentType = EXT_CONTENT_TYPES[ext] ?? 'image/png'

    return new NextResponse(bytes, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
