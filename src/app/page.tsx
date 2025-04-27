import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-6">DocBuddy</h1>
        <p className="text-xl mb-12">
          An AI-powered tool for doctors to record, transcribe, and document patient sessions
        </p>
        
        <div className="space-y-4 md:space-y-0 md:space-x-4 flex flex-col md:flex-row justify-center">
          <Link href="/auth/signin" className="btn-primary px-8 py-3 rounded-md inline-block">
            Sign In
          </Link>
          <Link href="/auth/signup" className="btn-secondary px-8 py-3 rounded-md inline-block">
            Sign Up
          </Link>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 border border-border rounded-md">
            <h2 className="text-xl font-bold mb-2">Record Sessions</h2>
            <p>Easily record audio of your patient sessions using our simple interface.</p>
          </div>
          
          <div className="p-6 border border-border rounded-md">
            <h2 className="text-xl font-bold mb-2">AI Transcription</h2>
            <p>Automatically transcribe your sessions with state-of-the-art AI technology.</p>
          </div>
          
          <div className="p-6 border border-border rounded-md">
            <h2 className="text-xl font-bold mb-2">Generate Documents</h2>
            <p>Create professional medical documents from your sessions with just a few clicks.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
