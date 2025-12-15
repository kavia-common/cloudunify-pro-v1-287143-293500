import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../store/auth';
import { apiClient } from '../lib/api/client';

type ActivityEvent = {
  id: string;
  message: string;
  timestamp: string;
};

// PUBLIC_INTERFACE
export default function Activity(): JSX.Element {
  /**
   * Real-time activity stream page.
   * Connects to the WebSocket endpoint /ws/activity-stream/{organization_id}
   * and appends events to the live list. Uses JWT via a `token` query param.
   */
  const { accessToken, isAuthenticated } = useAuth();
  const [organizationId, setOrganizationId] = useState<string>('default-org');
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);

  const wsUrl = useMemo(() => {
    if (!organizationId) return '';
    const base = apiClient().ws.buildActivityStreamUrl(organizationId);
    const url = new URL(base, window.location.origin);
    // Attach token as query param for auth (backend should support this)
    if (accessToken) url.searchParams.set('token', accessToken);
    return url.toString();
  }, [organizationId, accessToken]);

  const connect = () => {
    if (!isAuthenticated || !accessToken || !wsUrl) return;
    try {
      setStatus('connecting');
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setStatus('connected');
      };
      socket.onclose = () => {
        setStatus('disconnected');
      };
      socket.onerror = () => {
        setStatus('error');
      };
      socket.onmessage = (evt) => {
        const now = new Date().toISOString();
        try {
          const data = JSON.parse(evt.data);
          const ev: ActivityEvent = {
            id: data.id || `${Date.now()}`,
            message: data.message || evt.data,
            timestamp: data.timestamp || now
          };
          setEvents((prev) => [ev, ...prev].slice(0, 200));
        } catch {
          setEvents((prev) => [{ id: `${Date.now()}`, message: String(evt.data), timestamp: now }, ...prev].slice(0, 200));
        }
      };
    } catch {
      setStatus('error');
    }
  };

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const canConnect = isAuthenticated && Boolean(accessToken) && Boolean(organizationId);

  return (
    <section>
      <h1 className="title">Activity</h1>
      <p className="description">
        Real-time activity for your organization. Provide an Organization ID and connect.
      </p>

      <form className="form" aria-label="Activity connection form" onSubmit={(e) => e.preventDefault()}>
        <label>
          <span>Organization ID</span>
          <input
            type="text"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            placeholder="org-1234"
          />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={connect}
            disabled={!canConnect || status === 'connected' || status === 'connecting'}
            aria-disabled={!canConnect || status === 'connected' || status === 'connecting'}
          >
            {status === 'connecting' ? 'Connecting…' : 'Connect'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={disconnect}
            disabled={status !== 'connected' && status !== 'connecting'}
            aria-disabled={status !== 'connected' && status !== 'connecting'}
          >
            Disconnect
          </button>
          <span aria-live="polite" style={{ alignSelf: 'center' }}>
            Status: {status}
          </span>
        </div>
      </form>

      <div className="activity-list" role="region" aria-label="Activity stream" tabIndex={0}>
        {events.length === 0 ? (
          <p className="description">No events yet. Connect to start streaming.</p>
        ) : (
          <ul role="list" className="activity-ul">
            {events.map((ev) => (
              <li key={ev.id} className="activity-item">
                <div className="activity-item-top">
                  <time dateTime={ev.timestamp} className="activity-time">
                    {new Date(ev.timestamp).toLocaleString()}
                  </time>
                </div>
                <pre className="activity-message">{ev.message}</pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
