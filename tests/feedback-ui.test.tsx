import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import type { Root } from "react-dom/client";
import type { ProductChangeRequest } from "@class-kit/react";
import type { RequestsApi } from "../src/features/feedback/use-uploads";

const dom = new Window({ url: "http://localhost:5175" });
Object.assign(globalThis, {
	window: dom,
	document: dom.document,
	HTMLElement: dom.HTMLElement,
	Element: dom.Element,
	MouseEvent: dom.MouseEvent,
	KeyboardEvent: dom.KeyboardEvent,
	localStorage: dom.localStorage,
	IS_REACT_ACT_ENVIRONMENT: true,
});
// DOM emulation does not implement modal top-layer behavior; browser QA remains required.
dom.HTMLDialogElement.prototype.showModal = function () {
	this.open = true;
};
dom.HTMLDialogElement.prototype.close = function () {
	this.open = false;
};
dom.HTMLElement.prototype.scrollIntoView = function () {};
const { createRoot } = await import("react-dom/client");
const { RequestSheet } = await import("../src/features/feedback/request-sheet");
const { MyRequests } = await import("../src/features/feedback/my-requests");
const { PickMode } = await import("../src/features/feedback/pick-mode");
const { default: i18n } = await import("../src/i18n");
let root: Root;
let host: HTMLElement;
const request = {
	id: "request-1",
	title: "Change this",
	description: "Change this\nMore detail",
	type: "feature_request",
	status: "open",
	context: { section: "home", label: "Home" },
	created_at: "2026-11-15T10:00:00Z",
	attachments: [],
	revisions: [],
} as unknown as ProductChangeRequest;
const context = { section: "home", label: "Home", language: "en", theme: "dark", url: "http://localhost:5175", viewport: { width: 375, height: 812 } };
beforeAll(async () => {
	await i18n.changeLanguage("en");
});
afterEach(async () => {
	if (root) await act(async () => root.unmount());
	dom.document.body.innerHTML = "";
	dom.localStorage.clear();
});
async function render(element: React.ReactNode) {
	host = document.createElement("div");
	document.body.append(host);
	root = createRoot(host);
	await act(async () => root.render(element));
}
async function click(text: string) {
	const button = Array.from(host.querySelectorAll("button")).find((item) => item.textContent === text);
	expect(button).toBeDefined();
	await act(async () => button!.click());
}
async function submit() {
	await act(async () => {
		host.querySelector("form")!.dispatchEvent(new dom.Event("submit", { bubbles: true, cancelable: true }));
	});
}
function seed(key = "test-draft") {
	dom.localStorage.setItem(key, JSON.stringify({ description: request.description, type: request.type, context }));
}

describe("request form integration with an isolated API", () => {
	test("creates once, clears the draft, and retries only a failed attachment", async () => {
		seed();
		let creates = 0;
		let uploads = 0;
		const api = {
			create: async (input: { title: string; context: unknown }) => {
				creates++;
				expect(input.title).toBe("Change this");
				expect(input.context).toEqual(context);
				return { request };
			},
			uploadAttachment: async (id: string) => {
				expect(id).toBe(request.id);
				if (++uploads === 1) throw new Error("offline");
				return {};
			},
		} as unknown as RequestsApi;
		await render(<RequestSheet api={api} draftKey="test-draft" context={context} onClose={() => {}} onSaved={() => {}} />);
		const file = new dom.File(["image"], "screen.png", { type: "image/png" });
		const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
		Object.defineProperty(input, "files", { value: [file], configurable: true });
		await act(async () => {
			input.dispatchEvent(new dom.Event("change", { bubbles: true }));
		});
		await submit();
		expect(creates).toBe(1);
		expect(uploads).toBe(1);
		expect(dom.localStorage.getItem("test-draft")).toBeNull();
		expect(host.textContent).toContain("Upload failed");
		await click("Retry");
		expect(uploads).toBe(2);
		expect(creates).toBe(1);
		expect(host.textContent).toContain("Request sent.");
	});
	test("preserves failed drafts and edits using the returned revision for uploads", async () => {
		seed();
		let attempts = 0;
		let updated = "";
		let uploadedTo = "";
		const api = {
			update: async (input: { requestId: string }) => {
				updated = input.requestId;
				if (++attempts === 1) throw new Error("offline");
				return { request: { ...request, id: "revision-2" } };
			},
			uploadAttachment: async (id: string) => {
				uploadedTo = id;
				return {};
			},
		} as unknown as RequestsApi;
		await render(<RequestSheet api={api} request={request} draftKey="test-draft" context={context} onClose={() => {}} onSaved={() => {}} />);
		const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
		Object.defineProperty(input, "files", { value: [new dom.File(["image"], "revision.png", { type: "image/png" })], configurable: true });
		await act(async () => {
			input.dispatchEvent(new dom.Event("change", { bubbles: true }));
		});
		await submit();
		expect(host.textContent).toContain("not saved");
		expect(dom.localStorage.getItem("test-draft")).not.toBeNull();
		await submit();
		expect(updated).toBe(request.id);
		expect(uploadedTo).toBe("revision-2");
		expect(attempts).toBe(2);
		expect(host.textContent).toContain("Request sent.");
	});
	test("renders translated form copy in all supported languages", async () => {
		const labels = { he: "מה תרצי לשנות?", en: "What should change?", ru: "Что нужно изменить?" };
		await render(<RequestSheet api={{} as RequestsApi} draftKey="test-draft" context={context} onClose={() => {}} onSaved={() => {}} />);
		for (const [language, label] of Object.entries(labels)) {
			await act(async () => {
				await i18n.changeLanguage(language);
			});
			expect(host.textContent).toContain(label);
			expect(host.textContent).not.toContain("feedback.");
		}
		await act(async () => {
			await i18n.changeLanguage("en");
		});
	});
});

