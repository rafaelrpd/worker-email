export {};

declare global {
	interface Env {
		// vars (plaintext no dashboard)
		ALLOWED_ORIGINS: string; // ex: "https://www.google.com,https://google.com,http://localhost:5173,http://localhost:8787"
		REPLY_PREFIX: string; // ex: "reply+"
		TOKEN_INACTIVITY_DAYS: string; // ex: "180"
		RATE_LIMIT_MINUTES: string; // ex: "5"

		// secrets (no dashboard)
		INBOX_TO: string; // ex: "contact@google.com"
		ALLOWED_REPLY_FROM: string; // ex: "reply@google.com"
		CONTACT_TO: string; // ex: "contact@google.com"
	}
}
