import ffmpeg, { Codec, Codecs } from 'fluent-ffmpeg'
import { Logger } from './logger'

export async function validateVideoCodec(codec: string, logger: Logger) {
  const availableCodecsMap = await availableCodecs(logger)
  const found = availableCodecsMap[codec]

  if (!found || !found.canEncode) {
    const list = listAvailableEncodingCodecs(availableCodecsMap)
    throw new Error(`Video codec ${codec} is not available for encoding. Available codecs:\n${list}`)
  }
}

function availableCodecs(logger: Logger) {
  return new Promise<Codecs>((resolve, reject) =>
    ffmpeg({ logger }).getAvailableCodecs((err, codecs) => {
      if (err) reject(err)
      else resolve(codecs)
    })
  )
}

function listAvailableEncodingCodecs(availableCodecsMap: Record<string, Codec>) {
  return Object.entries(availableCodecsMap)
    .filter(([, { canEncode }]) => canEncode)
    .map(([codec, { description }]) => `- ${codec}: ${description}`)
    .join('\n')
}
