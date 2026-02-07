export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// CORS preflight
		if (request.method === 'OPTIONS') {
			console.log('Origin:', request.headers.get('Origin'));
			console.log('ALLOWED_ORIGINS:', env.ALLOWED_ORIGINS);

			return cors(new Response(null, { status: 204 }), request, env);
		}

		if (url.pathname === '/api/health') {
			return cors(json({ ok: true, service: 'worker-email' }), request, env);
		}

		if (url.pathname === '/api/contact' && request.method === 'POST') {
			return cors(await handleContact(request, env, ctx), request, env);
		}

		if (url.pathname === '/api/inbound/resend' && request.method === 'POST') {
			return await handleResendInbound(request, env, ctx);
		}

		return cors(new Response('Not Found', { status: 404 }), request, env);
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
async function handleContact(
	_request: Request,
	_env: Env,
	_ctx: ExecutionContext,
): Promise<Response> {
	// aqui entra: Turnstile + honeypot + rate limit + D1 + Resend send
	return json({ ok: false, message: 'Not implemented yet' }, 501);
}

async function handleResendInbound(
	_request: Request,
	_env: Env,
	_ctx: ExecutionContext,
): Promise<Response> {
	// aqui entra: validar webhook Svix + buscar conteúdo recebido + rotear reply+token
	return json({ ok: false, message: 'Not implemented yet' }, 501);
}

function cors(res: Response, req: Request, env: Env): Response {
	const origin = req.headers.get('Origin') ?? '';
	const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);

	const headers = new Headers(res.headers);

	if (allowedOrigins.has(origin)) {
		headers.set('Access-Control-Allow-Origin', origin);
		headers.set('Vary', 'Origin');
	}

	headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'content-type');
	headers.set('Access-Control-Max-Age', '86400');

	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers,
	});
}

function parseAllowedOrigins(value: string | undefined): Set<string> {
	return new Set(
		(value ?? '')
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean),
	);
}
