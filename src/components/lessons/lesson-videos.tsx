import { useState, type SyntheticEvent } from "react";

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

	return (
		<div className="mt-5">
			<CollapsibleToggle open={open} controls={panelId} count={videos.length} onToggle={() => setOpen((current) => !current)}>
				{label}
			</CollapsibleToggle>

			{open && (
				<div
					id={panelId}
					className="-mx-5 mt-4 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-5 pb-2 animate-in fade-in slide-in-from-top-2 duration-300">
					{videos.map((video) => {
						// A swipeable reel; landscape slides are wider so they stay watchable.
						const landscape = video.width > video.height;

						return (
							<video
								key={video.src}
								className={`${landscape ? "w-[88%]" : "w-[62%]"} shrink-0 snap-center rounded-xl border border-border/80 bg-card/80 object-cover`}
								style={{ aspectRatio: `${video.width} / ${video.height}` }}
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
