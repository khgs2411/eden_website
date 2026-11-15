import type { ClassKitClient } from "@class-kit/react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PickMode } from "./pick-mode";
import { RequestSheet } from "./request-sheet";
import type { SpotContext } from "./request-model";

export function FeedbackManager({ client, userId, theme, menuOpen }: { client: ClassKitClient; userId: string; theme: string; menuOpen: boolean }) {
	const { t } = useTranslation();
	const [picking, setPicking] = useState(false);
	const [context, setContext] = useState<SpotContext | null>(null);
	const button = useRef<HTMLButtonElement>(null);
	const cancel = useCallback(() => { setPicking(false); button.current?.focus(); }, []);
	const pick = useCallback((spot: SpotContext) => { setPicking(false); setContext(spot); }, []);
	return <>
		<div className="pointer-events-none fixed bottom-5 left-1/2 z-30 w-full max-w-(--shell-width) -translate-x-1/2 px-5 text-end">
			<button ref={button} type="button" hidden={menuOpen || picking || !!context} className="feedback-action feedback-primary pointer-events-auto shadow-lg" onClick={() => setPicking(true)}>{t("feedback.button")}</button>
		</div>
		{picking && !menuOpen && <PickMode theme={theme} onCancel={cancel} onPick={pick} />}
		{context && <RequestSheet api={client.management.changeRequests} draftKey={`eden-feedback:${userId}:new`} context={context} onClose={() => { setContext(null); button.current?.focus(); }} onSaved={() => {}} />}
	</>;
}
