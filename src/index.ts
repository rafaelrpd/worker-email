export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// (Opcional) healthcheck rápido pra validar deploy/route
		if (url.pathname === '/api/health') {
			return json({ ok: true, service: 'worker-email' });
		}

		if (url.pathname === '/api/contact' && request.method === 'POST') {
			return handleContact(request, env, ctx);
		}

		if (url.pathname === '/api/inbound/resend' && request.method === 'POST') {
			return handleResendInbound(request, env, ctx);
		}

		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;

// ---------------- helpers ----------------
function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

// ---------------- handlers (placeholder) ----------------
async function handleContact(_request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
	// aqui entra: Turnstile + honeypot + rate limit + D1 + Resend send
	return json({ ok: false, message: 'Not implemented yet' }, 501);
}

async function handleResendInbound(_request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
	// aqui entra: validar webhook Svix + buscar conteúdo recebido + rotear reply+token
	return json({ ok: false, message: 'Not implemented yet' }, 501);
}