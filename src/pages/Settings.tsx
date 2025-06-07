import { CheckCircleFillIcon } from '@primer/octicons-react'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAudioStorageContext } from '../context/AudioStorageContext/AudioStorageContext'
import { useDownloadContext } from '../context/DownloadContext/DownloadContext'
import { useJellyfinContext } from '../context/JellyfinContext/JellyfinContext'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { useThemeContext } from '../context/ThemeContext/ThemeContext'
import { formatFileSize } from '../utils/formatFileSize'
import './Settings.css'

export const Settings = ({ onLogout }: { onLogout: () => void }) => {
    const navigate = useNavigate()
    const api = useJellyfinContext()
    const audioStorage = useAudioStorageContext()

    const { theme, toggleTheme } = useThemeContext()

    const [lastLogin, setLastLogin] = useState<string | null>(null)
    const [clientIp, setClientIp] = useState<string | null>(null)
    const [latency, setLatency] = useState<number | null>(null)
    const { sessionPlayCount, resetSessionCount, bitrate, setBitrate } = usePlaybackContext()
    const playback = usePlaybackContext()
    const queryClient = useQueryClient()
    const { storageStats, refreshStorageStats, queueCount, clearQueue } = useDownloadContext()

    const [clearing, setClearing] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [user, clientIp, latencyMs] = await Promise.all([
                    api.fetchUserInfo(),
                    api.fetchClientIp(),
                    api.measureLatency(),
                ])

                if (user.LastLoginDate) {
                    const date = new Date(user.LastLoginDate)
                    const formatted = date
                        .toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            year: 'numeric',
                            hour12: true,
                        })
                        .replace(/,/, '')
                    setLastLogin(formatted)
                } else {
                    setLastLogin(null)
                }

                setClientIp(clientIp)
                setLatency(latencyMs)
            } catch (error) {
                console.error('Error fetching data:', error)
            }
        }

        fetchData()
    }, [api])

    const handleLogout = () => {
        playback.audioRef.current.pause()
        playback.crossfadeRef.current.pause()
        resetSessionCount()
        onLogout()
        navigate('/login')
    }

    const handleClearAll = useCallback(async () => {
        if (!confirm('Are you sure you want to clear all downloads? This cannot be undone.')) {
            return
        }

        try {
            setClearing(true)
            await audioStorage.clearAllDownloads()
            queryClient.clear()
            clearQueue()
            await refreshStorageStats()
        } catch (error) {
            console.error('Failed to clear downloads:', error)
        } finally {
            setClearing(false)
        }
    }, [audioStorage, clearQueue, queryClient, refreshStorageStats])

    return (
        <div className="settings-page">
            <div className="section appearance">
                <div className="title">Appearance</div>
                <div className="options noSelect">
                    <div
                        className={`option light ${theme === 'light' ? 'active' : ''}`}
                        onClick={() => toggleTheme('light')}
                    >
                        <div className="visual" />
                        <div className="desc">Light</div>
                    </div>
                    <div
                        className={`option dark ${theme === 'dark' ? 'active' : ''}`}
                        onClick={() => toggleTheme('dark')}
                    >
                        <div className="visual" />
                        <div className="desc">Dark</div>
                    </div>
                    <div
                        className={`option system ${theme === 'system' ? 'active' : ''}`}
                        onClick={() => toggleTheme('system')}
                    >
                        <div className="visual" />
                        <div className="desc">System</div>
                    </div>
                </div>
            </div>
            <div className="section playback">
                <div className="title">Playback</div>
                <div className="inner">
                    <div className="container">
                        <div className="info">
                            <div className="subtitle">Streaming & Offline Sync</div>
                            <div className="subdesc">
                                Adjusting audio quality enables server-side transcoding, converting to a compatible
                                format with a lower bitrate for smoother streaming or efficient offline syncing with
                                reduced bandwidth and storage
                            </div>
                        </div>
                        <div className="options noSelect">
                            <div
                                className={'option source' + (!bitrate ? ' active' : '')}
                                onClick={() => setBitrate(0)}
                            >
                                <div className="status">
                                    <CheckCircleFillIcon size={16} />
                                </div>
                                <div className="details">
                                    <div className="title">Source</div>
                                    <div className="desc">
                                        Direct playback of the original audio source without modifications
                                    </div>
                                </div>
                            </div>
                            <div
                                className={'option high' + (bitrate === 320000 ? ' active' : '')}
                                onClick={() => setBitrate(320000)}
                            >
                                <div className="status">
                                    <CheckCircleFillIcon size={16} />
                                </div>
                                <div className="details">
                                    <div className="title">
                                        High <span className="bitrate">320 kbps</span>
                                    </div>
                                    <div className="desc">
                                        Superior sound quality, perfect for immersive listening with moderate data usage
                                    </div>
                                </div>
                            </div>
                            <div
                                className={'option medium' + (bitrate === 256000 ? ' active' : '')}
                                onClick={() => setBitrate(256000)}
                            >
                                <div className="status">
                                    <CheckCircleFillIcon size={16} />
                                </div>
                                <div className="details">
                                    <div className="title">
                                        Medium <span className="bitrate">256 kbps</span>
                                    </div>
                                    <div className="desc">
                                        Crisp audio with a balanced blend of quality and data efficiency
                                    </div>
                                </div>
                            </div>
                            <div
                                className={'option low' + (bitrate === 192000 ? ' active' : '')}
                                onClick={() => setBitrate(192000)}
                            >
                                <div className="status">
                                    <CheckCircleFillIcon size={16} />
                                </div>
                                <div className="details">
                                    <div className="title">
                                        Low <span className="bitrate">192 kbps</span>
                                    </div>
                                    <div className="desc">
                                        Solid quality tailored for streaming with reduced bandwidth
                                    </div>
                                </div>
                            </div>
                            <div
                                className={'option minimal' + (bitrate === 128000 ? ' active' : '')}
                                onClick={() => setBitrate(128000)}
                            >
                                <div className="status">
                                    <CheckCircleFillIcon size={16} />
                                </div>
                                <div className="details">
                                    <div className="title">
                                        Minimal <span className="bitrate">128 kbps</span>
                                    </div>
                                    <div className="desc">
                                        Essential audio quality optimized for the lowest data consumption
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/*
                <div className="inner">
                    <div className="container">
                        <div className="info">
                            <div className="subtitle">Download Quality</div>
                            <div className="subdesc">
                                Adjusting download quality converts audio to a compatible format with a lower bitrate,
                                balancing sound fidelity and storage space, used in offline mode
                            </div>
                        </div>
                        <div className="options noSelect">
                            <div className="option source active">
                                <div className="status">
                                    <CheckCircleFillIcon size={16} />
                                </div>
                                <div className="details">
                                    <div className="title">Source</div>
                                    <div className="desc">Downloads the original audio file without modifications</div>
                                </div>
                            </div>
                            <div className="option high">
                                <div className="status">
                                    <CheckCircleFillIcon size={16} />
                                </div>
                                <div className="details">
                                    <div className="title">
                                        High <span className="bitrate">320 kbps</span>
                                    </div>
                                    <div className="desc">
                                        Superior sound quality, ideal for immersive listening with moderate storage
                                        needs
                                    </div>
                                </div>
                            </div>
                            <div className="option medium">
                                <div className="status">
                                    <CheckCircleFillIcon size={16} />
                                </div>
                                <div className="details">
                                    <div className="title">
                                        Medium <span className="bitrate">256 kbps</span>
                                    </div>
                                    <div className="desc">
                                        Crisp audio with a balance of quality and storage efficiency
                                    </div>
                                </div>
                            </div>
                            <div className="option low">
                                <div className="status">
                                    <CheckCircleFillIcon size={16} />
                                </div>
                                <div className="details">
                                    <div className="title">
                                        Low <span className="bitrate">192 kbps</span>
                                    </div>
                                    <div className="desc">Solid quality optimized for reduced storage use</div>
                                </div>
                            </div>
                            <div className="option minimal">
                                <div className="status">
                                    <CheckCircleFillIcon size={16} />
                                </div>
                                <div className="details">
                                    <div className="title">
                                        Minimal <span className="bitrate">128 kbps</span>
                                    </div>
                                    <div className="desc">Essential audio quality for minimal storage consumption</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="inner row">
                    <div className="container">
                        <div className="info">
                            <div className="subtitle">Offline Mode</div>
                            <div className="subdesc">
                                When you go offline, only the media you have downloaded will be available
                            </div>
                        </div>
                        <label className="switch">
                            <input type="checkbox"></input>
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
                <div className="inner row">
                    <div className="container">
                        <div className="info">
                            <div className="subtitle">Volume Normalization</div>
                            <div className="subdesc">
                                Plays tracks or albums at a consistent volume, requires audio files or library settings
                                to be properly configured on the server-side in order for loudness normalization to work
                            </div>
                        </div>

                        <div className="filter">
                            <select defaultValue="Off">
                                <option value="Off">Off</option>
                                <option value="Tracks">Tracks</option>
                                <option value="Albums">Albums</option>
                            </select>
                            <div className="icon">
                                <ChevronDownIcon size={12} />
                            </div>
                        </div>
                    </div>
                </div>
                */}
            </div>
            <div className="section offline-sync">
                <div className="container">
                    <div className="title">Offline Sync</div>
                    <div className="desc">
                        Synced Music - <span className="number">{storageStats.trackCount}</span> Track
                        {storageStats.trackCount === 1 ? '' : 's'}
                        {queueCount > 0 ? (
                            <>
                                {' '}
                                (<span className="number">{queueCount}</span> track{queueCount === 1 ? '' : 's'} in
                                queue)
                            </>
                        ) : (
                            ''
                        )}{' '}
                        /{' '}
                        <span className="number">
                            {formatFileSize(storageStats.trackCount === 0 ? 0 : storageStats?.indexedDB || 0)}
                        </span>{' '}
                        Used
                    </div>
                </div>
                <div className="options noSelect">
                    <div className="option">
                        {(storageStats.trackCount > 0 || queueCount > 0 || !audioStorage.isInitialized()) && (
                            <button className="btn clear" onClick={handleClearAll} disabled={clearing}>
                                {clearing ? 'Clearing...' : 'Clear All'}
                            </button>
                        )}
                    </div>
                </div>
                <div className="desc">
                    <p>
                        Cache your music library for seamless offline playback, with new tracks auto-syncing to saved
                        playlists, albums, or artists. Browse your{' '}
                        <Link to="/synced" className="textlink">
                            synced music library
                        </Link>{' '}
                        with ease
                    </p>
                </div>
            </div>
            <div className="section playback">
                <div className="title">Lyrics</div>
                <div className="inner row">
                    <div className="container">
                        <div className="info">
                            <div className="subtitle">Timestamps</div>
                            <div className="subdesc">Display Timestamps for synchronized lyrics</div>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={playback.lyricsTimestamps}
                                onChange={e => playback.setLyricsTimestamps(e.target.checked)}
                            ></input>
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
                <div className="inner row">
                    <div className="container">
                        <div className="info">
                            <div className="subtitle">Center Lyrics</div>
                            <div className="subdesc">
                                Aligns lyrics to the center of the line instead of the device default
                            </div>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={playback.centeredLyrics}
                                onChange={e => playback.setCenteredLyrics(e.target.checked)}
                            ></input>
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
            <div className="section about">
                <div className="title">About</div>
                <div className="desc">
                    <p className="subtitle">Jelly Music App - Version {__VERSION__}</p>
                    <p>An open source music player for Jellyfin</p>
                    <p>
                        Carefully crafted with great attention to detail, aiming to reduce noise and distractions with a
                        minimalistic & lightweight interface:
                        <span className="mantra"> "the quieter you become, the more you are able to hear"</span>
                    </p>
                    <p className="subfooter">
                        <span>Source code is freely available on </span>
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            className="textlink"
                            href="https://github.com/Stannnnn/jelly-app"
                        >
                            GitHub
                        </a>
                        <span> and is licensed under the MIT license</span>
                    </p>
                </div>
            </div>
            <div className="section session">
                <div className="title">Session</div>
                <div className="desc">
                    <p>
                        Currently connected to{' '}
                        <a target="_blank" rel="noopener noreferrer" className="textlink" href={api.auth.serverUrl}>
                            {api.auth.serverUrl}
                        </a>{' '}
                        {latency !== null && (
                            <span>
                                <span>with {latency}ms latency</span>
                            </span>
                        )}
                    </p>
                    <p>
                        Last login: {lastLogin} {clientIp ? ` from ${clientIp}` : ''}
                    </p>
                    <p>
                        Played{' '}
                        {sessionPlayCount !== null && (
                            <span>
                                {sessionPlayCount} {sessionPlayCount === 1 ? 'track' : 'tracks'}
                            </span>
                        )}{' '}
                        since login
                    </p>
                </div>
                <div className="actions noSelect">
                    <button onClick={handleLogout} className="btn logout">
                        Logout
                    </button>
                </div>
            </div>
        </div>
    )
}
