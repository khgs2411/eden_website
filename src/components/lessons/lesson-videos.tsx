import { useState, type CSSProperties, type SyntheticEvent } from "react";

import { CollapsibleToggle } from "@/components/ui/collapsible-toggle";

type LessonVideo = {
	src: string;
	poster: string;
	width: number;
	height: number;
};

type LessonVideosProps = {
	id: string;
	label: string;
	videos: readonly LessonVideo[];
};

// Desktop lays a group out as one equal-height row (widths proportional to aspect ratio). Once the
// aspect ratios sum past this, the ~672px desktop column makes that row shorter than ~220px, so the
// leading landscape video gets its own full-width row instead. Assumption tuned to the current layout.
const MAX_ROW_ASPECT = 3;

// Loading is staged: nothing is in the DOM while collapsed, opening fetches only posters
// (preload="none"), and a video streams only once played.
export function LessonVideos({ id, label, videos }: LessonVideosProps) {
	const [open, setOpen] = useState(false);
	const panelId = `${id}-videos`;
	const assetBase = import.meta.env.BASE_URL;

	// One video plays at a time across the page.
	function handlePlay(event: SyntheticEvent<HTMLVideoElement>) {
		document.querySelectorAll("video").forEach((video) => {
			if (video !== event.currentTarget) video.pause();
		});
	}

	if (videos.length === 0) return null;

	const rowAspect = videos.reduce((sum, video) => sum + video.width / video.height, 0);
	const featureFirst = rowAspect > MAX_ROW_ASPECT && videos[0].width > videos[0].height;

	return (
		<div className="mt-5">
			<CollapsibleToggle open={open} controls={panelId} onToggle={() => setOpen((current) => !current)}>
				{label}
			</CollapsibleToggle>

			{open && (
				<div
					id={panelId}
					className="-mx-6 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 animate-in fade-in slide-in-from-top-2 duration-300 lg:mx-0 lg:flex-wrap lg:items-start lg:gap-4 lg:overflow-visible lg:px-0">
					{videos.map((video, index) => {
						const landscape = video.width > video.height;
						// Mobile: a swipeable slide, wider for landscape. Desktop: flex-grow by aspect ratio, so every
						// video in a row ends up the same height.
						const desktopSize =
							featureFirst && index === 0 ? "lg:w-full lg:flex-none" : "lg:w-auto lg:min-w-0 lg:shrink lg:[flex:var(--aspect)_1_0%]";

						return (
							<video
								key={video.src}
								className={`${landscape ? "w-[85%]" : "w-[62%]"} shrink-0 snap-center rounded-md border border-border/80 bg-card/80 object-cover ${desktopSize}`}
								style={{ aspectRatio: `${video.width} / ${video.height}`, "--aspect": video.width / video.height } as CSSProperties}
								src={`${assetBase}${video.src}`}
								poster={`${assetBase}${video.poster}`}
								preload="none"
								controls
								// Hides the browser's download affordances (menu item, right-click "Save video as").
								// The file is still public, so this deters casual saving rather than preventing it.
								controlsList="nodownload"
								onContextMenu={(event) => event.preventDefault()}
								playsInline
								onPlay={handlePlay}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}
