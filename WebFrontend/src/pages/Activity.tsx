import React from 'react';
import ActivityStream from '../components/ActivityStream';
import { useAuth } from '../store/auth';

// PUBLIC_INTERFACE
export default function Activity(): JSX.Element {
  /**
   * Real-time activity stream page.
   * Uses the shared ActivityStream component which connects to:
   * GET /api/v1/ws/activity-stream/{organization_id}
   */
  const { organizationId } = useAuth();

  return (
    <section>
      <h1 className="title">Activity</h1>
      <p className="description">Real-time activity for your organization.</p>

      <ActivityStream title="Activity stream" defaultOrganizationId={organizationId} maxEvents={300} />
    </section>
  );
}
