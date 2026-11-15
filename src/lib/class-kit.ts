import { createClassKitClient } from "@class-kit/react";
import { feedbackAuthStorageKey } from "@/features/feedback/activation";

export const classKit = createClassKitClient(import.meta.env, {
	authStorageKey: feedbackAuthStorageKey,
});
