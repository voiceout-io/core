import {
    AudioStream,
    TranscribeStreamingClient,
    StartStreamTranscriptionCommand,
    LanguageCode
} from '@aws-sdk/client-transcribe-streaming';
import MicrophoneStream from 'microphone-stream';

type TranscriptionOptions = {
    apiToken: string;
    languageCode?: LanguageCode & 'auto';
    mediaSampleRateHertz?: 44100;
};

type TranscriptionCallbacks = {
    onStarted?: () => void;
    onStopped?: (transcriptionText: string) => void;
    onChange?: (transcriptionText: string) => void;
    onError?: (error: 'NOT_ENOUGH_PERMISSIONS' | 'NOT_ENOUGH_FUNDS' | 'INTERNAL') => void;
};

type TranscribeRequest = TranscriptionCallbacks & TranscriptionOptions;

type TranscribeResponse = {
    start: () => Promise<void>;
    stop: () => Promise<void>;
};

type RawCredentialsResponse = {
    credentials: string;
};

type Credentials = {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    region: string;
};

type TranscribeStreamingClientSuccess = {
    type: 'TranscribeStreamingClientSuccess';
    client: TranscribeStreamingClient;
};

type TranscribeStreamingClientError = {
    type: 'TranscribeStreamingClientError';
    error: 'NOT_ENOUGH_FUNDS' | 'INTERNAL';
};

const API_ENDPOINT = process.env.API_ENDPOINT;

const buildTranscribeStreamingClient = async (
    apiToken: string
): Promise<TranscribeStreamingClientSuccess | TranscribeStreamingClientError> => {
    try {
        const response = await fetch(`${API_ENDPOINT}/credentials`, {
            method: 'GET',
            headers: { Authorization: 'Basic ' + window.btoa(`v1:${apiToken}`) }
        });
        const data: RawCredentialsResponse = await response.json();
        const credentials: Credentials = JSON.parse(window.atob(data.credentials));

        return {
            type: 'TranscribeStreamingClientSuccess',
            client: new TranscribeStreamingClient({
                region: credentials.region,
                credentials: {
                    accessKeyId: credentials.accessKeyId,
                    secretAccessKey: credentials.secretAccessKey,
                    sessionToken: credentials.sessionToken
                }
            })
        };
    } catch (e) {
        console.error(e);
        console.log(e, e.response, e.status, e.originalError);
        return {
            type: 'TranscribeStreamingClientError',
            error: 'INTERNAL'
        };
    }
};

const getStreamTranscriptionResponse = async (
    client: TranscribeStreamingClient,
    audioStream: AsyncIterable<AudioStream>,
    options?: TranscriptionOptions
) => {
    const languageCode = options?.languageCode || 'en-US';

    if (languageCode === 'auto') {
        // @todo add browser language mapping
    }

    return client.send(
        new StartStreamTranscriptionCommand({
            LanguageCode: languageCode,
            MediaSampleRateHertz: options?.mediaSampleRateHertz || 44100,
            MediaEncoding: 'pcm',
            AudioStream: audioStream
        })
    );
};

const stopStream = async function* () {
    yield { AudioEvent: { AudioChunk: Buffer.from([]) } };
};

const pcmEncode = (input: Float32Array) => {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
};

const transcribeInput = async function* (microphoneStream: MicrophoneStream) {
    const pcmEncodeChunk = (audioChunk: Buffer) => {
        const raw = MicrophoneStream.toRaw(audioChunk);
        if (raw === null) {
            return;
        }
        return Buffer.from(pcmEncode(raw));
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    for await (const chunk of microphoneStream) {
        yield { AudioEvent: { AudioChunk: pcmEncodeChunk(chunk) } };
    }
};

export const transcribe = (request: TranscribeRequest): TranscribeResponse => {
    let microphoneStream: MicrophoneStream | undefined;
    let transcriptionText = '';
    let transcribeStreamingClient: TranscribeStreamingClient | undefined;

    const dispose = () => {
        microphoneStream?.stop();
        transcribeStreamingClient?.destroy();
        stopStream();
    };

    const _start = async (): Promise<void> => {
        let mediaStream: MediaStream;
        try {
            mediaStream = await window.navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true
            });
        } catch (e) {
            request?.onError('NOT_ENOUGH_PERMISSIONS');
            dispose();
            return;
        }

        microphoneStream = new MicrophoneStream({
            stream: mediaStream,
            objectMode: false
        });

        const response = await buildTranscribeStreamingClient(request.apiToken);

        if (response.type === 'TranscribeStreamingClientError') {
            request?.onError(response.error);
            dispose();
            return;
        }

        const { TranscriptResultStream } = await getStreamTranscriptionResponse(
            response.client,
            transcribeInput(microphoneStream),
            request
        );
        request?.onStarted();

        if (TranscriptResultStream) {
            let partialTranscription = ' ';
            for await (const event of TranscriptResultStream) {
                if (event.TranscriptEvent) {
                    const { Results: results } = event.TranscriptEvent.Transcript || {};

                    if (results && results.length > 0) {
                        if (results[0]?.Alternatives && results[0]?.Alternatives?.length > 0) {
                            const { Transcript } = results[0].Alternatives[0];

                            const transcriptionToRemove = partialTranscription;
                            const transcription = decodeURIComponent(Transcript || '');

                            transcriptionText = transcriptionText.replace(transcriptionToRemove, '') + transcription;
                            request?.onChange(transcriptionText);

                            // if this transcript segment is final, reset transcription
                            if (!results[0].IsPartial) {
                                partialTranscription = '';
                            } else {
                                partialTranscription = transcription;
                            }
                        }
                    }
                }
            }
        }
    };

    const start = async (): Promise<void> => {
        _start().catch((error) => {
            console.error(error);
            request.onError('INTERNAL');
            dispose();
        });
    };

    const stop = async (): Promise<void> => {
        request?.onStopped(transcriptionText);
        dispose();
    };

    return {
        start: () => start(),
        stop: () => stop()
    };
};