test("list retries load errors and requires confirmation before deletion", async () => {
	let lists = 0;
	let deletes = 0;
	const api = {
		list: async () => {
			if (++lists === 1) throw new Error("offline");
			return { requests: deletes ? [] : [request] };
		},
		delete: async (id: string) => {
			expect(id).toBe(request.id);
			deletes++;
		},
	} as unknown as RequestsApi;
	await render(<MyRequests api={api} revision={0} onClose={() => {}} onNew={() => {}} onEdit={() => {}} />);
	expect(host.textContent).toContain("Could not load");
	await click("Retry");
	expect(host.textContent).toContain("Received");
	await click("Delete");
	expect(deletes).toBe(0);
	const buttons = Array.from(host.querySelectorAll("button")).filter((button) => button.textContent === "Delete");
	await act(async () => buttons.at(-1)!.click());
	expect(deletes).toBe(1);
	expect(host.textContent).toContain("No requests yet");
});

test("picking a nested lesson prevents navigation and preserves its id", async () => {
	const region = document.createElement("section");
	region.dataset.feedbackSection = "lessons";
	region.dataset.feedbackLabel = "Lessons";
	region.innerHTML =
		'<a href="https://example.com" data-feedback-section="lessons" data-feedback-label="Vogue" data-feedback-lesson="lesson-1"><span>Vogue</span></a>';
	document.body.append(region);
	let picked: unknown;
	await render(
		<PickMode
			theme="dark"
			onPick={(value) => {
				picked = value;
			}}
			onCancel={() => {}}
		/>,
	);
	const event = new dom.MouseEvent("click", { bubbles: true, cancelable: true });
	await act(async () => {
		region.querySelector("span")!.dispatchEvent(event);
	});
	expect(event.defaultPrevented).toBe(true);
	expect(picked).toMatchObject({ section: "lessons", label: "Vogue", lessonId: "lesson-1", theme: "dark" });
});

test("closing a pending save and reopening preserves the single submission", async () => {
	const { FeedbackManager } = await import("../src/features/feedback/feedback-manager");
	seed("eden-feedback:test-user:new");
	let creates = 0;
	let resolveSave!: (value: { request: ProductChangeRequest }) => void;
	const api = {
		create: () => {
			creates++;
			return new Promise<{ request: ProductChangeRequest }>((resolve) => {
				resolveSave = resolve;
			});
		},
	} as unknown as RequestsApi;
	const client = { management: { changeRequests: api } } as unknown as import("@class-kit/react").ClassKitClient;
	await render(<FeedbackManager client={client} userId="test-user" theme="dark" menuOpen={false} requestsOpen={false} onCloseRequests={() => {}} />);
	await click("Request a change");
	await click("Not about a specific spot");
	await submit();
	expect(creates).toBe(1);
	await click("Close");
	expect(host.querySelector("dialog")?.open).toBe(false);
	await click("Request a change");
	expect(host.querySelector("dialog")?.open).toBe(true);
	await submit();
	expect(creates).toBe(1);
	await act(async () => resolveSave({ request }));
	expect(host.textContent).toContain("Request sent.");
});

test("public and manager surfaces obey session and permission checks", async () => {
	const { AppForTest, ContextForTest } = await (async () => {
		const [{ default: AppForTest }, { ProductContext: ContextForTest }] = await Promise.all([import("../src/App"), import("@class-kit/react")]);
		return { AppForTest, ContextForTest };
	})();
	Object.assign(globalThis, { MutationObserver: dom.MutationObserver });
	const base = {
		client: { management: { changeRequests: {} } },
		loading: false,
		session: null,
		capabilities: { permissions: [] },
		error: null,
	} as unknown as import("@class-kit/react").ProductContextValue;
	await render(
		<ContextForTest.Provider value={base}>
			<AppForTest />
		</ContextForTest.Provider>,
	);
	expect(host.textContent).not.toContain("Request a change");
	expect(host.querySelector("dialog")).toBeNull();
	const noPermission = { ...base, session: { user: { id: "test-user" } } } as import("@class-kit/react").ProductContextValue;
	await act(async () =>
		root.render(
			<ContextForTest.Provider value={noPermission}>
				<AppForTest />
			</ContextForTest.Provider>,
		),
	);
	expect(host.textContent).not.toContain("Request a change");
	const manager = { ...noPermission, capabilities: { ...noPermission.capabilities, permissions: ["product_change_requests.manage"] } };
	await act(async () =>
		root.render(
			<ContextForTest.Provider value={manager}>
				<AppForTest />
			</ContextForTest.Provider>,
		),
	);
	expect(host.textContent).toContain("Request a change");
	await act(async () =>
		root.render(
			<ContextForTest.Provider value={{ ...manager, client: null }}>
				<AppForTest />
			</ContextForTest.Provider>,
		),
	);
	expect(host.textContent).not.toContain("Request a change");
});
