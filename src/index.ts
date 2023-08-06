export { PuppeteerScreenRecorder } from './lib/PuppeteerScreenRecorder'
export { PageScreenFrame } from './lib/PageScreenFrame'
export { PageVideoStreamReader as PageVideoStreamCollector } from './lib/reader/PageVideoStreamReader'
export { PageVideoStreamWriter } from './lib/writer/PageVideoStreamWriter'
export { PuppeteerScreenRecorderOptions } from './lib/PuppeteerScreenRecorderOptions'
export { VideoWriteStatus } from './lib/writer/VideoWriteStatus'
export {
  OutputFormat as SupportedVideoFileFormat,
  outputFormatFor as fileFormatFor,
  outputFormats as supportedFileFormats,
} from './lib/writer/OutputFormat'
export { validateVideoCodec as checkVideoCodec } from './lib/videoCodecs'
