import { useEffect, useState } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { HeroSection } from "@/components/sections/hero-section";
import { LessonsSection } from "@/components/sections/lessons-section";
import { PrivateLessonSection } from "@/components/sections/private-lesson-section";
import { VoguePricingView } from "@/components/sections/vogue-pricing-view";
import type { Lesson } from "@/data/site";
import { useTheme } from "@/hooks/use-theme";
import { getDrawerSide, getPreferredLocale, type DrawerSide } from "@/lib/locale";

function App() {
	const { theme, toggleTheme } = useTheme();
	const [menuOpen, setMenuOpen] = useState(false);
	const [activeView, setActiveView] = useState<"home" | "voguePricing">("home");
	const [drawerSide, setDrawerSide] = useState<DrawerSide>(() => getDrawerSide(getPreferredLocale()));

	useEffect(() => {
		const updateDrawerSide = () => setDrawerSide(getDrawerSide(getPreferredLocale()));
		const observer = new MutationObserver(updateDrawerSide);

		observer.observe(document.documentElement, {
			attributeFilter: ["lang"],
			attributes: true,
		});

		window.addEventListener("languagechange", updateDrawerSide);
		window.addEventListener("storage", updateDrawerSide);

		return () => {
			observer.disconnect();
			window.removeEventListener("languagechange", updateDrawerSide);
			window.removeEventListener("storage", updateDrawerSide);
		};
	}, []);

	useEffect(() => {
		if (!menuOpen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setMenuOpen(false);
		};

		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", handleKeyDown);

		return () => {
			document.body.style.overflow = "";
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [menuOpen]);

	function handleLessonSelect(lesson: Lesson) {
		if ("kind" in lesson) return;
		if (lesson.style !== "Vogue") return;

		setActiveView("voguePricing");
		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	return (
		<main className="mx-auto min-h-screen max-w-[430px] overflow-hidden bg-background text-foreground shadow-[0_0_0_1px_var(--border),0_24px_80px_rgba(0,0,0,0.18)] sm:my-1 sm:rounded-[1.25rem] lg:max-w-[820px]">
			<SiteHeader drawerSide={drawerSide} menuOpen={menuOpen} onMenuOpenChange={setMenuOpen} onThemeToggle={toggleTheme} theme={theme} />
			{activeView === "voguePricing" ? (
				<VoguePricingView onBack={() => setActiveView("home")} />
			) : (
				<>
					<div className="bg-background">
						<HeroSection theme={theme} />
						<LessonsSection onLessonSelect={handleLessonSelect} />
					</div>
					<PrivateLessonSection />
				</>
			)}
			<SiteFooter />
		</main>
	);
}

export default App;
