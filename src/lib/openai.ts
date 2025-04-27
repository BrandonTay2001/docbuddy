import OpenAI from 'openai';

// Initialize the OpenAI client
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

// Function to analyze transcript and generate diagnosis suggestions
export async function analyzeMedicalTranscript(transcript: string): Promise<{ 
  summary: string;
  suggestedDiagnosis: string;
  suggestedPrescription: string;
}> {
  console.log('Analyzing transcript:', transcript);
  try {
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are a medical assistant AI. Analyze the following doctor-patient conversation and provide a summary, suggested diagnosis (on top of the dcotor's prescription, if any) and suggested prescription. Be professional and return in point form, only containing necessary information. The doctor and patient are not labeled so you would need to identify which is which. Sometimes, multiple languages may be present but you only need to return results in English, translate as necessary. Please provide the summary, diagnosis and prescription in the following format: Summary: <summary>\nDiagnosis: <diagnosis>\nPrescription: <prescription>"
        },
        {
          role: "user",
          content: transcript
        }
      ],
    });

    const response = completion.choices[0].message.content || '';
    
    // Parse the response to extract diagnosis and prescription suggestions
    // match one more for the summary
    const summaryMatch = response.match(/Summary:([\s\S]*?)(?=Diagnosis:|$)/);
    const diagnosisMatch = response.match(/Diagnosis:([\s\S]*?)(?=Prescription:|$)/);
    const prescriptionMatch = response.match(/Prescription:([\s\S]*?)(?=$)/);
    
    return {
      summary: summaryMatch ? summaryMatch[1].trim() : 'No summary available',
      suggestedDiagnosis: diagnosisMatch ? diagnosisMatch[1].trim() : 'No diagnosis suggestion available',
      suggestedPrescription: prescriptionMatch ? prescriptionMatch[1].trim() : 'No prescription suggestion available',
    };
  } catch (error) {
    console.error('Error analyzing transcript:', error);
    throw error;
  }
}

async function testDeepseek() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: "You are a helpful assistant." }, 
      { role: "user", content: "What is the capital of France?" }
    ],
    model: "deepseek-chat",
  });

  console.log(completion.choices[0].message.content);
}