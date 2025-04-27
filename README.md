# DocBuddy - AI Assistant for Doctors

DocBuddy is an AI-powered tool for doctors to record, transcribe, and document patient sessions. Built with Next.js, the app leverages ElevenLabs for audio transcription and GPT-4 for medical analysis.

## Features

- **User Authentication**: Secure sign-up and sign-in using Supabase Auth
- **Audio Recording**: Record patient sessions directly in the browser
- **AI Transcription**: Automatically transcribe recordings using ElevenLabs Scribe
- **AI Analysis**: Generate suggested diagnoses and prescriptions using GPT-4
- **Document Generation**: Create professional HTML documents with patient information, transcripts, diagnoses, and prescriptions
- **Manual Document Creation**: Directly create medical documents without recording a session
- **Responsive Design**: Clean black and white interface that works on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Supabase account for authentication
- OpenAI API key for transcription and analysis

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/docbuddy.git
   cd docbuddy
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Configure environment variables:
   Copy the `.env.local.example` file to `.env.local` and fill in your API keys:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Then edit `.env.local` with the following values:
   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

   # OpenAI
   OPENAI_API_KEY=your-openai-api-key
   NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key
   ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage Flow

1. Sign up or sign in with your email and password
2. Navigate to "Start New Session" from the dashboard to record a patient session, or
3. Navigate to "Documents" and click "Create New Document" to manually create a document
4. For recorded sessions:
   - Click "Start Session" to begin recording your patient interaction
   - Click "End Session" when you're done to process the recording
   - Review the transcript and AI-suggested diagnosis and prescription
5. Complete the patient information, diagnosis, and prescription fields
6. Click "Generate Document" to create the HTML document
7. The document will open in a new tab and can be printed or saved

## Technologies Used

- **Next.js**: React framework for the frontend
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Supabase**: Backend as a Service for authentication
- **ElevenLabs API**: For audio transcription (Scribe)
- **OpenAI API**: For medical analysis (GPT-4)
- **HTML5**: For document generation with print styling

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This application is for demonstration purposes only. It is not intended to provide medical advice or replace professional medical consultation. Always consult with qualified healthcare providers for medical diagnosis and treatment.
