import { UserPlus } from "lucide-react";
import { useState } from "react";

import { useClassManagementUi } from "../../ui/ui-adapter";

const labels = {
	trialName: "Trial name",
	trialContact: "Trial contact",
	addTrial: "Add trial",
};

export function TrialAttendeeForm({ disabled, onAdd }: { disabled?: boolean; onAdd: (trial: { trial_name: string; trial_contact: string | null }) => Promise<void> }) {
	const { Button, Input, Label } = useClassManagementUi();
	const [trialName, setTrialName] = useState("");
	const [trialContact, setTrialContact] = useState("");

	async function submit() {
		await onAdd({ trial_name: trialName.trim(), trial_contact: trialContact.trim() || null });
		setTrialName("");
		setTrialContact("");
	}

	return (
		<div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-3">
			<div className="grid gap-2">
				<Label>{labels.trialName}</Label>
				<Input value={trialName} onChange={(event) => setTrialName(event.target.value)} />
			</div>
			<div className="grid gap-2">
				<Label>{labels.trialContact}</Label>
				<Input value={trialContact} onChange={(event) => setTrialContact(event.target.value)} />
			</div>
			<div className="flex items-end">
				<Button type="button" onClick={submit} disabled={disabled || !trialName.trim()}>
					<UserPlus className="size-4" />
					{labels.addTrial}
				</Button>
			</div>
		</div>
	);
}
