import { ClassManagementUiProvider, ManagerClassDashboard, ManagerOperationsDashboard, ProductProvider, UserDashboard, useProductContext } from "@eden/class-management-react";
import { useTranslation } from "react-i18next";

import { edenClassManagementClient } from "@/components/class-management/eden-class-management-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const edenUiAdapter = {
	Button,
	Input,
	Label,
	Textarea,
};

export function ClassManagementSection() {
	const { t } = useTranslation();

	return (
		<section id="class-management" className="border-y border-border bg-background px-4 py-8">
			<div className="mx-auto grid max-w-3xl gap-4">
				<div>
					<p className="font-display text-xs font-bold uppercase text-accent-foreground">{t("classManagement.eyebrow")}</p>
					<h2 className="mt-1 font-display text-3xl font-bold uppercase tracking-normal">{t("classManagement.title")}</h2>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("classManagement.body")}</p>
				</div>
				<ClassManagementUiProvider adapter={edenUiAdapter}>
					<ProductProvider client={edenClassManagementClient}>
						<EdenClassManagementWorkflows />
					</ProductProvider>
				</ClassManagementUiProvider>
			</div>
		</section>
	);
}

function EdenClassManagementWorkflows() {
	const { t } = useTranslation();
	const { productUser } = useProductContext();
	const isActiveManager = productUser?.role === "manager" && productUser.status === "active";

	return (
		<div className="grid gap-6">
			<UserDashboard
				labels={{
					loading: t("classManagement.user.loading"),
					productKey: (productKey) => t("classManagement.user.productKey", { productKey }),
					anonymousRole: t("classManagement.user.anonymousRole"),
					activeRole: t("classManagement.user.activeRole"),
					inactiveRole: t("classManagement.user.inactiveRole"),
					errorPrefix: t("classManagement.user.errorPrefix"),
					auth: {
						email: t("productShell.auth.email"),
						password: t("productShell.auth.password"),
						signIn: t("productShell.auth.signIn"),
						signingIn: t("productShell.auth.signingIn"),
						signOut: t("productShell.auth.signOut"),
						signedIn: t("productShell.auth.signedIn"),
						refresh: t("productShell.auth.refresh"),
					},
					classes: {
						eyebrow: t("productShell.classes.eyebrow"),
						title: t("productShell.classes.title"),
						refresh: t("productShell.classes.refresh"),
						loading: t("productShell.classes.loading"),
						empty: t("productShell.classes.empty"),
						result: {
							pending: t("productShell.classes.result.pending"),
							approved: t("productShell.classes.result.approved"),
							rejected: t("productShell.classes.result.rejected"),
							cancelled: t("productShell.classes.result.cancelled"),
						},
						errors: {
							membershipRequired: t("productShell.classes.errors.membershipRequired"),
							membershipStockDepleted: t("productShell.classes.errors.membershipStockDepleted"),
							capacityFull: t("productShell.classes.errors.capacityFull"),
							notRegisterable: t("productShell.classes.errors.notRegisterable"),
						},
						classDetail: {
							selectPrompt: t("productShell.classes.selectPrompt"),
							defaultCategory: t("productShell.classes.defaultCategory"),
							locationTbd: t("productShell.classes.locationTbd"),
							capacity: (approved, capacity) => t("productShell.classes.capacity", { approved, capacity }),
							membershipMessages: {
								none: t("productShell.classes.membershipMessages.none"),
								required: t("productShell.classes.membershipMessages.required"),
							},
							policyMessages: {
								auto_approve: t("productShell.classes.policyMessages.auto_approve"),
								member_auto_approve: t("productShell.classes.policyMessages.member_auto_approve"),
								approval_required: t("productShell.classes.policyMessages.approval_required"),
							},
							actions: {
								register: t("productShell.classes.actions.register"),
								cancel: t("productShell.classes.actions.cancel"),
								working: t("productShell.classes.actions.working"),
							},
							registrationStatus: {
								pending: t("productShell.classes.registrationStatus.pending"),
								approved: t("productShell.classes.registrationStatus.approved"),
								rejected: t("productShell.classes.registrationStatus.rejected"),
								cancelled: t("productShell.classes.registrationStatus.cancelled"),
							},
						},
					},
				}}
			/>
			{isActiveManager ? (
				<div className="grid gap-5 border-t border-border pt-6">
					<div>
						<p className="font-display text-xs font-bold uppercase text-accent-foreground">{t("classManagement.manager.eyebrow")}</p>
						<h3 className="mt-1 font-display text-2xl font-bold uppercase">{t("classManagement.manager.title")}</h3>
					</div>
					<ManagerClassDashboard />
					<ManagerOperationsDashboard />
				</div>
			) : null}
		</div>
	);
}
