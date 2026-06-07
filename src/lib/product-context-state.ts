import type { Session } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

import type { ProductSummary, ProductUserSummary } from "@/lib/product-api";

export type ProductContextValue = {
	productKey: string;
	product: ProductSummary | null;
	productUser: ProductUserSummary | null;
	session: Session | null;
	loading: boolean;
	error: string | null;
	refreshProductContext: () => Promise<void>;
	signIn: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
};

export const ProductContext = createContext<ProductContextValue | null>(null);

export function useProductContext() {
	const value = useContext(ProductContext);
	if (!value) throw new Error("useProductContext must be used inside ProductProvider.");
	return value;
}
