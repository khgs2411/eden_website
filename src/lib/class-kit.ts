import { createClassKitClient } from "@class-kit/react";

export const classKit = createClassKitClient(import.meta.env, {
	authStorageKey: "eden-website-class-kit-auth",
});
