import { useState } from "react";
import { useTranslation } from "react-i18next";

// Rendered inside the header drawer, outside ProductProvider, so auth arrives as props.
export function ManagerMenu({ onRequests, onSignOut, authError }: { onRequests: () => void; onSignOut: () => Promise<void>; authError: boolean }) {
	const { t } = useTranslation();
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);
	async function leave() {
		setBusy(true);
		setFailed(false);
		try {
			await onSignOut();
		} catch {
			setFailed(true);
		} finally {
			setBusy(false);
		}
	}
	return (
		<div className="grid gap-2 border-t border-border p-4">
			<button className="feedback-action text-start" onClick={onRequests}>
				{t("feedback.myRequests")}
			</button>
			<button className="feedback-action text-start" disabled={busy} onClick={() => void leave()}>
				{t("feedback.signOut")}
			</button>
			{(authError || failed) && <p role="alert">{t("feedback.authError")}</p>}
		</div>
	);
}
