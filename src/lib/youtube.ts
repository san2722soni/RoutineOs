import { env } from "@/src/lib/env";
import type { ResourceItem } from "@/src/types";

type PlaylistItemsResponse = {
  nextPageToken?: string;
  items?: {
    snippet?: {
      title?: string;
      resourceId?: { videoId?: string };
    };
  }[];
};

type VideosResponse = {
  items?: {
    id: string;
    contentDetails?: { duration?: string };
    snippet?: { title?: string };
  }[];
};

export function extractPlaylistId(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return url.searchParams.get("list") ?? "";
  } catch {
    return trimmed;
  }
}

export function extractVideoId(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) return url.pathname.replace("/", "");
    if (url.pathname.includes("/embed/")) return url.pathname.split("/embed/")[1]?.split("/")[0] ?? "";
    if (url.pathname.includes("/shorts/")) return url.pathname.split("/shorts/")[1]?.split("/")[0] ?? "";
    return url.searchParams.get("v") ?? trimmed;
  } catch {
    return trimmed;
  }
}

function isYoutubeUrl(input: string) {
  try {
    const host = new URL(input.trim()).hostname.toLowerCase().replace(/^www\./, "");
    return host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtu.be";
  } catch {
    return false;
  }
}

function hasPlaylist(input: string) {
  return Boolean(isYoutubeUrl(input) && extractPlaylistId(input));
}

function hasVideo(input: string) {
  const id = isYoutubeUrl(input) ? extractVideoId(input) : "";
  return /^[\w-]{11}$/.test(id);
}

export function validateYoutubeResourceUrl(input: string, type: "youtube-playlist" | "youtube-video") {
  const url = input.trim();
  if (!url) return "Paste a YouTube link first.";
  if (!isYoutubeUrl(url)) return "Not a valid YouTube URL.";
  if (type === "youtube-playlist" && !hasPlaylist(url)) return "Not a valid playlist link. Use a YouTube playlist URL with a list parameter.";
  if (type === "youtube-video" && hasPlaylist(url)) return "This looks like a playlist link. Use a Playlist resource for playlist links.";
  if (type === "youtube-video" && !hasVideo(url)) return "Not a valid video link. Use a YouTube video, shorts, embed, or youtu.be URL.";
  return "";
}

export function parseIsoDuration(duration: string) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, hours = "0", minutes = "0", seconds = "0"] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

export function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function apiGet<T>(path: string, params: Record<string, string>) {
  if (!env.youtubeApiKey) throw new Error("Missing EXPO_PUBLIC_YOUTUBE_API_KEY in .env");
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries({ ...params, key: env.youtubeApiKey }).forEach(([key, value]) => url.searchParams.set(key, value));

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch {
    throw new Error("Network failed. Check internet/VPN, then retry.");
  }

  const data = await response.json().catch(() => undefined);
  if (!response.ok) {
    const reason = data?.error?.errors?.[0]?.reason;
    const message = data?.error?.message ?? "YouTube request failed";
    throw new Error(reason ? `${message} (${reason})` : message);
  }
  return data as T;
}

function item(resourceId: string, order: number, id: string, title: string, durationSeconds: number, url: string): ResourceItem {
  return {
    id,
    resourceId,
    title,
    url,
    durationSeconds,
    order,
    completed: false,
  };
}

export async function fetchPlaylistItems(resourceId: string, playlistUrl: string): Promise<ResourceItem[]> {
  const playlistId = extractPlaylistId(playlistUrl);
  if (!playlistId) throw new Error("Invalid playlist URL");

  const videos: { id: string; title: string }[] = [];
  let pageToken = "";

  do {
    const page = await apiGet<PlaylistItemsResponse>("playlistItems", {
      part: "snippet",
      playlistId,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });

    for (const playlistItem of page.items ?? []) {
      const id = playlistItem.snippet?.resourceId?.videoId;
      if (id) videos.push({ id, title: playlistItem.snippet?.title ?? "Untitled video" });
    }

    pageToken = page.nextPageToken ?? "";
  } while (pageToken);

  const items: ResourceItem[] = [];
  for (let i = 0; i < videos.length; i += 50) {
    const chunk = videos.slice(i, i + 50);
    const details = await apiGet<VideosResponse>("videos", {
      part: "snippet,contentDetails",
      id: chunk.map((video) => video.id).join(","),
      maxResults: "50",
    });
    const byId = new Map((details.items ?? []).map((video) => [video.id, video]));
    for (const video of chunk) {
      const detail = byId.get(video.id);
      const seconds = parseIsoDuration(detail?.contentDetails?.duration ?? "PT0S");
      items.push(item(resourceId, items.length, video.id, detail?.snippet?.title ?? video.title, seconds, `https://www.youtube.com/watch?v=${video.id}&list=${playlistId}`));
    }
  }

  return items;
}

export async function fetchVideoChunks(resourceId: string, videoUrl: string, chunkMinutes: number): Promise<ResourceItem[]> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) throw new Error("Invalid video URL");

  const details = await apiGet<VideosResponse>("videos", {
    part: "snippet,contentDetails",
    id: videoId,
    maxResults: "1",
  });
  const video = details.items?.[0];
  if (!video) throw new Error("Video not found.");

  const totalSeconds = parseIsoDuration(video.contentDetails?.duration ?? "PT0S");
  const chunkSeconds = Math.max(60, chunkMinutes * 60);
  const count = Math.max(1, Math.ceil(totalSeconds / chunkSeconds));
  const title = video.snippet?.title ?? "YouTube video";

  return Array.from({ length: count }, (_, index) => {
    const start = index * chunkSeconds;
    const end = Math.min(totalSeconds, start + chunkSeconds);
    return item(resourceId, index, `${videoId}-chunk-${index + 1}`, `${title} (${formatDuration(start)}-${formatDuration(end)})`, end - start, `https://www.youtube.com/watch?v=${videoId}&t=${start}s`);
  });
}
