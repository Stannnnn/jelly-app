import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader } from '../components/Loader'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import './Lyrics.css'

export const Lyrics = () => {
    const playback = usePlaybackContext()
    const audio = playback.audioRef as HTMLAudioElement | undefined

    const [currentTime, setCurrentTime] = useState<number | null>(null)
    const lineRefs = useRef<Array<HTMLDivElement | null>>([])

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

    const timeDiff = (startTicks: number | null, timeSecs: number | null) => {
        return (startTicks || 0) / 10000 - (timeSecs || 0) * 1000
    }

    const lyrics = playback.currentTrackLyrics?.Lyrics

    const isSynced = useMemo(() => {
        if (!lyrics || lyrics[0].Start === null || lyrics[0].Start === undefined) return false
        return true
    }, [lyrics])

    const currentLineIndex = useMemo(() => {
        if (!audio || !lyrics) return -1

        const index = lyrics.findIndex(line => timeDiff(line?.Start || 0, currentTime) > 0)

        return lyrics ? (index >= 0 ? index - 1 : lyrics.length - 1) : -1
    }, [audio, lyrics, currentTime])

    const nextLineStart = useMemo(() => {
        if (!audio || !lyrics) return -1

        if (lyrics && lyrics[currentLineIndex + 1]) return lyrics[currentLineIndex + 1]?.Start || 0
        return 0
    }, [audio, lyrics, currentLineIndex])

    // Uses timeout for precise lyrics timing
    //  - Necessary because audio time updates happen every 200ms or so; too slow
    const nextLineTimeout: RefObject<NodeJS.Timeout | null> = useRef(null)
    const clearNextLineTimeout = () => {
        if (nextLineTimeout.current) {
            clearTimeout(nextLineTimeout.current)
            nextLineTimeout.current = null
        }
    }

    useEffect(() => {
        const millis = timeDiff(nextLineStart, currentTime)

        if (millis > 0) {
            // Sets timeout to diff from next line and last currentTime update
            nextLineTimeout.current = setTimeout(() => {
                if (currentTime && playback.isPlaying) setCurrentTime(currentTime + millis / 1000)
                clearNextLineTimeout()
            }, millis)
        }

        return clearNextLineTimeout
    }, [playback.isPlaying, currentTime, currentLineIndex, nextLineStart])

    useEffect(() => {
        clearNextLineTimeout()
    }, [audio, lyrics])

    useEffect(() => {
        if (!audio || !lyrics) return

        const updateCurrentTime = () => {
            if (!audio.duration) {
                setCurrentTime(null)
                return
            }

            setCurrentTime(audio?.currentTime || 0)
        }

        audio.addEventListener('timeupdate', updateCurrentTime)
        audio.addEventListener('playing', updateCurrentTime)

        return () => {
            audio.removeEventListener('timeupdate', updateCurrentTime)
            audio.removeEventListener('playing', updateCurrentTime)
        }
    }, [audio, lyrics, currentLineIndex])

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
                setCurrentTime(lyrics[index].Start / 10000000)
                audio.currentTime = lyrics[index].Start / 10000000
                if (isSynced) scrollToActiveLine(index)
            }
        },
        [isSynced, lyrics, playback.audioRef, scrollToActiveLine]
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
                        <div className="numbers">
                            {line.Start !== null && line.Start !== undefined && tickToTimeString(line.Start)}
                        </div>
                    ) : null}
                    <div className={'text' + (playback.centeredLyrics ? ' centered' : '')}>{line.Text}</div>
                </div>
            )) || null
        )
    }, [
        playback.currentTrack,
        goToLine,
        playback.lyricsTimestamps,
        playback.centeredLyrics,
        lyrics,
        currentLineIndex,
        isSynced,
    ])

    // Scroll on line change
    useEffect(() => {
        if (isSynced) scrollToActiveLine(currentLineIndex)
    }, [playback.currentTrack, lyrics, currentLineIndex, scrollToActiveLine, isSynced])

    // Scroll to top when audio source changes (new track)
    useEffect(() => {
        if (audio?.src) {
            window.scrollTo({ top: 0, behavior: 'auto' })
        }
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
