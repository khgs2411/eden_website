import { Check, Play, RefreshCw, SquareCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { callManagerApi, type AttendanceStatus, type ClassParticipant, type ManagedClass } from "@/components/product/manager/manager-api";
import { TrialAttendeeForm } from "@/components/product/manager/trial-attendee-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AttendanceSession({ refreshKey }: { refreshKey: number }) {
	const { t } = useTranslation();
	const [classes, setClasses] = useState<ManagedClass[]>([]);
	const [classId, setClassId] = useState("");
	const [participants, setParticipants] = useState<ClassParticipant[]>([]);
	const [walkInUserId, setWalkInUserId] = useState("");
	const [defaultAttendanceStatus, setDefaultAttendanceStatus] = useState<AttendanceStatus>("absent");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const selectedClass = useMemo(() => classes.find((classRow) => classRow.id === classId) ?? null, [classId, classes]);
	const selectableClasses = classes.filter((classRow) => classRow.status === "published" && classRow.lifecycle_status !== "cancelled" && classRow.lifecycle_status !== "completed");

	const loadClasses = useCallback(async () => {
		const data = await callManagerApi<{ classes: ManagedClass[] }>("classes", { action: "list_manager" });
		setClasses(data.classes);
		setClassId((current) => current || data.classes.find((classRow) => classRow.status === "published" && classRow.lifecycle_status !== "cancelled" && classRow.lifecycle_status !== "completed")?.id || "");
	}, []);

	const loadParticipants = useCallback(async () => {
		if (!classId) return;
		const data = await callManagerApi<{ participants: ClassParticipant[] }>("attendance", { action: "list_class", class_id: classId });
		setParticipants(data.participants);
	}, [classId]);

	const refresh = useCallback(async () => {
		setLoading(true);
		setMessage(null);
		try {
			await loadClasses();
			await loadParticipants();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : t("managerOps.errors.generic"));
		} finally {
			setLoading(false);
		}
	}, [loadClasses, loadParticipants, t]);

	useEffect(() => {
		const timer = window.setTimeout(() => void refresh(), 0);
		return () => window.clearTimeout(timer);
	}, [refresh, refreshKey]);

	async function startClass() {
		if (!classId) return;
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi("attendance", { action: "start", class_id: classId, default_attendance_status: defaultAttendanceStatus });
			await refresh();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : t("managerOps.errors.generic"));
		} finally {
			setLoading(false);
		}
	}

	async function updateAttendance(participantId: string, attendanceStatus: AttendanceStatus) {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi("attendance", { action: "update_attendance", participant_id: participantId, attendance_status: attendanceStatus });
			await loadParticipants();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : t("managerOps.errors.generic"));
		} finally {
			setLoading(false);
		}
	}

	async function addWalkIn() {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi("attendance", { action: "add_walk_in", class_id: classId, user_id: walkInUserId.trim(), attendance_status: "present" });
			setWalkInUserId("");
			await loadParticipants();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : t("managerOps.errors.generic"));
		} finally {
			setLoading(false);
		}
	}

	async function addTrial(trial: { trial_name: string; trial_contact: string | null }) {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi("attendance", { action: "add_trial", class_id: classId, ...trial });
			await loadParticipants();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : t("managerOps.errors.generic"));
		} finally {
			setLoading(false);
		}
	}

	async function completeClass() {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi("attendance", { action: "complete", class_id: classId });
			await refresh();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : t("managerOps.errors.generic"));
		} finally {
			setLoading(false);
		}
	}

	const attendanceStarted = selectedClass?.lifecycle_status === "in_progress";

	return (
		<div className="rounded-md border border-border bg-card p-4">
			<div className="flex items-center justify-between gap-3">
				<h3 className="font-display text-lg font-bold uppercase">{t("managerOps.attendance.title")}</h3>
				<Button type="button" variant="outline" size="sm" onClick={refresh} disabled={loading}>
					<RefreshCw className="size-4" />
					{t("managerOps.refresh")}
				</Button>
			</div>
			<div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto_auto]">
				<div className="grid gap-2">
					<Label>{t("managerOps.attendance.class")}</Label>
					<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={classId} onChange={(event) => setClassId(event.target.value)}>
						<option value="">{t("managerOps.none")}</option>
						{selectableClasses.map((classRow) => <option key={classRow.id} value={classRow.id}>{classRow.name} · {formatDate(classRow.starts_at)} · {classRow.lifecycle_status}</option>)}
					</select>
				</div>
				<div className="grid gap-2">
					<Label>{t("managerOps.attendance.defaultStatus")}</Label>
					<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={defaultAttendanceStatus} onChange={(event) => setDefaultAttendanceStatus(event.target.value as AttendanceStatus)}>
						<option value="absent">{t("managerOps.attendance.statuses.absent")}</option>
						<option value="present">{t("managerOps.attendance.statuses.present")}</option>
					</select>
				</div>
				<div className="flex items-end">
					<Button type="button" onClick={startClass} disabled={loading || !classId || attendanceStarted}>
						<Play className="size-4" />
						{t("managerOps.attendance.start")}
					</Button>
				</div>
				<div className="flex items-end">
					<Button type="button" variant="outline" onClick={completeClass} disabled={loading || !attendanceStarted}>
						<SquareCheck className="size-4" />
						{t("managerOps.attendance.complete")}
					</Button>
				</div>
			</div>
			{message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
			<div className="mt-4 grid gap-3">
				<div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[1fr_auto]">
					<div className="grid gap-2">
						<Label>{t("managerOps.attendance.walkInUserId")}</Label>
						<Input value={walkInUserId} onChange={(event) => setWalkInUserId(event.target.value)} />
					</div>
					<div className="flex items-end">
						<Button type="button" variant="outline" onClick={addWalkIn} disabled={loading || !attendanceStarted || !walkInUserId.trim()}>{t("managerOps.attendance.addWalkIn")}</Button>
					</div>
				</div>
				<TrialAttendeeForm disabled={loading || !attendanceStarted} onAdd={addTrial} />
			</div>
			<div className="mt-4 grid gap-2">
				{participants.length === 0 ? <p className="text-sm text-muted-foreground">{t("managerOps.attendance.empty")}</p> : null}
				{participants.map((participant) => (
					<div key={participant.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
						<div>
							<p>{labelParticipant(participant)}</p>
							<p className="text-xs text-muted-foreground">{t(`managerOps.attendance.kinds.${participant.participant_kind}`)} · {t(`managerOps.attendance.statuses.${participant.attendance_status}`)}</p>
						</div>
						<div className="flex gap-2">
							<Button type="button" size="sm" onClick={() => updateAttendance(participant.id, "present")} disabled={loading || participant.attendance_status === "present"}>
								<Check className="size-4" />
								{t("managerOps.attendance.present")}
							</Button>
							<Button type="button" variant="outline" size="sm" onClick={() => updateAttendance(participant.id, "absent")} disabled={loading || participant.attendance_status === "absent"}>
								<X className="size-4" />
								{t("managerOps.attendance.absent")}
							</Button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function labelParticipant(participant: ClassParticipant) {
	if (participant.participant_kind === "trial") return participant.trial_name ?? "Trial";
	return participant.user_id ?? participant.id;
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
