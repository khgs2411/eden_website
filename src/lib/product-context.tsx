import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { invokeProductFunction, productKey, type ProductContextResponse, type ProductSummary, type ProductUserSummary } from "@/lib/product-api";
import { ProductContext, type ProductContextValue } from "@/lib/product-context-state";
import { supabase } from "@/lib/supabase";

export function ProductProvider({ children }: { children: ReactNode }) {
	const [session, setSession] = useState<Session | null>(null);
	const [product, setProduct] = useState<ProductSummary | null>(null);
	const [productUser, setProductUser] = useState<ProductUserSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refreshProductContext = useCallback(async () => {
		setLoading(true);
		setError(null);

		const response = await invokeProductFunction<ProductContextResponse>("product-context");

		if (response.error) {
			setProduct(null);
			setProductUser(null);
			setError(response.error.message);
		} else {
			setProduct(response.data.product);
			setProductUser(response.data.product_user);
		}

		setLoading(false);
	}, []);

	useEffect(() => {
		let mounted = true;

		async function loadSession() {
			if (!supabase) {
				setLoading(false);
				setError("Supabase is not configured for this environment.");
				return;
			}

			const { data, error: sessionError } = await supabase.auth.getSession();
			if (!mounted) return;

			if (sessionError) {
				setError(sessionError.message);
			} else {
				setSession(data.session);
			}

			await refreshProductContext();
		}

		void loadSession();

		if (!supabase) return () => {
			mounted = false;
		};

		const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
			setSession(nextSession);
			void refreshProductContext();
		});

		return () => {
			mounted = false;
			data.subscription.unsubscribe();
		};
	}, [refreshProductContext]);

	const signIn = useCallback(async (email: string, password: string) => {
		if (!supabase) {
			setError("Supabase is not configured for this environment.");
			return;
		}

		setError(null);
		const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
		if (signInError) setError(signInError.message);
	}, []);

	const signOut = useCallback(async () => {
		if (!supabase) return;

		setError(null);
		const { error: signOutError } = await supabase.auth.signOut();
		if (signOutError) setError(signOutError.message);
	}, []);

	const value = useMemo<ProductContextValue>(
		() => ({
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
		[error, loading, product, productUser, refreshProductContext, session, signIn, signOut],
	);

	return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}
