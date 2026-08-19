"use client";

import { track } from "@vercel/analytics";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Recitation = { id: string; surahNumber: number; surahName: string; arabicName: string; reciter: string; juz: string; duration: number; videoId: string };
type Playlist = { title: string; tracks: Recitation[] };
type YouTubePlayer = { playVideo(): void; pauseVideo(): void; loadVideoById(id: string): void; previousVideo(): void; nextVideo(): void; seekTo(seconds: number, allowSeekAhead: boolean): void; getCurrentTime(): number; getDuration(): number; destroy(): void };

declare global { interface Window { YT?: { Player: new (element: HTMLElement, options: object) => YouTubePlayer; PlayerState: { PLAYING: number; PAUSED: number; ENDED: number } }; onYouTubeIframeAPIReady?: () => void; } }

const RECITER = "Sheikh Muhammad Siddiq Al-Minshawi";
const AUTHORIZED_PLAYLIST_ID = "PLxpAkjlGauHdUcO_uc-8F8J2NUQRDZjPG";
// Replace each videoId with an embeddable upload from a rights holder you are authorized to use.
// `duration: 0` deliberately displays “—” until its verified duration is supplied alongside the ID.
const playlists: Playlist[] = [
  { title: "Selected Surahs", tracks: [
    { id: "authorized-playlist", surahNumber: 0, surahName: "Sheikh Minshawi Recitations", arabicName: "تلاوات الشيخ المنشاوي", reciter: RECITER, juz: "YouTube Music playlist", duration: 0, videoId: "dEYJbD25QVM" },
    { id: "mulk", surahNumber: 67, surahName: "Surah Al-Mulk", arabicName: "سورة الملك", reciter: RECITER, juz: "Juz 29", duration: 0, videoId: "REPLACE_WITH_AUTHORIZED_VIDEO_ID" },
    { id: "rahman", surahNumber: 55, surahName: "Surah Ar-Rahman", arabicName: "سورة الرحمن", reciter: RECITER, juz: "Juz 27", duration: 0, videoId: "REPLACE_WITH_AUTHORIZED_VIDEO_ID" },
  ] },
  { title: "Short Surahs", tracks: [
    { id: "ikhlas", surahNumber: 112, surahName: "Surah Al-Ikhlas", arabicName: "سورة الإخلاص", reciter: RECITER, juz: "Juz 30", duration: 0, videoId: "REPLACE_WITH_AUTHORIZED_VIDEO_ID" },
    { id: "falaq", surahNumber: 113, surahName: "Surah Al-Falaq", arabicName: "سورة الفلق", reciter: RECITER, juz: "Juz 30", duration: 0, videoId: "REPLACE_WITH_AUTHORIZED_VIDEO_ID" },
    { id: "nas", surahNumber: 114, surahName: "Surah An-Nas", arabicName: "سورة الناس", reciter: RECITER, juz: "Juz 30", duration: 0, videoId: "REPLACE_WITH_AUTHORIZED_VIDEO_ID" },
  ] },
  { title: "Full / Extended Recitations", tracks: [
    { id: "baqarah", surahNumber: 2, surahName: "Surah Al-Baqarah", arabicName: "سورة البقرة", reciter: RECITER, juz: "Juz 1–3", duration: 0, videoId: "REPLACE_WITH_AUTHORIZED_VIDEO_ID" },
  ] },
];

