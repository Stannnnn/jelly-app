import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader } from '../components/Loader'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import './Lyrics.css'
import { LyricLine } from '@jellyfin/sdk/lib/generated-client'

type LyricLineCue = { Position: number; EndPosition: number; Start: number; End: number }
type LyricLineData = LyricLine & { Cues?: LyricLineCue[] }

type CueRangeMs = { s: number; e: number }

export const Lyrics = () => {
    const playback = usePlaybackContext()
    const audio = playback.audioRef as HTMLAudioElement | undefined

    const [currentTimeMs, setCurrentTimeMs] = useState<number | null>(null)
    const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1)

    const lineRefs = useRef<Array<HTMLDivElement | null>>([])
    const rafId = useRef<number | null>(null)

    const prevWordElsRef = useRef<HTMLElement[]>([])
    const activeWordElsRef = useRef<HTMLElement[]>([])
    const activeWordCuesRef = useRef<CueRangeMs[]>([])
    const lastActiveLineRef = useRef<number>(-1)

    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

    const location = useLocation()

    const tickToTimeString = (raw: number) => {
        const ms = raw / 10000

        const totalCs = Math.round(ms / 10)

        const cs = totalCs % 100
        const totalSeconds = Math.floor(totalCs / 100)
        const seconds = totalSeconds % 60
        const totalMinutes = Math.floor(totalSeconds / 60)
        const minutes = totalMinutes % 60
        const hours = Math.floor(totalMinutes / 60)

        const hh = hours.toString().padStart(2, '0')
        const mm = minutes.toString().padStart(2, '0')
        const ss = seconds.toString().padStart(2, '0')
        const cc = cs.toString().padStart(2, '0')

        return (hours > 0 ? `${hh}:` : '') + `${mm}:${ss}.${cc}`
    }

    const lyrics = playback.currentTrackLyrics?.Lyrics as unknown as LyricLineData[] | undefined

    const isSynced = useMemo(() => !!(lyrics && lyrics[0].Start != null), [lyrics])
    const isWordByWord = useMemo(() => !!(lyrics && lyrics[0].Cues && lyrics[0].Cues.length > 0), [lyrics])

    // Use audio clock while playing, fallback to state when paused/not ready.
    const getNowMs = useCallback(() => {
        if (playback.isPlaying && audio) return audio.currentTime * 1000
        return currentTimeMs ?? 0
    }, [audio, playback.isPlaying, currentTimeMs])

    const resetAllWordProgress = useCallback(() => {
        document.querySelectorAll<HTMLElement>('.lyric-word').forEach(el => {
            el.style.removeProperty('--p')
        })
    }, [])

    // Keep currentTimeMs updated for paused UI and initial render.
    useEffect(() => {
        if (!audio) return

        const updateCurrentTime = () => {
            if (!audio.duration) {
                setCurrentTimeMs(null)
                return
            }
            setCurrentTimeMs(audio.currentTime * 1000 || 0)
        }

        const onSeek = () => {
            resetAllWordProgress()
            updateCurrentTime()
        }

        audio.addEventListener('timeupdate', updateCurrentTime)
        audio.addEventListener('playing', updateCurrentTime)
        audio.addEventListener('seeking', onSeek)
        audio.addEventListener('seeked', onSeek)

        return () => {
            audio.removeEventListener('timeupdate', updateCurrentTime)
            audio.removeEventListener('playing', updateCurrentTime)
            audio.removeEventListener('seeking', onSeek)
            audio.removeEventListener('seeked', onSeek)
        }
    }, [audio, resetAllWordProgress])

    // Compute current line index from "now" without timeouts.
    // While playing, rAF will keep this in sync
    useEffect(() => {
        if (!audio || !lyrics) {
            setCurrentLineIndex(-1)
            return
        }

        const findLineIndex = (tMs: number) => {
            let lo = 0
            let hi = lyrics.length - 1
            let ans = -1

            while (lo <= hi) {
                const mid = (lo + hi) >> 1
                const s = (lyrics[mid].Start ?? 0) / 10000
                if (s <= tMs) {
                    ans = mid
                    lo = mid + 1
                } else {
                    hi = mid - 1
                }
            }
            return ans
        }

        const tMs = getNowMs()
        setCurrentLineIndex(findLineIndex(tMs))
    }, [audio, lyrics, getNowMs])

    const scrollToActiveLine = useCallback(
        (line: number, behavior: ScrollBehavior = 'smooth') => {
            if (!lyrics || line < 0) return

            const activeEl = lineRefs.current[line]
            if (!activeEl) return

            const rect = activeEl.getBoundingClientRect()
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop

            const headerHeight = document.querySelector<HTMLDivElement>('.main_header')?.offsetHeight || 0
            const footerHeight = document.querySelector<HTMLDivElement>('.main_footer')?.offsetHeight || 0
            const usableHeight = window.innerHeight - headerHeight - footerHeight

            const targetY = scrollTop + rect.top - (usableHeight / 2 - rect.height / 2) - headerHeight

            window.scrollTo({ top: targetY, behavior })
        },
        [lineRefs, lyrics]
    )

    const goToLine = useCallback(
        (index: number) => {
            const audio = playback.audioRef as HTMLAudioElement | undefined
            if (audio && lyrics && lyrics[index]?.Start) {
                setCurrentTimeMs(lyrics[index].Start / 10000)
                audio.currentTime = lyrics[index].Start / 10000000
                resetAllWordProgress()
                if (isSynced) scrollToActiveLine(index)
            }
        },
        [lyrics, playback.audioRef, isSynced, scrollToActiveLine, resetAllWordProgress]
    )

    const displayedLyricsLine = useCallback(
        (line: LyricLineData) => {
            if (!isWordByWord) return line.Text

            const cues = line.Cues ?? []
            if (cues.length === 0) return line.Text

            const tMs = getNowMs()

            return cues.map((cue, i) => {
                const chunk = line.Text?.slice(cue.Position, cue.EndPosition) ?? ''
                const startMs = cue.Start / 10000
                const endMs = cue.End / 10000

                const isPast = endMs <= tMs
                const isCurrent = startMs <= tMs && tMs < endMs

                return (
                    <span
                        key={`cue-${line.Start}-${i}`}
                        className={'lyric-word' + (isPast ? ' active' : '') + (isCurrent ? ' current' : '')}
                        data-start={startMs}
                        data-end={endMs}
                        data-text={chunk}
                    >
                        {i < cues.length - 1 && chunk.startsWith(' ') ? '\u00A0' : ''}
                        {chunk}
                        {i < cues.length - 1 && chunk.endsWith(' ') ? '\u00A0' : ''}
                    </span>
                )
            })
        },
        [isWordByWord, getNowMs]
    )

    const displayedLines = useMemo(() => {
        if (!lyrics) lineRefs.current = []

        return (
            lyrics?.map((line, index) => (
                <div
                    key={`lyrics-${playback.currentTrack?.Id}-${index}`}
                    className={'lyrics-line' + (currentLineIndex === index ? ' active' : '')}
                    ref={el => {
                        lineRefs.current[index] = el
                    }}
                    onClick={() => goToLine(index)}
                >
                    {isSynced && playback.lyricsTimestamps ? (
                        <div className="numbers">{line.Start != null ? tickToTimeString(line.Start) : null}</div>
                    ) : null}
                    <div className={'text' + (playback.centeredLyrics ? ' centered' : '')}>
                        {displayedLyricsLine(line)}
                    </div>
                </div>
            )) || null
        )
    }, [
        lyrics,
        playback.currentTrack,
        goToLine,
        isSynced,
        playback.lyricsTimestamps,
        playback.centeredLyrics,
        displayedLyricsLine,
        currentLineIndex,
    ])

    // Cache current line word elements (only when line changes)
    useEffect(() => {
        if (!lyrics || !isWordByWord) return
        if (currentLineIndex === lastActiveLineRef.current) return

        lastActiveLineRef.current = currentLineIndex

        for (const el of prevWordElsRef.current) el.style.removeProperty('--p')

        const lineEl = lineRefs.current[currentLineIndex]
        if (!lineEl) {
            activeWordElsRef.current = []
            activeWordCuesRef.current = []
            return
        }

        const wordEls = Array.from(lineEl.querySelectorAll<HTMLElement>('.lyric-word'))
        activeWordElsRef.current = wordEls
        prevWordElsRef.current = wordEls

        const ranges: CueRangeMs[] = wordEls.map(el => ({
            s: Number(el.dataset.start ?? 'NaN'),
            e: Number(el.dataset.end ?? 'NaN'),
        }))
        activeWordCuesRef.current = ranges

        for (const el of wordEls) el.style.setProperty('--p', '0')
    }, [currentLineIndex, lyrics, isWordByWord])

    // rAF drives fill + line index updates while playing
    useEffect(() => {
        if (!audio || !lyrics) return

        const stop = () => {
            if (rafId.current != null) cancelAnimationFrame(rafId.current)
            rafId.current = null
        }

        const findLineIndex = (tMs: number) => {
            let lo = 0
            let hi = lyrics.length - 1
            let ans = -1
            while (lo <= hi) {
                const mid = (lo + hi) >> 1
                const s = (lyrics[mid].Start ?? 0) / 10000
                if (s <= tMs) {
                    ans = mid
                    lo = mid + 1
                } else hi = mid - 1
            }
            return ans
        }

        const frame = () => {
            if (!playback.isPlaying) {
                stop()
                return
            }

            const tMs = audio.currentTime * 1000

            // Update current line index only when it changes
            const li = findLineIndex(tMs)
            if (li !== currentLineIndex) setCurrentLineIndex(li)

            if (isWordByWord) {
                const els = activeWordElsRef.current
                const cues = activeWordCuesRef.current
                if (els.length === cues.length && els.length > 0) {
                    for (let i = 0; i < els.length; i++) {
                        const s = cues[i].s
                        const e = cues[i].e

                        let p = 0
                        if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
                            p = clamp01((tMs - s) / (e - s))
                        } else if (Number.isFinite(s)) {
                            p = tMs >= s ? 1 : 0
                        }

                        els[i].style.setProperty('--p', p.toFixed(4))
                    }
                }
            }

            rafId.current = requestAnimationFrame(frame)
        }

        if (playback.isPlaying) rafId.current = requestAnimationFrame(frame)
        return stop
    }, [audio, lyrics, playback.isPlaying, isWordByWord, currentLineIndex])

    // Scroll on line change
    useEffect(() => {
        if (isSynced) scrollToActiveLine(currentLineIndex)
    }, [playback.currentTrack, lyrics, currentLineIndex, scrollToActiveLine, isSynced])

    // Scroll to top when audio source changes (new track)
    useEffect(() => {
        if (audio?.src) window.scrollTo({ top: 0, behavior: 'auto' })
    }, [audio?.src, location.pathname])

    return (
        <div className={'lyrics-page' + (lyrics ? ' active' : '') + (isSynced ? ' synced noSelect' : '')}>
            {(lyrics && displayedLines) || (
                <div className="empty">
                    {playback.currentTrackLyricsLoading ? <Loader /> : 'No lyrics found for this track'}
                </div>
            )}
        </div>
    )
}
