import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../lib/api/client';
import { useAuth } from '../store/auth';

type ActivityEvent = {
  id: string;
  timestamp: string;
  message: string;
  raw?: unknown;
};

type Props = {
  title?: string;
  defaultOrganizationId?: string | null;
  maxEvents?: number;
};

// PUBLIC_INTERFACE
export default function ActivityStream({
  title = 'Live activity',
  defaultOrganizationId = null,
  maxEvents = 200
}: Props): JSX.Element {
  /**
   * Real-time activity stream widget (WebSocket).
   *
   * - Connects to GET /api/v1/ws/activity-stream/{organization_id}
   * - Authenticates via ?token=<JWT> query param (per backend docs)
   * - Includes a Pause updates toggle that buffers events while paused
   */
  const { accessToken, isAuthenticated } = useAuth();
  const [organizationId, setOrganizationId] = useState<string>(defaultOrganizationId || '');
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [paused, setPaused] = useState<boolean>(false);

  // While paused, we buffer new events and flush them when resumed.
  const pendingRef = useRef<ActivityEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setOrganizationId((prev) => (prev ? prev : defaultOrganizationId || ''));
  }, [defaultOrganizationId]);

  const wsUrl = useMemo(() => {
    if (!organizationId) return '';
    const base = apiClient().ws.buildActivityStreamUrl(organizationId);
    try {
      const u = new URL(base);
      if (accessToken) u.searchParams.set('token', accessToken);
      return u.toString();
    } catch {
      // If URL parsing fails, avoid connecting.
      return '';
    }
  }, [organizationId, accessToken]);

  const appendEvent = (ev: ActivityEvent) => {
    if (paused) {
      pendingRef.current.unshift(ev);
      // Keep bounded buffer
      if (pendingRef.current.length > maxEvents) pendingRef.current = pendingRef.current.slice(0, maxEvents);
      return;
    }
    setEvents((prev) => [ev, ...prev].slice(0, maxEvents));
  };

  useEffect(() => {
    // Flush pending events when unpausing
    if (!paused && pendingRef.current.length > 0) {
      const pending = pendingRef.current;
      pendingRef.current = [];
      setEvents((prev) => [...pending, ...prev].slice(0, maxEvents));
    }
  }, [paused, maxEvents]);

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  };

  const connect = () => {
    if (!isAuthenticated || !accessToken || !wsUrl) return;

    try {
      setStatus('connecting');
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => setStatus('connected');
      socket.onclose = () => setStatus('disconnected');
      socket.onerror = () => setStatus('error');

      socket.onmessage = (evt) => {
        const now = new Date().toISOString();
        try {
          const data = JSON.parse(evt.data);

          // Backend may send {type:"ping"}; reply with pong to keep-alive if desired.
          if (data?.type === 'ping') {
            try {
              socket.send(JSON.stringify({ type: 'pong' }));
            } catch {
              // ignore send failures
            }
            return;
          }

          const message =
            typeof data?.message === 'string'
              ? data.message
              : typeof data?.detail === 'string'
                ? data.detail
                : JSON.stringify(data, null, 2);

          appendEvent({
            id: String(data?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
            timestamp: String(data?.timestamp || now),
            message,
            raw: data
          });
        } catch {
          appendEvent({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            timestamp: now,
            message: String(evt.data)
          });
        }
      };
    } catch {
      setStatus('error');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const canConnect = isAuthenticated && Boolean(accessToken) && Boolean(organizationId) && Boolean(wsUrl);

  return (
    <section className="panel" aria-label={title}>
      <div className="panel-header">
        <h2 className="panel-title">{title}</h2>
        <div className="panel-meta" aria-live="polite">
          Status: {status}
          {paused ? ` • Paused (${pendingRef.current.length} buffered)` : ''}
        </div>
      </div>

      <form className="panel-controls" aria-label="Activity stream controls" onSubmit={(e) => e.preventDefault()}>
        <label className="control">
          <span>Organization ID</span>
          <input
            type="text"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            placeholder="org-uuid"
            aria-label="Organization ID"
          />
        </label>

        <div className="control-row">
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

          <label className="toggle">
            <input
              type="checkbox"
              checked={paused}
              onChange={(e) => setPaused(e.target.checked)}
              aria-label="Pause updates"
            />
            <span>Pause updates</span>
          </label>
        </div>
      </form>

      <div className="activity-list" role="region" aria-label="Activity stream events" tabIndex={0}>
        {events.length === 0 ? (
          <p className="description" style={{ padding: 12 }}>
            {status === 'connected' ? 'Connected. Waiting for events…' : 'Not connected. Enter an Organization ID and connect.'}
          </p>
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
