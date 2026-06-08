import { LogIn, LogOut, RefreshCw } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useProductContext } from "../context/product-context-state";
import { useClassManagementUi } from "../ui/ui-adapter";

export type AuthPanelLabels = {
	email?: string;
	password?: string;
	signIn?: string;
	signingIn?: string;
	signedIn?: string;
	signOut?: string;
	refresh?: string;
};

const defaultLabels = {
	email: "Email",
	password: "Password",
	signIn: "Sign in",
	signingIn: "Signing in...",
	signedIn: "Signed in",
	signOut: "Sign out",
	refresh: "Refresh",
} satisfies Required<AuthPanelLabels>;

export function AuthPanel({ labels: labelOverrides }: { labels?: AuthPanelLabels }) {
	const labels = { ...defaultLabels, ...labelOverrides };
	const { Button, Input, Label } = useClassManagementUi();
	const { session, signIn, signOut, refreshProductContext, loading } = useProductContext();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSubmitting(true);
		await signIn(email, password);
		setSubmitting(false);
	}

	if (session) {
		return (
			<div className="grid gap-3 border-t border-border pt-4">
				<div>
					<p className="font-display text-xs font-bold uppercase text-muted-foreground">{labels.signedIn}</p>
					<p className="mt-1 break-words text-sm font-bold">{session.user.email}</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button type="button" variant="outline" size="sm" onClick={refreshProductContext} disabled={loading}>
						<RefreshCw className="size-4" />
						{labels.refresh}
					</Button>
					<Button type="button" variant="ghost" size="sm" onClick={signOut}>
						<LogOut className="size-4" />
						{labels.signOut}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<form className="grid gap-3 border-t border-border pt-4" onSubmit={handleSubmit}>
			<div className="grid gap-1.5">
				<Label htmlFor="class-management-email">{labels.email}</Label>
				<Input id="class-management-email" type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} required />
			</div>
			<div className="grid gap-1.5">
				<Label htmlFor="class-management-password">{labels.password}</Label>
				<Input
					id="class-management-password"
					type="password"
					value={password}
					autoComplete="current-password"
					onChange={(event) => setPassword(event.target.value)}
					required
				/>
			</div>
			<Button type="submit" className="w-full" disabled={submitting}>
				<LogIn className="size-4" />
				{submitting ? labels.signingIn : labels.signIn}
			</Button>
		</form>
	);
}
