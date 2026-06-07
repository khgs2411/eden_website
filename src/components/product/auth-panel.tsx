import { LogIn, LogOut, RefreshCw } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProductContext } from "@/lib/product-context-state";

export function AuthPanel() {
	const { t } = useTranslation();
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
					<p className="font-display text-xs font-bold uppercase text-muted-foreground">{t("productShell.auth.signedIn")}</p>
					<p className="mt-1 break-words text-sm font-bold">{session.user.email}</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button type="button" variant="outline" size="sm" onClick={refreshProductContext} disabled={loading}>
						<RefreshCw className="size-4" />
						{t("productShell.auth.refresh")}
					</Button>
					<Button type="button" variant="ghost" size="sm" onClick={signOut}>
						<LogOut className="size-4" />
						{t("productShell.auth.signOut")}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<form className="grid gap-3 border-t border-border pt-4" onSubmit={handleSubmit}>
			<div className="grid gap-1.5">
				<Label htmlFor="product-email">{t("productShell.auth.email")}</Label>
				<Input id="product-email" type="email" value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} required />
			</div>
			<div className="grid gap-1.5">
				<Label htmlFor="product-password">{t("productShell.auth.password")}</Label>
				<Input
					id="product-password"
					type="password"
					value={password}
					autoComplete="current-password"
					onChange={(event) => setPassword(event.target.value)}
					required
				/>
			</div>
			<Button type="submit" className="w-full" disabled={submitting}>
				<LogIn className="size-4" />
				{submitting ? t("productShell.auth.signingIn") : t("productShell.auth.signIn")}
			</Button>
		</form>
	);
}
