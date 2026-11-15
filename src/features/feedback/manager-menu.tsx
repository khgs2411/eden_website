import { useProductContext } from "@class-kit/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ManagerMenu({ onRequests }: { onRequests: () => void }) {
	const { signOut, error } = useProductContext();
	const { t } = useTranslation();
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);
	async function leave() {
		setBusy(true);
		setFailed(false);
		try {
			await signOut();
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
			{(error || failed) && <p role="alert">{t("feedback.authError")}</p>}
		</div>
	);
}
