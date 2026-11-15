import type { ClassKitClient, ProductChangeRequest } from "@class-kit/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MyRequests } from "./my-requests";
import { PickMode } from "./pick-mode";
import { RequestSheet } from "./request-sheet";
import type { SpotContext } from "./request-model";

type Surface = { kind: "idle" } | { kind: "picking" } | { kind: "form"; context: Record<string, unknown>; request?: ProductChangeRequest; open: boolean };
export function FeedbackManager({
	client,
	userId,
	theme,
	menuOpen,
	requestsOpen,
	onCloseRequests,
}: {
	client: ClassKitClient;
	userId: string;
	theme: string;
	menuOpen: boolean;
	requestsOpen: boolean;
	onCloseRequests: () => void;
}) {
	const { t } = useTranslation();
	const [surface, setSurface] = useState<Surface>({ kind: "idle" });
	const [revision, setRevision] = useState(0);
	const button = useRef<HTMLButtonElement>(null);
	const returnFocus = useRef<HTMLElement | null>(null);
	const restoreFocus = useRef(false);
	const cancel = useCallback(() => {
		restoreFocus.current = true;
		setSurface({ kind: "idle" });
	}, []);
	const pick = useCallback((context: SpotContext) => setSurface({ kind: "form", context, open: true }), []);
	function rememberFocus() {
		returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
	}
	function start() {
		rememberFocus();
		setSurface(surface.kind === "form" ? { ...surface, open: true } : { kind: "picking" });
	}
	useEffect(() => {
		if ((surface.kind === "idle" || (surface.kind === "form" && !surface.open)) && restoreFocus.current) {
			(returnFocus.current?.isConnected ? returnFocus.current : button.current)?.focus();
			restoreFocus.current = false;
		}
	}, [surface]);
	return (
		<>
			{requestsOpen && (
				<MyRequests
					api={client.management.changeRequests}
					revision={revision}
					onClose={onCloseRequests}
					onNew={start}
					onEdit={(request) => {
						rememberFocus();
						setSurface(surface.kind === "form" ? { ...surface, open: true } : { kind: "form", request, context: request.context, open: true });
					}}
				/>
			)}
			<div className="pointer-events-none fixed bottom-5 left-1/2 z-30 w-full max-w-(--shell-width) -translate-x-1/2 px-5 text-end">
				<button
					ref={button}
					type="button"
					hidden={menuOpen || surface.kind === "picking" || (surface.kind === "form" && surface.open)}
					className="feedback-action feedback-primary pointer-events-auto shadow-lg"
					onClick={start}>
					{t("feedback.button")}
				</button>
			</div>
			{surface.kind === "picking" && !menuOpen && <PickMode theme={theme} onCancel={cancel} onPick={pick} />}
			{surface.kind === "form" && (
				<RequestSheet
					open={surface.open}
					api={client.management.changeRequests}
					draftKey={`eden-feedback:${userId}:${surface.request?.id ?? "new"}`}
					request={surface.request}
					context={surface.context}
					onClose={(keepPending) => {
						restoreFocus.current = true;
						setSurface(keepPending ? { ...surface, open: false } : { kind: "idle" });
					}}
					onSaved={() => setRevision((value) => value + 1)}
				/>
			)}
		</>
	);
}
