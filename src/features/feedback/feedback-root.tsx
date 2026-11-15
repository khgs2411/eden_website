import { ProductProvider, useProductContext } from "@class-kit/react";
import { useEffect, type ReactNode } from "react";
import { classKit } from "@/lib/class-kit";
import { FeedbackManager } from "./feedback-manager";
import { ManagerMenu } from "./manager-menu";
import { SignInSheet } from "./sign-in-sheet";

export type FeedbackRootProps = {
	theme: string;
	menuOpen: boolean;
	requestsOpen: boolean;
	manageOpen: boolean;
	onOpenRequests: () => void;
	onCloseRequests: () => void;
	onCloseManage: () => void;
	onManagerActions: (actions: ReactNode) => void;
};

// Loaded lazily by App, so the ClassKit SDK and Supabase stay out of the public bundle.
export default function FeedbackRoot(props: FeedbackRootProps) {
	return (
		<ProductProvider client={classKit}>
			<FeedbackLayer {...props} />
		</ProductProvider>
	);
}

export function FeedbackLayer({ theme, menuOpen, requestsOpen, manageOpen, onOpenRequests, onCloseRequests, onCloseManage, onManagerActions }: FeedbackRootProps) {
	const { client, session, capabilities, loading, signOut, error } = useProductContext();
	const isManager = !!client && !!session && !loading && capabilities.permissions.includes("product_change_requests.manage");
	useEffect(() => {
		onManagerActions(isManager ? <ManagerMenu onRequests={onOpenRequests} onSignOut={signOut} authError={!!error} /> : null);
		return () => onManagerActions(null);
	}, [isManager, onManagerActions, onOpenRequests, signOut, error]);
	return (
		<>
			{isManager && (
				<FeedbackManager
					key={session.user.id}
					client={client}
					userId={session.user.id}
					theme={theme}
					menuOpen={menuOpen}
					requestsOpen={requestsOpen}
					onCloseRequests={onCloseRequests}
				/>
			)}
			{client && manageOpen && !isManager && <SignInSheet onClose={onCloseManage} />}
		</>
	);
}
