type ContactPayload = {
	name: string;
	email: string;
	message: string;
	middleName?: string; // para honeypot
	turnstileToken?: string;
	elapsedMs?: number;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// CORS preflight
		if (request.method === 'OPTIONS') {
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
async function handleContact(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	// Validar o content-type
	const ct = request.headers.get('content-type') ?? '';
	if (!ct.toLowerCase().includes('application/json')) {
		return json({ ok: false, code: 'invalid_content_type' }, 415);
	}

	// Parse do body e validações
	let body: ContactPayload;
	try {
		body = (await request.json()) as ContactPayload;
	} catch {
		return json({ ok: false, code: 'invalid_json' }, 400);
	}

	const name = (body.name ?? '').trim();
	const email = (body.email ?? '').trim();
	const message = (body.message ?? '').trim();
	const middleName = (body.middleName ?? '').trim();
	const turnstileToken = (body.turnstileToken ?? '').trim();

	if (!name || !email || !message) {
		return json({ ok: false, code: 'missing_fields' }, 400);
	}

	// Honeypot
	if (middleName.length > 0) {
		return json({ ok: true }, 200);
	}

	// Validação velocidade de envio não humano
	const elapsedMs = Number(body.elapsedMs ?? 0);
	const minElapsedMs = parsePositiveInt(env.MIN_ELAPSED_MS, 900);

	if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
		return json({ ok: true }, 200);
	}

	if (elapsedMs < minElapsedMs) {
		return json({ ok: true }, 200);
	}

	// Ip para validação do turnstile e rate limit
	const ip = getClientIp(request);

	// Validar Turnstile
	if (!turnstileToken) {
		return json({ ok: false, code: 'missing_turnstile_token' }, 400);
	}

	const turnstileOk = await verifyTurnstile({
		secret: env.TURNSTILE_SECRET_KEY,
		token: turnstileToken,
		remoteIp: ip
	});

	if (!turnstileOk) {
		return json({ ok: false, code: 'turnstile_failed' }, 403);
	}

	// Validar Rate limit por IP no D1
	const nowIso = new Date().toISOString();
	const rateLimiteMinutes = parsePositiveInt(env.RATE_LIMIT_MINUTES, 5);

	const limited = await isRateLimited(env, ip, rateLimiteMinutes);
	if (limited) {
		return json({ ok: false, code: 'rate_limited' }, 429);
	}
	await upsertRateLimit(env, ip, nowIso);

	// Persistir no D1 (conversations + messages)
	const conversationId = crypto.randomUUID();
	const token = generateReplyToken();
	const subject = `Contato do site - ${name}`;

	await env.DB.batch([
		env.DB.prepare(
			`INSERT INTO conversations (id, token, from_name, from_email, subject, created_at, last_activity_at, status)
			 VALUES (?, ?, ?, ?, ?, ?, ?, 'open')`,
		).bind(conversationId, token, name, email, subject, nowIso, nowIso),

		env.DB.prepare(
			`INSERT INTO messages (id, conversation_id, direction, from_email, to_email, subject, body_text, body_html, created_at, resend_email_id)
			 VALUES (?, ?, 'inbound', ?, ?, ?, ?, NULL, ?, NULL)`,
		).bind(crypto.randomUUID(), conversationId, email, env.CONTACT_TO, subject, message, nowIso),
	]);

	// Enviar email via Resend
	const resendEmailId = await sendEmailResend({
		apiKey: env.RESEND_API_KEY,
		from: env.ALLOWED_REPLY_FROM,
		to: env.CONTACT_TO,
		subject,
		text: `Nome: ${name}\nEmail: ${email}\n\nMensagem:\n${message}\n\n(conversation_id=${conversationId})`,
		replyTo: env.ALLOWED_REPLY_FROM
	});

	// Atualizar e guardar dados do Resend
	if (resendEmailId) {
		await env.DB.prepare(
			`UPDATE messages SET resend_email_id = ? WHERE conversation_id = ? AND direction = 'inbound'`
		).bind(resendEmailId, conversationId).run();
	}

	return json({ ok: true }, 200);
}

// ---------------- Rate limit ----------------
function getClientIp(req: Request): string {
	return (
		req.headers.get('cf-connecting-ip') ??
		req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		'0.0.0.0'
	);
}

function parsePositiveInt(v: unknown, fallback: number): number {
	const n = Number(v);
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

async function isRateLimited(env: Env, ip: string, windowMinutes: number): Promise<boolean> {
	const row = await env.DB.prepare(`SELECT last_sent_at FROM rate_limits WHERE ip = ?`).bind(ip).first<{ last_sent_at: string }>();
	if (!row?.last_sent_at) return false;

	const last = Date.parse(row.last_sent_at);
	if (!Number.isFinite(last)) return false;

	const diffMs = Date.now() - last;
	return diffMs < windowMinutes * 60_000;
}

async function upsertRateLimit(env: Env, ip: string, nowIso: string): Promise<void> {
	await env.DB.prepare(
		`INSERT INTO rate_limits (ip, last_sent_at) VALUES (?, ?)
		 ON CONFLICT(ip) DO UPDATE SET last_sent_at = excluded.last_sent_at`,
	)
		.bind(ip, nowIso)
		.run();
}

// ---------------- Turnstile ----------------
async function verifyTurnstile(args: { secret: string; token: string; remoteIp?: string }): Promise<boolean> {
	const form = new FormData();
	form.set('secret', args.secret);
	form.set('response', args.token);
	if (args.remoteIp) form.set('remoteip', args.remoteIp);

	const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		body: form,
	});
	if (!res.ok) return false;

	const data = (await res.json()) as { success?: boolean };
	return data.success === true;
}

// ---------------- Resend ----------------
async function sendEmailResend(args: {
	apiKey: string;
	from: string;
	to: string;
	subject: string;
	text: string;
	replyTo?: string;
}): Promise<string | null> {
	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${args.apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from: args.from,
			to: [args.to],
			subject: args.subject,
			text: args.text,
			reply_to: args.replyTo,
		}),
	});

	if (!res.ok) {
		return null;
	}

	const json = (await res.json()) as { id?: string };
	return json.id ?? null;
}

// ---------------- Token ----------------
function generateReplyToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(24));
	return base64Url(bytes);
}

function base64Url(bytes: Uint8Array): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
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
