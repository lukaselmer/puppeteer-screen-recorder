import { Logger } from '../logger'

export interface PageVideoStreamReaderOptions {
  readonly inputFormat: 'jpeg' | 'png'
  readonly inputQuality: number
  readonly followNewTab: boolean
  readonly logger: Logger
}
