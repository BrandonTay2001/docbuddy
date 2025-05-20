import { ElevenLabsClient } from "elevenlabs";

const client = new ElevenLabsClient({ apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '' });

interface SpeakerSegment {
    speaker_id: string,
    speech: string
}

async function updateTranscriptionUsage(userId: string, minutes: number) {
    try {
        const response = await fetch('/api/transcription/usage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, minutes }),
        });

        if (!response.ok) {
            throw new Error('Failed to update usage');
        }
    } catch (error) {
        console.error('Error updating transcription usage:', error);
        // Don't throw the error as we don't want to fail the transcription if usage tracking fails
    }
}

export async function transcribeAudioElevenlabs(audioBlob: Blob, userId: string, languageCode: string | null = null): Promise<string> {
    // download the audio blob as a file
    console.log(languageCode);

    const file = new File([audioBlob], "recording.mp3", { type: "audio/mp3" });
    const options = {
        file: file,
        model_id: "scribe_v1",
        diarize: true,
        ...(languageCode && { language_code: languageCode })
    };
    
    const transcription = await client.speechToText.convert(options);

    // Calculate duration in minutes (assuming words array has timing information)
    if (transcription.words && transcription.words.length > 0) {
        const lastWord = transcription.words[transcription.words.length - 1];
        const durationInSeconds = lastWord.end || 0;
        const durationInMinutes = durationInSeconds / 60;
        
        // Update usage tracking
        await updateTranscriptionUsage(userId, durationInMinutes);
    }

    const segments: SpeakerSegment[] = [];
    let currentSpeaker = transcription.words[0]?.speaker_id || '';
    let currentSpeech = '';
    
    for (const word of transcription.words) {
        if (word.type === 'spacing') continue;

        // If speaker changed, push current segment and start new one
        if (currentSpeaker !== word.speaker_id) {
            if (currentSpeaker !== null && currentSpeech.trim().length > 0) {
                segments.push({
                    speaker_id: currentSpeaker,
                    speech: currentSpeech.trim()
                });
            }
            currentSpeaker = word.speaker_id || '';
            currentSpeech = word.text;
        } else {
            // Add space between words of the same speaker
            if (currentSpeech.length > 0) {
                currentSpeech += ' ';
            }
            currentSpeech += word.text;
        }
    }
    
    // Add the last segment if there's content
    if (currentSpeech.trim().length > 0) {
        segments.push({
            speaker_id: currentSpeaker,
            speech: currentSpeech.trim()
        });
    }

    // Convert segments to a formatted string
    const formattedTranscript = segments.map(segment => 
        `Speaker ${segment.speaker_id}: ${segment.speech}`
    ).join('\n\n');
    
    console.log(formattedTranscript);
    
    return formattedTranscript;
}