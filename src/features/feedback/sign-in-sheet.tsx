import { useProductContext } from "@class-kit/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FeedbackSheet } from "./feedback-sheet";

export function SignInSheet({ onClose }: { onClose: () => void }) {
	const { session, loading, error, signInWithGoogle, signOut, refreshProductContext } = useProductContext();
	const { t } = useTranslation();
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);
	async function run(action: () => Promise<void>) {
		setBusy(true);
		setFailed(false);
		try { await action(); } catch { setFailed(true); } finally { setBusy(false); }
	}
	return (
		<FeedbackSheet title={t("feedback.signIn")} onClose={onClose}>
			{loading ? <p role="status">{t("feedback.loading")}</p> : <>
				{session && <p className="mb-4">{t("feedback.noAccess")}</p>}
				<button className="feedback-action feedback-primary w-full" disabled={busy} onClick={() => void run(session ? signOut : signInWithGoogle)}>
					{t(session ? "feedback.signOut" : "feedback.google")}
				</button>
			</>}
			{(error || failed) && <p role="alert" className="mt-4">{t("feedback.authError")} <button className="feedback-action" disabled={busy} onClick={() => void run(refreshProductContext)}>{t("feedback.retry")}</button></p>}
		</FeedbackSheet>
	);
}
