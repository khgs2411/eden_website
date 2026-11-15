import { useTranslation } from "react-i18next";
import { acceptedTypes } from "./request-model";
import type { useUploads } from "./use-uploads";

export function Attachments({ uploads, locked = false, requestId, onUploaded }: {
	uploads: ReturnType<typeof useUploads>; locked?: boolean; requestId?: string | null; onUploaded?: () => void;
}) {
	const { t } = useTranslation();
	return <div className="grid gap-3">
		{!locked && <label className="grid gap-2 font-display">
			<span>{t("feedback.files")}</span>
			<input type="file" multiple accept={acceptedTypes.join(",")} className="w-full min-w-0 text-sm file:me-2 file:border file:border-border file:bg-background file:p-2 file:text-foreground" onChange={(event) => {
				const added = uploads.add(Array.from(event.target.files ?? []));
				event.target.value = "";
				if (requestId) void Promise.all(added.map((item) => uploads.upload(requestId, item))).then(onUploaded);
			}} />
			<span className="text-sm text-muted-foreground">{t("feedback.filesHelp")}</span>
		</label>}
		{uploads.errors.map((error, index) => <p key={index} role="alert" className="break-words text-sm">{error.name}: {t(`feedback.${error.reason}`)}</p>)}
		<ul className="grid gap-2" aria-live="polite">
			{uploads.files.map((item) => <li key={item.id} className="flex flex-wrap items-center gap-2 border-b border-border py-2 text-sm">
				<span className="min-w-0 flex-1 break-all">{item.file.name}</span>
				<span>{t(`feedback.upload.${item.status}`)}</span>
				{!locked && !requestId && <button type="button" className="feedback-action" onClick={() => uploads.remove(item.id)}>{t("feedback.remove")}</button>}
				{requestId && item.status === "failed" && <button type="button" className="feedback-action" onClick={() => void uploads.upload(requestId, item).then(onUploaded)}>{t("feedback.retry")}</button>}
			</li>)}
		</ul>
	</div>;
}
