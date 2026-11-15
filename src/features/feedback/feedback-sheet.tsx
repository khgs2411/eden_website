import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function FeedbackSheet({ title, children, onClose, open = true }: { title: string; children: ReactNode; onClose: () => void; open?: boolean }) {
	const dialog = useRef<HTMLDialogElement>(null);
	const heading = useId();
	useEffect(() => {
		if (!open) return;
		const element = dialog.current!;
		const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const overflow = document.body.style.overflow;
		element.showModal();
		document.body.style.overflow = "hidden";
		return () => {
			element.close();
			document.body.style.overflow = overflow;
			previous?.focus();
		};
	}, [open]);
	const { t } = useTranslation();
	return (
		<dialog
			ref={dialog}
			aria-labelledby={heading}
			className="feedback-sheet"
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}>
			<header className="mb-5 flex items-center justify-between gap-4">
				<h2 id={heading} className="min-w-0 flex-1 font-display text-2xl font-bold">
					{title}
				</h2>
				<button type="button" className="feedback-action shrink-0 whitespace-nowrap" onClick={onClose}>
					{t("feedback.close")}
				</button>
			</header>
			{children}
		</dialog>
	);
}
