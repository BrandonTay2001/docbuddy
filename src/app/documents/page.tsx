'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import { getUserProfile } from '@/lib/auth';

interface Session {
  id: string;
  name: string;
  created_at: string;
  document_url: string;
}

interface Draft {
  id: string;
  user_id: string;
  audio_url: string;
  created_at: string;
  updated_at: string;
}

// Define tab types
type TabType = 'complete' | 'drafts';

export default function Documents() {
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  // Default to showing complete documents
  const [activeTab, setActiveTab] = useState<TabType>('complete');

  useEffect(() => {
    setIsMounted(true);
    
    const fetchData = async () => {
      try {
        const user = await getUserProfile();
        if (!user) {
          throw new Error('User not found');
        }

        // Fetch user sessions
        const sessionsResponse = await fetch(`/api/sessions?userId=${user.id}`);
        if (!sessionsResponse.ok) {
          throw new Error('Failed to fetch sessions');
        }
        const sessionsData = await sessionsResponse.json();
        setSessions(sessionsData.sessions);
        
        // Fetch user drafts
        const draftsResponse = await fetch(`/api/drafts?userId=${user.id}`);
        if (!draftsResponse.ok) {
          throw new Error('Failed to fetch drafts');
        }
        const draftsData = await draftsResponse.json();
        setDrafts(draftsData.drafts);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Format date for display
  const formatDateTime = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleString(undefined, options);
  };

  // Show a simple loading state during SSR
  if (!isMounted) {
    return <div className="min-h-screen" />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-accent rounded-full border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-border">
          <h1 className="text-3xl font-bold">Patient Documents</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
          </div>
        </header>

        <div className="mb-8">
          <div className="flex justify-between mb-8">
            <div className="flex gap-4">
              <Link href="/documents/new">
                <Button>Create New Document</Button>
              </Link>
              <Link href="/session/new">
                <Button variant="secondary">Start New Session</Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Tab navigation */}
        <div className="mb-6 border-b border-border">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('complete')}
              className={`py-2 px-1 font-medium text-lg relative ${
                activeTab === 'complete' 
                  ? 'text-accent' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Complete Documents
              {activeTab === 'complete' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('drafts')}
              className={`py-2 px-1 font-medium text-lg relative ${
                activeTab === 'drafts' 
                  ? 'text-accent' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Drafts
              {drafts.length > 0 && (
                <span className="ml-2 py-0.5 px-2 text-xs rounded-full bg-accent text-white">
                  {drafts.length}
                </span>
              )}
              {activeTab === 'drafts' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent"></span>
              )}
            </button>
          </div>
        </div>
        
        {/* Drafts View */}
        {activeTab === 'drafts' && (
          <>
            {drafts.length > 0 ? (
              <div className="space-y-4">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="p-4 border border-border rounded-md bg-background hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold">Draft - {formatDateTime(draft.updated_at)}</h3>
                        <p className="text-sm text-gray-500">
                          Created: {formatDateTime(draft.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 border border-border rounded-md bg-background text-center">
                <p className="text-gray-500">No draft recordings found</p>
              </div>
            )}
          </>
        )}
        
        {/* Complete Documents View */}
        {activeTab === 'complete' && (
          <>
            {sessions.length > 0 ? (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 border border-border rounded-md bg-background hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <Link href={`/documents/edit/${session.id}`} className="hover:underline">
                        <div>
                          <h3 className="text-lg font-semibold">{session.name}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(session.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            window.open(session.document_url, '_blank');
                          }}
                        >
                          View Report
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 border border-border rounded-md bg-background text-center">
                <h3 className="text-xl font-bold mb-4">No Documents Found</h3>
                <p className="text-gray-500 mb-6">
                  You haven&apos;t created any documents yet. Use the buttons above to create documents manually or start a new recording session.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}