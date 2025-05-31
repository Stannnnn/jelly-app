import { TrashIcon } from '@primer/octicons-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MediaItem } from '../api/jellyfin'
import { Loader } from '../components/Loader'
import { TrackList } from '../components/TrackList'
import { useAudioStorageContext } from '../context/AudioStorageContext/AudioStorageContext'
import { useJellyfinContext } from '../context/JellyfinContext/JellyfinContext'
import { usePageTitle } from '../context/PageTitleContext/PageTitleContext'
import { formatFileSize } from '../utils/formatFileSize'
import './Downloads.css'

interface StorageStats {
    totalSize: number
    trackCount: number
    quota?: number
    usage?: number
}

export const Downloads = () => {
    const api = useJellyfinContext()
    const audioStorage = useAudioStorageContext()
    const { setPageTitle } = usePageTitle()

    const [downloadedTracks, setDownloadedTracks] = useState<MediaItem[]>([])
    const [storageStats, setStorageStats] = useState<StorageStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [clearing, setClearing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setPageTitle('Downloads')
    }, [setPageTitle])

    const loadDownloads = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            // Get storage statistics
            const stats = await audioStorage.getStorageStats()
            setStorageStats(stats)

            // Get all downloaded tracks
            const allTracks = await audioStorage.getAllTracks()
            const songIds = allTracks
                .filter(track => track.data.type === 'song' || track.data.type === 'm3u8')
                .map(track => track.id)

            if (songIds.length === 0) {
                setDownloadedTracks([])
                return
            }

            // Fetch track metadata from Jellyfin
            const trackPromises = songIds.map(async id => {
                try {
                    return await api.fetchMediaItem(id)
                } catch (error) {
                    console.warn(`Failed to fetch metadata for track ${id}:`, error)
                    return null
                }
            })

            const tracks = (await Promise.all(trackPromises))
                .filter((track): track is MediaItem => track !== null)
                .map(track => ({ ...track, offlineState: 'downloaded' as const }))

            setDownloadedTracks(tracks)
        } catch (error) {
            console.error('Failed to load downloads:', error)
            setError('Failed to load downloads. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [api, audioStorage])

    const handleClearAll = useCallback(async () => {
        if (!confirm('Are you sure you want to clear all downloads? This cannot be undone.')) {
            return
        }

        try {
            setClearing(true)
            await audioStorage.clearAllDownloads()
            setDownloadedTracks([])
            setStorageStats({
                totalSize: 0,
                trackCount: 0,
                quota: storageStats?.quota,
                usage: storageStats?.usage,
            })
        } catch (error) {
            console.error('Failed to clear downloads:', error)
            setError('Failed to clear downloads. Please try again.')
        } finally {
            setClearing(false)
        }
    }, [audioStorage, storageStats?.quota, storageStats?.usage])

    useEffect(() => {
        loadDownloads()
    }, [loadDownloads])

    if (loading) {
        return <Loader />
    }

    const usagePercentage = storageStats?.quota
        ? Math.round(((storageStats.usage || 0) / storageStats.quota) * 100)
        : null

    const downloadsPercentage = storageStats?.quota
        ? Math.round((storageStats.totalSize / storageStats.quota) * 100)
        : null

    return (
        <div className="downloads-page">
            <div className="storage-overview">
                <div className="storage-stats">
                    <div className="stat-item">
                        <div className="stat-value">{storageStats?.trackCount || 0}</div>
                        <div className="stat-label">Downloaded Tracks</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{formatFileSize(storageStats?.totalSize || 0)}</div>
                        <div className="stat-label">Storage Used</div>
                    </div>
                    {storageStats?.quota && (
                        <div className="stat-item">
                            <div className="stat-value">{formatFileSize(storageStats.quota)}</div>
                            <div className="stat-label">Total Available</div>
                        </div>
                    )}
                </div>

                {storageStats?.quota && (
                    <div className="storage-bar">
                        <div className="storage-bar-container">
                            <div
                                className="storage-bar-used"
                                style={{ width: `${Math.min(usagePercentage || 0, 100)}%` }}
                            />
                            <div
                                className="storage-bar-downloads"
                                style={{
                                    width: `${Math.min(downloadsPercentage || 0, 100)}%`,
                                    left: `${Math.max(0, (usagePercentage || 0) - (downloadsPercentage || 0))}%`,
                                }}
                            />
                        </div>
                        <div className="storage-legend">
                            <div className="legend-item">
                                <div className="legend-color used" />
                                <span>Total Storage Used ({usagePercentage}%)</span>
                            </div>
                            <div className="legend-item">
                                <div className="legend-color downloads" />
                                <span>Downloads ({downloadsPercentage}%)</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="downloads-content">
                <div className="downloads-header">
                    <div className="header-info">
                        <h2>Downloaded Music</h2>
                        <p>Manage your offline music collection</p>
                    </div>
                    {downloadedTracks.length > 0 && (
                        <button className="clear-all-button" onClick={handleClearAll} disabled={clearing}>
                            <TrashIcon size={14} />
                            {clearing ? 'Clearing...' : 'Clear All'}
                        </button>
                    )}
                </div>

                {error && <div className="error-message">{error}</div>}

                {downloadedTracks.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📱</div>
                        <h3>No Downloads Yet</h3>
                        <p>
                            Download music to enjoy it offline. Look for the download button on tracks, albums, and
                            playlists.
                        </p>
                        <Link to="/" className="browse-link">
                            Browse Music
                        </Link>
                    </div>
                ) : (
                    <div className="tracks-container">
                        <TrackList tracks={downloadedTracks} title="Downloads" />
                    </div>
                )}
            </div>
        </div>
    )
}
