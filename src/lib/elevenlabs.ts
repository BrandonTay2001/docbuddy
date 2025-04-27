import { ElevenLabsClient } from "elevenlabs";

const client = new ElevenLabsClient({ apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '' });

interface SpeakerSegment {
    speaker_id: string,
    speech: string
}

export async function transcribeAudioElevenlabs(audioBlob: Blob): Promise<string> {
    // download the audio blob as a file
    const file = new File([audioBlob], "recording.mp3", { type: "audio/mp3" });
    const transcription = await client.speechToText.convert({
        file: file,
        model_id: "scribe_v1",
        diarize: true
    });

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