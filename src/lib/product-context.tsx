import { ProductProvider as ClassManagementProductProvider } from "@eden/class-management-react";
import type { ReactNode } from "react";

import { classManagementClient } from "@/lib/supabase";

export function ProductProvider({ children }: { children: ReactNode }) {
	return <ClassManagementProductProvider client={classManagementClient}>{children}</ClassManagementProductProvider>;
}
