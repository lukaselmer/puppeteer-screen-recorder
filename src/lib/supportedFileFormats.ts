import { extname } from 'path'

/**
 * @description supported video formats for recording
 */
export type SupportedVideoFileFormat = 'mp4' | 'mov' | 'avi' | 'webm'

export const supportedFileFormats: SupportedVideoFileFormat[] = ['mp4', 'avi', 'mov', 'webm']

export function fileFormatFor(filePath: string): SupportedVideoFileFormat | undefined {
  const fileExtension = extname(filePath)
  const foundExtension = supportedFileFormats.find((format) => format === fileExtension)
  if (!foundExtension) return undefined
  return foundExtension
}
