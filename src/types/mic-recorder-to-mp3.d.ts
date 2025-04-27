declare module 'mic-recorder-to-mp3' {
  interface MicRecorderOptions {
    bitRate?: number;
    prefix?: string;
  }

  class MicRecorder {
    constructor(options?: MicRecorderOptions);
    start(): Promise<void>;
    stop(): {
      getMp3(): Promise<[ArrayBuffer, Blob]>;
    };
  }

  export default MicRecorder;
} 