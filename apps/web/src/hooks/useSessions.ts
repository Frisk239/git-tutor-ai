import { useEffect, useState } from 'react';
import type { Session } from '../types/chat';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/chat/sessions');
      const data = await response.json();
      setSessions(data.sessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (title?: string) => {
    const response = await fetch('http://localhost:3000/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || '新对话' }),
    });
    const session = await response.json();
    await fetchSessions();
    return session;
  };

  const deleteSession = async (sessionId: string) => {
    await fetch('http://localhost:3000/api/chat/sessions/' + sessionId, {
      method: 'DELETE',
    });
    await fetchSessions();
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return { sessions, loading, createSession, deleteSession, refetch: fetchSessions };
}
