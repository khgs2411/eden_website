import type { ProductChangeRequest } from "@class-kit/react";
import { useEffect, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RequestRow } from "./request-row";
import type { RequestsApi } from "./use-uploads";

type ListState = { phase: "loading" | "loaded" | "error"; requests: ProductChangeRequest[] };
type ListEvent = { type: "loading" } | { type: "loaded"; requests: ProductChangeRequest[] } | { type: "error" };
function transition(state: ListState, event: ListEvent): ListState {
	if (event.type === "loaded") return { phase: "loaded", requests: event.requests.toSorted((a, b) => b.created_at.localeCompare(a.created_at)) };
	return { ...state, phase: event.type };
}
export function MyRequests({
	api,
	revision,
	onClose,
	onNew,
	onEdit,
}: {
	api: RequestsApi;
	revision: number;
	onClose: () => void;
	onNew: () => void;
	onEdit: (request: ProductChangeRequest) => void;
}) {
	const { t } = useTranslation();
	const [state, dispatch] = useReducer(transition, { phase: "loading", requests: [] });
	const [reload, setReload] = useState(0);
	const heading = useRef<HTMLHeadingElement>(null);
	useEffect(() => {
		heading.current?.focus();
		heading.current?.scrollIntoView({ block: "start" });
	}, []);
	useEffect(() => {
		let active = true;
		dispatch({ type: "loading" });
		api.list().then(
			({ requests }) => {
				if (active) dispatch({ type: "loaded", requests });
			},
			() => {
				if (active) dispatch({ type: "error" });
			},
		);
		return () => {
			active = false;
		};
	}, [api, revision, reload]);
	return (
		<section className="px-5 pb-10 pt-24" aria-labelledby="feedback-requests-heading">
			<div className="flex items-center justify-between gap-3">
				<h2 ref={heading} tabIndex={-1} id="feedback-requests-heading" className="min-w-0 flex-1 scroll-mt-20 font-display text-2xl font-bold">
					{t("feedback.myRequests")}
				</h2>
				<button className="feedback-action shrink-0 whitespace-nowrap" onClick={onClose}>
					{t("feedback.close")}
				</button>
			</div>
			{state.phase === "loading" && (
				<p role="status" className="py-5">
					{t("feedback.loading")}
				</p>
			)}
			{state.phase === "error" && (
				<div className="py-5">
					<p role="alert">{t("feedback.loadError")}</p>
					<button className="feedback-action mt-3" onClick={() => setReload((value) => value + 1)}>
						{t("feedback.retry")}
					</button>
				</div>
			)}
			{state.phase === "loaded" && (
				<>
					{!state.requests.length && <p className="py-5">{t("feedback.empty")}</p>}
					<button className="feedback-action feedback-primary my-4" onClick={onNew}>
						{t("feedback.newRequest")}
					</button>
					{(["open", "in_progress", "done", "closed"] as const).map((status) => {
						const requests = state.requests.filter((request) => request.status === status);
						return requests.length ? (
							<div key={status} className="mt-6">
								<h3 className="border-b border-accent-foreground pb-2 font-display text-lg">{t(`feedback.status.${status}`)}</h3>
								{requests.map((request) => (
									<RequestRow
										key={request.id}
										request={request}
										api={api}
										onEdit={onEdit}
										onDeleted={() => setReload((value) => value + 1)}
									/>
								))}
							</div>
						) : null;
					})}
				</>
			)}
		</section>
	);
}
