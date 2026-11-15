// Kept free of ClassKit imports: the public site reads this to decide whether to load the feedback chunk at all.
export const feedbackAuthStorageKey = "eden-website-class-kit-auth";
export const manageHash = "#manage";

function hasStoredSession() {
	try {
		return localStorage.getItem(feedbackAuthStorageKey) !== null;
	} catch {
		return false;
	}
}

function isOAuthReturn() {
	return window.location.hash.includes("access_token=") || new URLSearchParams(window.location.search).has("code");
}

export function shouldLoadFeedback() {
	return window.location.hash === manageHash || hasStoredSession() || isOAuthReturn();
}
