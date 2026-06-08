import type { Session } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

import type { ClassManagementClient } from "../client/supabase";
import type { ProductSummary, ProductUserSummary } from "../types";

export type ProductContextValue = {
	client: ClassManagementClient | null;
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

export function useClassManagementClient() {
	return useProductContext().client;
}
