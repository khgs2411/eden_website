import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { getProductContext } from "../client/product-api";
import type { ClassManagementClient } from "../client/supabase";
import { ProductContext, type ProductContextValue } from "./product-context-state";
import type { ProductSummary, ProductUserSummary } from "../types";

type ProductProviderProps = {
	children: ReactNode;
	client: ClassManagementClient | null;
};

function isStaleRefreshTokenError(error: Error) {
	return error.message.toLowerCase().includes("refresh token");
}

function clearStoredSupabaseSession(client: ClassManagementClient) {
	window.localStorage.removeItem(client.authStorageKey);
}

export function ProductProvider({ children, client }: ProductProviderProps) {
	const [session, setSession] = useState<Session | null>(null);
	const [product, setProduct] = useState<ProductSummary | null>(null);
	const [productUser, setProductUser] = useState<ProductUserSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const productKey = client?.productKey ?? "";

	const refreshProductContext = useCallback(async () => {
		setLoading(true);
		setError(null);

		const response = await getProductContext(client);

		if (response.error) {
			setProduct(null);
			setProductUser(null);
			setError(response.error.message);
		} else {
			setProduct(response.data.product);
			setProductUser(response.data.product_user);
		}

		setLoading(false);
	}, [client]);

	useEffect(() => {
		let mounted = true;

		async function loadSession() {
			if (!client) {
				setLoading(false);
				setError("Supabase is not configured for this environment.");
				return;
			}

			const { data, error: sessionError } = await client.supabase.auth.getSession();
			if (!mounted) return;

			if (sessionError) {
				if (isStaleRefreshTokenError(sessionError)) {
					clearStoredSupabaseSession(client);
					setSession(null);
				} else {
					setError(sessionError.message);
				}
			} else {
				setSession(data.session);
			}

			await refreshProductContext();
		}

		void loadSession();

		if (!client) {
			return () => {
				mounted = false;
			};
		}

		const { data } = client.supabase.auth.onAuthStateChange((_event, nextSession) => {
			setSession(nextSession);
			void refreshProductContext();
		});

		return () => {
			mounted = false;
			data.subscription.unsubscribe();
		};
	}, [client, refreshProductContext]);

	const signIn = useCallback(
		async (email: string, password: string) => {
			if (!client) {
				setError("Supabase is not configured for this environment.");
				return;
			}

			setError(null);
			const { error: signInError } = await client.supabase.auth.signInWithPassword({ email, password });
			if (signInError) setError(signInError.message);
		},
		[client],
	);

	const signOut = useCallback(async () => {
		if (!client) return;

		setError(null);
		const { error: signOutError } = await client.supabase.auth.signOut();
		if (signOutError) setError(signOutError.message);
	}, [client]);

	const value = useMemo<ProductContextValue>(
		() => ({
			client,
			productKey,
			product,
			productUser,
			session,
			loading,
			error,
			refreshProductContext,
			signIn,
			signOut,
		}),
		[client, error, loading, product, productKey, productUser, refreshProductContext, session, signIn, signOut],
	);

	return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}
