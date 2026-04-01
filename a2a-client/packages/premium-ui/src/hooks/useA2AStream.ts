import { useState, useEffect, useCallback, useRef } from "react";
import { type Message } from "@langchain/langgraph-sdk";

export function useA2AStream(options: {
  apiUrl: string;
  assistantId: string;
  threadId: string | null;
  onThreadId?: (id: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchSession = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${options.apiUrl}/api/a2a/sessions/${id}`);
      if (!response.ok) throw new Error("Failed to fetch session");
      const session = await response.json();
      
      // Map A2A messages to LangChain messages
      // A2A messages are usually in session.history or deduced from steps
      const mappedMessages: Message[] = (session.history || []).map((m: any) => ({
        id: m.id || Math.random().toString(),
        type: m.role === 'user' ? 'human' : 'ai',
        content: m.content
      }));
      
      setMessages(mappedMessages);
    } catch (e) {
      setError(e as Error);
    }
  }, [options.apiUrl]);

  useEffect(() => {
    if (options.threadId) {
      fetchSession(options.threadId);
    }
  }, [options.threadId, fetchSession]);

  const submit = useCallback(async (data: any) => {
    setIsLoading(true);
    try {
      const threadId = options.threadId;
      if (!threadId) {
        // Create session
        const res = await fetch(`${options.apiUrl}/api/a2a/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: data.messages[data.messages.length - 1].content })
        });
        const newSession = await res.json();
        if (options.onThreadId) options.onThreadId(newSession.id);
      } else {
        // Next step
        await fetch(`${options.apiUrl}/api/a2a/sessions/${threadId}/next`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: data.messages[data.messages.length - 1].content })
        });
      }
      
      // Start polling for async results
      if (pollInterval.current) clearInterval(pollInterval.current);
      pollInterval.current = setInterval(() => {
        if (options.threadId) fetchSession(options.threadId);
      }, 2000);
      
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [options, fetchSession]);

  const stop = useCallback(() => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    error,
    submit,
    stop,
    interrupt: null, // Placeholder for A2A HITL
  };
}
