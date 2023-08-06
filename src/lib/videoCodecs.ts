import ffmpeg, { Codec, Codecs } from 'fluent-ffmpeg'

export async function validateVideoCodec(codec: string) {
  const availableCodecsMap = await availableCodecs()
  const found = availableCodecsMap[codec]

  if (!found || !found.canEncode) {
    const list = listAvailableEncodingCodecs(availableCodecsMap)
    throw new Error(`Video codec ${codec} is not available for encoding. Available codecs:\n${list}`)
  }
}

function availableCodecs() {
  return new Promise<Codecs>((resolve, reject) =>
    ffmpeg().getAvailableCodecs((err, codecs) => {
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
