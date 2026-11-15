import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { acceptedTypes } from "./request-model";
import type { useUploads } from "./use-uploads";

export function Attachments({
	uploads,
	locked = false,
	requestId,
	onUploaded,
}: {
	uploads: ReturnType<typeof useUploads>;
	locked?: boolean;
	requestId?: string | null;
	onUploaded?: () => void;
}) {
	const { t } = useTranslation();
	const input = useRef<HTMLInputElement>(null);
	return (
		<div className="grid gap-3">
			{!locked && (
				<div className="grid gap-2">
					<span className="font-display">{t("feedback.files")}</span>
					{/* The native input's labels are browser-localized, so it stays hidden behind a translated button. */}
					<input
						ref={input}
						type="file"
						multiple
						hidden
						accept={acceptedTypes.join(",")}
						onChange={(event) => {
							const added = uploads.add(Array.from(event.target.files ?? []));
							event.target.value = "";
							if (requestId) void Promise.all(added.map((item) => uploads.upload(requestId, item))).then(onUploaded);
						}}
					/>
					<button type="button" className="feedback-action justify-self-start" onClick={() => input.current?.click()}>
						{t("feedback.chooseFiles")}
					</button>
					<span className="text-sm text-muted-foreground">{t("feedback.filesHelp")}</span>
				</div>
			)}
			{uploads.errors.map((error, index) => (
				<p key={index} role="alert" className="break-words text-sm">
					{error.name}: {t(`feedback.${error.reason}`)}
				</p>
			))}
			<ul className="grid gap-2" aria-live="polite">
				{uploads.files.map((item) => (
					<li key={item.id} className="flex flex-wrap items-center gap-2 border-b border-border py-2 text-sm">
						<span className="min-w-0 flex-1 break-all">{item.file.name}</span>
						<span>{t(`feedback.upload.${item.status}`)}</span>
						{!locked && !requestId && (
							<button type="button" className="feedback-action" onClick={() => uploads.remove(item.id)}>
								{t("feedback.remove")}
							</button>
						)}
						{requestId && item.status === "failed" && (
							<button type="button" className="feedback-action" onClick={() => void uploads.upload(requestId, item).then(onUploaded)}>
								{t("feedback.retry")}
							</button>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}
