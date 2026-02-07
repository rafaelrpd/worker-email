import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

describe('worker-email', () => {
	it('GET /api/health (unit style)', async () => {
		const req = new Request('http://example.com/api/health');
		const ctx = createExecutionContext();

		const res = await worker.fetch(req, env as any, ctx);
		await waitOnExecutionContext(ctx);

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type') ?? '').toContain('application/json');

		const body = await res.json<unknown>();
		expect(body).toEqual({ ok: true, service: 'worker-email' });
	});

	it('OPTIONS /api/contact retorna 204 com headers CORS (unit style)', async () => {
		const allowedOrigins = 'https://allowed-origin.test';
		(env as any).ALLOWED_ORIGINS = allowedOrigins;

		const req = new Request('http://example.com/api/contact', {
			method: 'OPTIONS',
			headers: {
				Origin: 'https://allowed-origin.test',
				'Access-Control-Request-Method': 'POST',
				'Access-Control-Request-Headers': 'content-type',
			},
		});

		const ctx = createExecutionContext();
		const res = await worker.fetch(req, env as any, ctx);
		await waitOnExecutionContext(ctx);

		expect(res.status).toBe(204);
		expect(res.headers.get('access-control-allow-origin')).toBe('https://allowed-origin.test');
		expect(res.headers.get('access-control-allow-methods') ?? '').toContain('POST');
	});

	it('GET /nao-existe retorna 404 (unit style)', async () => {
		const req = new Request('http://example.com/nao-existe');
		const ctx = createExecutionContext();

		const res = await worker.fetch(req, env as any, ctx);
		await waitOnExecutionContext(ctx);

		expect(res.status).toBe(404);
	});

	it('GET /api/health (integration style)', async () => {
		const res = await SELF.fetch('https://example.com/api/health');
		expect(res.status).toBe(200);

		const body = await res.json<unknown>();
		expect(body).toEqual({ ok: true, service: 'worker-email' });
	});
});