const glass = "border border-white/10 bg-gradient-to-b from-white/[0.15] to-white/[0.055] backdrop-blur-3xl backdrop-saturate-[1.7] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.2)]";
const formatTime = (seconds: number) => seconds > 0 && Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}` : "—";
const isConfigured = (id: string) => id.length === 11 && !id.startsWith("REPLACE");
const isReadyPlayer = (player: YouTubePlayer | null): player is YouTubePlayer => Boolean(player && typeof player.getCurrentTime === "function" && typeof player.getDuration === "function");

function MovingText({ children, className }: { children: string; className: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);
  useEffect(() => {
    const measure = () => setOverflow(Math.max(0, (contentRef.current?.scrollWidth ?? 0) - (containerRef.current?.clientWidth ?? 0)));
    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [children]);
  return <div ref={containerRef} className={`overflow-hidden whitespace-nowrap ${className}`}><span ref={contentRef} data-overflow={overflow > 0} className="marquee-track inline-block" style={{ "--marquee-shift": `${overflow}px` } as React.CSSProperties}>{children}</span></div>;
}

function PlayIcon({ playing }: { playing: boolean }) { return playing ? <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3v14H7zm7 0h3v14h-3z" /></svg> : <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.4v13.2c0 .7.8 1.1 1.4.7l10-6.6a.8.8 0 0 0 0-1.4l-10-6.6A.8.8 0 0 0 8 5.4Z" /></svg>; }
function SkipIcon({ next = false }: { next?: boolean }) { return <svg className={next ? "" : "-scale-x-100"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 5 9 7-9 7V5Zm10 0v14" /></svg>; }

const Clock = memo(function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => { const update = () => setTime(new Intl.DateTimeFormat("en-SA", { timeZone: "Asia/Riyadh", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date())); update(); const interval = window.setInterval(update, 1000); return () => window.clearInterval(interval); }, []);
  const [hour, minute] = time.split(":");
  return <span>{hour}<i className="clock-colon not-italic">:</i>{minute}</span>;
});

const TopRow = memo(function TopRow() { return <header className="fixed left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-10 flex items-center justify-between text-[11px] font-medium tracking-[.12em] text-white/75"><Clock /><span className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] -translate-x-1/2 whitespace-nowrap text-white/60"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_#e7a56d]" />1,284 listening now</span><nav className="flex gap-3 sm:gap-4"><a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube" className="transition hover:text-white">YT</a><a href="#recitations" className="transition hover:text-white">Info</a></nav></header> });

function SeekBar({ current, duration, seek }: { current: number; duration: number; seek: (amount: number) => void }) {
  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => { event.currentTarget.setPointerCapture(event.pointerId); const set = (x: number) => { const rect = event.currentTarget.getBoundingClientRect(); seek(Math.max(0, Math.min(1, (x - rect.left) / rect.width))); }; set(event.clientX); const move = (moveEvent: PointerEvent) => set(moveEvent.clientX); const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); };
  const progress = duration ? Math.min(100, (current / duration) * 100) : 0;
  return <div onPointerDown={pointerDown} className="group relative flex h-6 touch-none cursor-pointer items-center" role="slider" aria-label="Seek recitation" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={current}><div className="h-[3px] w-full rounded-full bg-white/15"><div className="relative h-full rounded-full bg-accent shadow-[0_0_9px_rgba(231,165,109,.8)]" style={{ width: `${progress}%` }}><span className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-white opacity-0 shadow group-hover:opacity-100" /></div></div></div>;
}

const YoutubeVisual = memo(function YoutubeVisual({ hostRef, configured }: { hostRef: React.RefObject<HTMLDivElement | null>; configured: boolean }) { return <div className="relative h-full w-full overflow-hidden rounded-xl bg-black/60"><div className="youtube-viewport absolute inset-0"><div ref={hostRef} className="h-full w-full" /></div>{!configured && <span className="absolute inset-0 grid place-items-center bg-black/45 px-3 text-center text-[8px] leading-tight text-white/60">Add an authorized<br />YouTube video ID</span>}</div> });

function Controls({ playing, previous, toggle, next, mobile = false }: { playing: boolean; previous(): void; toggle(): void; next(): void; mobile?: boolean }) { return <div className={`flex items-center ${mobile ? "gap-0.5" : "gap-1"}`}><button onClick={previous} className="grid h-11 w-11 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white" aria-label="Previous Surah"><SkipIcon /></button><button onClick={toggle} className={mobile ? "grid h-[52px] w-[52px] place-items-center rounded-full bg-white text-black shadow-[0_7px_20px_rgba(0,0,0,.28)] ring-1 ring-white/30" : "grid h-11 w-11 place-items-center rounded-full bg-white text-black shadow-lg transition hover:scale-105"} aria-label={playing ? "Pause recitation" : "Play recitation"}><span className="h-5 w-5"><PlayIcon playing={playing} /></span></button><button onClick={next} className="grid h-11 w-11 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white" aria-label="Next Surah"><SkipIcon next /></button></div> }

function DesktopPlayer({ track: item, playing, current, duration, seek, hostRef, previous, toggle, next }: PlayerViewProps) { return <section className={`hidden sm:flex fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+3rem)] left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] z-10 mx-auto max-w-xl items-center gap-4 rounded-full p-3 pr-5 ${glass}`}><div className="aspect-video w-28 shrink-0"><YoutubeVisual hostRef={hostRef} configured={isConfigured(item.videoId)} /></div><div className="min-w-0 flex-1"><MovingText className="text-[15px] font-semibold" >{item.surahName}</MovingText><MovingText className="text-[12.5px] text-white/70">{item.reciter}</MovingText><SeekBar current={current} duration={duration} seek={seek} /><div className="-mt-0.5 flex justify-between text-[10.5px] tabular-nums text-white/55"><span>{formatTime(current)}</span><span>{formatTime(duration)}</span></div></div><Controls playing={playing} previous={previous} toggle={toggle} next={next} /></section> }

function MobilePlayer({ track: item, playing, current, duration, seek, hostRef, previous, toggle, next }: PlayerViewProps) { return <section className={`sm:hidden fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+3rem)] left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] z-10 flex h-[96px] items-center gap-3 rounded-full p-2.5 pl-3 ${glass}`}><div className="aspect-video w-[92px] shrink-0"><YoutubeVisual hostRef={hostRef} configured={isConfigured(item.videoId)} /></div><div className="min-w-0 flex-1"><MovingText className="text-[14px] font-semibold">{item.surahName}</MovingText><MovingText className="text-[11px] text-white/70">{item.reciter}</MovingText><SeekBar current={current} duration={duration} seek={seek} /><div className="-mt-0.5 flex justify-between text-[9px] tabular-nums text-white/55"><span>{formatTime(current)}</span><span>{formatTime(duration)}</span></div></div><Controls mobile playing={playing} previous={previous} toggle={toggle} next={next} /></section> }

type PlayerViewProps = { track: Recitation; playing: boolean; current: number; duration: number; seek(amount: number): void; hostRef: React.RefObject<HTMLDivElement | null>; previous(): void; toggle(): void; next(): void };

export function RecitationStation() {
  const [playlistIndex, setPlaylistIndex] = useState(0); const [trackIndex, setTrackIndex] = useState(0); const [playing, setPlaying] = useState(false); const [current, setCurrent] = useState(0); const [duration, setDuration] = useState(0); const [desktop, setDesktop] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null); const playerRef = useRef<YouTubePlayer | null>(null); const intendedPlay = useRef(true); const item = playlists[playlistIndex].tracks[trackIndex]; const itemRef = useRef(item); itemRef.current = item;
  useEffect(() => { const query = window.matchMedia("(min-width: 640px)"); const update = () => setDesktop(query.matches); update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update); }, []);
  const advance = useCallback((direction: 1 | -1 = 1) => setTrackIndex(index => (index + direction + playlists[playlistIndex].tracks.length) % playlists[playlistIndex].tracks.length), [playlistIndex]);
  const previousRecitation = useCallback(() => { const player = playerRef.current; if (playlistIndex === 0 && trackIndex === 0 && isReadyPlayer(player)) player.previousVideo(); else advance(-1); }, [advance, playlistIndex, trackIndex]);
  const nextRecitation = useCallback(() => { const player = playerRef.current; if (playlistIndex === 0 && trackIndex === 0 && isReadyPlayer(player)) player.nextVideo(); else advance(1); }, [advance, playlistIndex, trackIndex]);
  const init = useCallback(() => { if (!hostRef.current || playerRef.current || !window.YT?.Player) return; playerRef.current = new window.YT.Player(hostRef.current, { videoId: isConfigured(itemRef.current.videoId) ? itemRef.current.videoId : undefined, playerVars: { autoplay: 1, controls: 0, listType: "playlist", list: AUTHORIZED_PLAYLIST_ID, rel: 0, playsinline: 1, modestbranding: 1 }, events: { onReady: (event: { target: YouTubePlayer }) => { playerRef.current = event.target; if (intendedPlay.current) event.target.playVideo(); else event.target.pauseVideo(); }, onStateChange: (event: { data: number }) => { const state = window.YT?.PlayerState; if (!state) return; setPlaying(event.data === state.PLAYING); if (event.data === state.ENDED && !(playlistIndex === 0 && trackIndex === 0)) advance(); }, onError: (event: { data: number }) => { const failed = itemRef.current; track("youtube_error", { code: event.data, videoId: failed.videoId, surahNumber: failed.surahNumber, surahName: failed.surahName }); nextRecitation(); } } }); }, [advance, nextRecitation, playlistIndex, trackIndex]);
  useEffect(() => { const scriptId = "youtube-iframe-api"; const ready = () => init(); if (window.YT?.Player) { init(); return; } window.onYouTubeIframeAPIReady = ready; if (!document.getElementById(scriptId)) { const script = document.createElement("script"); script.id = scriptId; script.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(script); } return () => { window.onYouTubeIframeAPIReady = undefined; }; }, [init]);
  useEffect(() => { if (playerRef.current && typeof playerRef.current.destroy === "function") { playerRef.current.destroy(); playerRef.current = null; } init(); }, [desktop, init]);
  useEffect(() => () => { if (playerRef.current && typeof playerRef.current.destroy === "function") playerRef.current.destroy(); playerRef.current = null; }, []);
  useEffect(() => { const timer = window.setInterval(() => { const player = playerRef.current; if (!isReadyPlayer(player)) return; setCurrent(player.getCurrentTime() || 0); setDuration(player.getDuration() || itemRef.current.duration); }, 300); return () => window.clearInterval(timer); }, []);
  useEffect(() => { setCurrent(0); setDuration(item.duration); const player = playerRef.current; if (!isConfigured(item.videoId) || !isReadyPlayer(player)) return; player.loadVideoById(item.videoId); if (!intendedPlay.current) player.pauseVideo(); }, [item]);
  const toggle = () => { intendedPlay.current = !playing; if (!isReadyPlayer(playerRef.current)) { init(); return; } if (playing) playerRef.current.pauseVideo(); else playerRef.current.playVideo(); };
  const seek = (amount: number) => { const player = playerRef.current; if (!duration || !isConfigured(item.videoId) || !isReadyPlayer(player)) return; player.seekTo(duration * amount, true); setCurrent(duration * amount); };
  const changePlaylist = (event: React.ChangeEvent<HTMLSelectElement>) => { setPlaylistIndex(Number(event.target.value)); setTrackIndex(0); };
  const props: PlayerViewProps = { track: item, playing, current, duration, seek, hostRef, previous: previousRecitation, toggle, next: nextRecitation };
  return <><TopRow />{desktop ? <DesktopPlayer {...props} /> : <MobilePlayer {...props} />}</>;
}
