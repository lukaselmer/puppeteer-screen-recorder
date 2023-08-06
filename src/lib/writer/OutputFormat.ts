import { extname } from 'node:path'

/**
 * @description supported video formats for recording
 */
export type OutputFormat = 'mp4' | 'mov' | 'avi' | 'webm'

export const outputFormats: OutputFormat[] = ['mp4', 'avi', 'mov', 'webm']

export function outputFormatFor(filePath: string): OutputFormat | undefined {
  const fileExtension = extname(filePath).toLowerCase().replace('.', '')
  const foundExtension = outputFormats.find((format) => format === fileExtension)
  if (!foundExtension) return undefined
  return foundExtension
}
