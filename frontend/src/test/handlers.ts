import { http, HttpResponse } from 'msw';
import type { components } from '../api/schema';

const MOCK_OPERATIONS_USER: components['schemas']['UserResponseDTO'] = {
  id: 'test-user-id',
  username: 'operator',
  is_active: true,
  roles: ['Operations'],
};

const MOCK_VIEWER_USER: components['schemas']['UserResponseDTO'] = {
  id: 'viewer-user-id',
  username: 'viewer',
  is_active: true,
  roles: ['Viewer'],
};

export const handlers = [
  // Auth
  http.get('http://localhost/api/v1/auth/me', () => {
    return HttpResponse.json(MOCK_OPERATIONS_USER);
  }),
  http.post('http://localhost/api/v1/auth/login', () => {
    return HttpResponse.json(MOCK_OPERATIONS_USER);
  }),
  http.post('http://localhost/api/v1/auth/logout', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // Port Activity Events
  http.get('http://localhost/api/v1/port-calls/:portCallId/events', () => {
    return HttpResponse.json([]);
  }),
  http.post('http://localhost/api/v1/port-calls/:portCallId/events', async ({ request }) => {
    const body = await request.json() as components['schemas']['PortActivityCreateDTO'];
    const event: components['schemas']['PortActivityResponseDTO'] = {
      id: 'new-event-id',
      port_call_id: 'test-port-call-id',
      event_type: body.event_type,
      event_timestamp: body.event_timestamp,
      recorded_by_user_id: 'test-user-id',
      notes: body.notes ?? null,
      corrects_activity_id: body.corrects_activity_id ?? null,
      correction_reason: body.correction_reason ?? null,
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json(event, { status: 201 });
  }),

  // Activity Log
  http.get('http://localhost/api/v1/port-calls/:portCallId/activity-log', () => {
    return HttpResponse.json([]);
  }),
  http.post('http://localhost/api/v1/port-calls/:portCallId/activity-log', async ({ request }) => {
    const body = await request.json() as components['schemas']['ActivityLogCreateDTO'];
    const entry: components['schemas']['ActivityLogResponseDTO'] = {
      id: 'new-log-id',
      port_call_id: 'test-port-call-id',
      logged_by_user_id: 'test-user-id',
      narrative: body.narrative,
      logged_at: new Date().toISOString(),
    };
    return HttpResponse.json(entry, { status: 201 });
  }),

  // Voyage Reports
  http.get('http://localhost/api/v1/voyages/:voyageId/reports', () => {
    return HttpResponse.json([]);
  }),
  http.post('http://localhost/api/v1/voyages/:voyageId/reports', async ({ request, params }) => {
    const body = await request.json() as components['schemas']['ReportCreateDTO'];
    const report: components['schemas']['OperationalReportResponseDTO'] = {
      id: 'new-report-id',
      voyage_id: params.voyageId as string,
      port_call_id: null,
      report_type: body.report_type,
      status: 'Pending',
      submitted_by_user_id: 'test-user-id',
      submitted_at: new Date().toISOString(),
      received_at: null,
      position_lat: body.position_lat?.toString() ?? null,
      position_lon: body.position_lon?.toString() ?? null,
      speed_24h: body.speed_24h?.toString() ?? null,
      distance_to_go: body.distance_to_go?.toString() ?? null,
      eta_next_port: body.eta_next_port ?? null,
      bunker_rob_total_mt: body.bunker_rob_total_mt?.toString() ?? null,
      raw_content_ref: null,
      supersedes_report_id: body.supersedes_report_id ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(report, { status: 201 });
  }),

  // Port Call Reports
  http.get('http://localhost/api/v1/port-calls/:portCallId/reports', () => {
    return HttpResponse.json([]);
  }),
  http.post('http://localhost/api/v1/port-calls/:portCallId/reports', async ({ request, params }) => {
    const body = await request.json() as components['schemas']['ReportCreateDTO'];
    const report: components['schemas']['OperationalReportResponseDTO'] = {
      id: 'new-pc-report-id',
      voyage_id: null,
      port_call_id: params.portCallId as string,
      report_type: body.report_type,
      status: 'Pending',
      submitted_by_user_id: 'test-user-id',
      submitted_at: new Date().toISOString(),
      received_at: null,
      position_lat: null,
      position_lon: null,
      speed_24h: null,
      distance_to_go: null,
      eta_next_port: null,
      bunker_rob_total_mt: null,
      raw_content_ref: null,
      supersedes_report_id: body.supersedes_report_id ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(report, { status: 201 });
  }),

  // Report PATCH
  http.patch('http://localhost/api/v1/reports/:reportId', async ({ request, params }) => {
    const body = await request.json() as components['schemas']['ReportUpdateDTO'];
    const report: components['schemas']['OperationalReportResponseDTO'] = {
      id: params.reportId as string,
      voyage_id: null,
      port_call_id: 'test-port-call-id',
      report_type: 'Arrival',
      status: 'Pending',
      submitted_by_user_id: 'test-user-id',
      submitted_at: body.submitted_at ?? null,
      received_at: body.received_at ?? null,
      position_lat: null,
      position_lon: null,
      speed_24h: null,
      distance_to_go: null,
      eta_next_port: null,
      bunker_rob_total_mt: null,
      raw_content_ref: null,
      supersedes_report_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(report);
  }),

  // Report Transition
  http.post('http://localhost/api/v1/reports/:reportId/transition', async ({ request, params }) => {
    const body = await request.json() as components['schemas']['ReportTransitionDTO'];
    const report: components['schemas']['OperationalReportResponseDTO'] = {
      id: params.reportId as string,
      voyage_id: null,
      port_call_id: 'test-port-call-id',
      report_type: 'Arrival',
      status: body.status,
      submitted_by_user_id: 'test-user-id',
      submitted_at: new Date().toISOString(),
      received_at: null,
      position_lat: null,
      position_lon: null,
      speed_24h: null,
      distance_to_go: null,
      eta_next_port: null,
      bunker_rob_total_mt: null,
      raw_content_ref: null,
      supersedes_report_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(report);
  }),

  // Alerts
  http.get('http://localhost/api/v1/alerts', () => {
    return HttpResponse.json([]);
  }),
  http.post('http://localhost/api/v1/alerts', async ({ request }) => {
    const body = await request.json() as components['schemas']['AlertCreateBody'];
    const alert: components['schemas']['AlertReadDTO'] = {
      id: 'new-alert-id',
      linked_entity_type: body.linked_entity_type,
      linked_entity_id: body.linked_entity_id,
      alert_type: body.alert_type,
      message: body.message,
      severity: body.severity,
      triggered_at: new Date().toISOString(),
      resolved_at: null,
      resolved_by: null,
      resolution_note: null,
    };
    return HttpResponse.json(alert, { status: 201 });
  }),
  http.post('http://localhost/api/v1/alerts/:alertId/resolve', async ({ request, params }) => {
    const body = await request.json() as components['schemas']['AlertResolveBody'];
    const alert: components['schemas']['AlertReadDTO'] = {
      id: params.alertId as string,
      linked_entity_type: 'Voyage',
      linked_entity_id: 'test-voyage-id',
      alert_type: 'ETA Overdue',
      message: 'Test alert',
      severity: 'Info',
      triggered_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
      resolved_by: 'test-user-id',
      resolution_note: body.resolution_note ?? null,
    };
    return HttpResponse.json(alert);
  }),

  // Tasks
  http.get('http://localhost/api/v1/tasks', () => {
    return HttpResponse.json([]);
  }),
  http.post('http://localhost/api/v1/tasks', async ({ request }) => {
    const body = await request.json() as components['schemas']['TaskCreateBody'];
    const task: components['schemas']['TaskReadDTO'] = {
      id: 'new-task-id',
      linked_entity_type: body.linked_entity_type,
      linked_entity_id: body.linked_entity_id,
      title: body.title,
      description: body.description ?? null,
      assigned_to: body.assigned_to ?? null,
      due_datetime: body.due_datetime ?? null,
      status: 'Open',
      originating_alert_id: body.originating_alert_id ?? null,
      created_by: 'test-user-id',
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    return HttpResponse.json(task, { status: 201 });
  }),
  http.patch('http://localhost/api/v1/tasks/:taskId', async ({ request, params }) => {
    const body = await request.json() as components['schemas']['TaskUpdateBody'];
    const task: components['schemas']['TaskReadDTO'] = {
      id: params.taskId as string,
      linked_entity_type: 'Voyage',
      linked_entity_id: 'test-voyage-id',
      title: 'Updated Task',
      description: null,
      assigned_to: null,
      due_datetime: null,
      status: body.status ?? 'Open',
      originating_alert_id: null,
      created_by: 'test-user-id',
      created_at: new Date().toISOString(),
      completed_at: body.status === 'Done' ? new Date().toISOString() : null,
    };
    return HttpResponse.json(task);
  }),
];

// Re-export named fixtures for use in individual test overrides
export { MOCK_OPERATIONS_USER, MOCK_VIEWER_USER };
