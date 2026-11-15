import type { ProductChangeRequest } from "@class-kit/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Attachments } from "./attachments";
import { useUploads, type RequestsApi } from "./use-uploads";

export function RequestRow({
	request,
	api,
	onEdit,
	onChanged,
}: {
	request: ProductChangeRequest;
	api: RequestsApi;
	onEdit: (request: ProductChangeRequest) => void;
	onChanged: () => void;
}) {
	const { t, i18n } = useTranslation();
	const uploads = useUploads(api);
	const [adding, setAdding] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [failed, setFailed] = useState(false);
	const busy = deleting || uploads.files.some((file) => file.status === "uploading");
	const date = new Date(request.created_at).toLocaleDateString(i18n.resolvedLanguage);
	const label = typeof request.context.label === "string" ? request.context.label : t("feedback.noSpot");
	// Revisions retain their own attachments, so show filenames across the thread.
	const attachments = Array.from(
		new Map(
			[request, ...request.revisions]
				.flatMap((revision) => revision.attachments)
				.filter((file) => file.status === "uploaded")
				.map((file) => [file.id, file]),
		).values(),
	);
	async function remove() {
		if (busy) return;
		setDeleting(true);
		setFailed(false);
		try {
			await api.delete(request.id);
			onChanged();
		} catch {
			setFailed(true);
		} finally {
			setDeleting(false);
		}
	}
	return (
		<details className="border-b border-border py-4">
			<summary className="cursor-pointer space-y-2 break-words font-display">
				<span className="text-lg font-bold">{request.title ?? request.description.split("\n")[0]}</span>
				<span className="flex flex-wrap items-center gap-2 text-sm">
					<span className="border border-border px-2 py-1">{t(`feedback.types.${request.type}`)}</span>
					<time dateTime={request.created_at}>{date}</time>
				</span>
				<span className="block text-sm text-muted-foreground">{label}</span>
			</summary>
			<div className="mt-4 grid gap-4">
				<p className="whitespace-pre-wrap break-words">{request.description}</p>
				{attachments.length > 0 && (
					<ul aria-label={t("feedback.files")} className="list-inside list-disc text-sm">
						{attachments.map((file) => (
							<li className="break-all" key={file.id}>
								{file.file_name}
							</li>
						))}
					</ul>
				)}
				<div className="flex flex-wrap gap-2">
					<button className="feedback-action" disabled={busy} onClick={() => onEdit(request)}>
						{t("feedback.edit")}
					</button>
					<button className="feedback-action" disabled={busy} aria-expanded={adding} onClick={() => setAdding(!adding)}>
						{t("feedback.addFiles")}
					</button>
					<button className="feedback-action" disabled={busy} onClick={() => setConfirming(true)}>
						{t("feedback.delete")}
					</button>
				</div>
				{adding && <Attachments uploads={uploads} locked={deleting} requestId={request.id} onUploaded={onChanged} />}
				{confirming && (
					<div className="border-s-2 border-accent-foreground ps-3">
						<p>{t("feedback.deleteConfirm")}</p>
						<div className="mt-2 flex gap-2">
							<button className="feedback-action" disabled={busy} onClick={() => setConfirming(false)}>
								{t("feedback.cancel")}
							</button>
							<button className="feedback-action feedback-primary" disabled={busy} onClick={() => void remove()}>
								{t("feedback.delete")}
							</button>
						</div>
					</div>
				)}
				{failed && <p role="alert">{t("feedback.deleteError")}</p>}
			</div>
		</details>
	);
}
