import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json({
      id: 'test-user-id',
      username: 'operator',
      is_active: true,
      roles: ['operator'],
    });
  }),
  http.post('/api/v1/auth/login', () => {
    return HttpResponse.json({
      id: 'test-user-id',
      username: 'operator',
      is_active: true,
      roles: ['operator'],
    });
  }),
  http.post('/api/v1/auth/logout', () => {
    return new HttpResponse(null, { status: 200 });
  }),
];
