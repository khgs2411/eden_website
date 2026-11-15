import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { SpotContext } from "./request-model";

export function PickMode({ onPick, onCancel, theme }: { onPick: (context: SpotContext) => void; onCancel: () => void; theme: string }) {
	const { t, i18n } = useTranslation();
	function contextFor(element: HTMLElement | null): SpotContext {
		return {
			section: element?.dataset.feedbackSection ?? null,
			label: element?.dataset.feedbackLabel ?? null,
			...(element?.dataset.feedbackLesson ? { lessonId: element.dataset.feedbackLesson } : {}),
			url: window.location.href,
			language: i18n.resolvedLanguage ?? "he",
			theme,
			viewport: { width: window.innerWidth, height: window.innerHeight },
		};
	}
	useEffect(() => {
		const regions = Array.from(document.querySelectorAll<HTMLElement>("[data-feedback-section]"));
		const previous = regions.map((element) => ({ element, tabIndex: element.getAttribute("tabindex") }));
		for (const element of regions) element.tabIndex = 0;
		document.documentElement.classList.add("feedback-picking");
		function pick(event: MouseEvent | KeyboardEvent) {
			if (event instanceof KeyboardEvent && event.key === "Escape") {
				event.preventDefault();
				onCancel();
				return;
			}
			if (event instanceof KeyboardEvent && event.key !== "Enter" && event.key !== " ") return;
			const element = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-feedback-section]") : null;
			if (!element) return;
			event.preventDefault();
			event.stopPropagation();
			onPick({
				section: element.dataset.feedbackSection!,
				label: element.dataset.feedbackLabel!,
				...(element.dataset.feedbackLesson ? { lessonId: element.dataset.feedbackLesson } : {}),
				url: window.location.href,
				language: i18n.resolvedLanguage ?? "he",
				theme,
				viewport: { width: window.innerWidth, height: window.innerHeight },
			});
		}
		document.addEventListener("click", pick, true);
		document.addEventListener("keydown", pick, true);
		return () => {
			document.documentElement.classList.remove("feedback-picking");
			for (const { element, tabIndex } of previous) {
				if (tabIndex === null) element.removeAttribute("tabindex");
				else element.setAttribute("tabindex", tabIndex);
			}
			document.removeEventListener("click", pick, true);
			document.removeEventListener("keydown", pick, true);
		};
	}, [onPick, onCancel, i18n.resolvedLanguage, theme]);
	return (
		<div className="fixed bottom-0 left-1/2 z-40 w-full max-w-(--shell-width) -translate-x-1/2 border-t border-accent-foreground bg-background p-3 shadow-xl">
			<p role="status" className="mb-2 font-display text-sm">
				{t("feedback.pickHint")}
			</p>
			<div className="flex gap-2">
				<button type="button" className="feedback-action flex-1" onClick={() => onPick(contextFor(null))}>
					{t("feedback.noSpot")}
				</button>
				<button type="button" className="feedback-action" onClick={onCancel}>
					{t("feedback.cancel")}
				</button>
			</div>
		</div>
	);
}
