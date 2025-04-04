import '@fontsource-variable/inter'
import { ArrowLeftIcon, BookmarkFillIcon, HeartFillIcon } from '@primer/octicons-react'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createContext, CSSProperties, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, BrowserRouter as Router, Routes, useLocation, useNavigate } from 'react-router-dom'
import { MediaItem } from './api/jellyfin'
import './App.css'
import './components/MediaList.css'
import Sidenav from './components/Sidenav'
import { JellyfinContextProvider } from './context/JellyfinContext'
import { PageTitleProvider, usePageTitle } from './context/PageTitleContext'
import { PlaybackContextProvider, usePlaybackContext } from './context/PlaybackContext'
import { ScrollContextProvider } from './context/ScrollContext'
import { ThemeContextProvider } from './context/ThemeContext'
import { useSidenav } from './hooks/useSidenav'
import Album from './pages/Album'
import Albums from './pages/Albums'
import Artist from './pages/Artist'
import Favorites from './pages/Favorites'
import FrequentlyPlayed from './pages/FrequentlyPlayed'
import Genre from './pages/Genre'
import Home from './pages/Home'
import Login from './pages/Login'
import Playlist from './pages/Playlist'
import RecentlyPlayed from './pages/RecentlyPlayed'
import SearchResults from './pages/SearchResults'
import Settings from './pages/Settings'
import Tracks from './pages/Tracks'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
        },
    },
})

const persister = createSyncStoragePersister({
    storage: window.localStorage,
})

interface HistoryContextType {
    historyStack: string[]
    goBack: () => void
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined)

const HistoryProvider = ({ children }: { children: ReactNode }) => {
    const [historyStack, setHistoryStack] = useState<string[]>([])
    const navigate = useNavigate()
    const location = useLocation()
    const prevLocationRef = useRef<string | null>(null)

    useEffect(() => {
        const validRoutes = [
            '/',
            '/tracks',
            '/albums',
            '/favorites',
            '/settings',
            '/album',
            '/recently',
            '/frequently',
            '/artist',
            '/genre',
            '/playlist',
            '/search',
        ]

        const currentPath = location.pathname

        if (
            validRoutes.some(route => currentPath === route || currentPath.startsWith(route + '/')) &&
            currentPath !== prevLocationRef.current
        ) {
            setHistoryStack(prev => {
                if (prev[prev.length - 1] === currentPath) {
                    return prev
                }
                return [...prev, currentPath]
            })
            prevLocationRef.current = currentPath
        }
    }, [location.pathname])

    const goBack = () => {
        if (historyStack.length > 1) {
            setHistoryStack(prev => {
                const newStack = prev.slice(0, -1)
                const previousRoute = newStack[newStack.length - 1]
                navigate(previousRoute)
                return newStack
            })
        } else {
            navigate('/')
        }
    }

    return <HistoryContext.Provider value={{ historyStack, goBack }}>{children}</HistoryContext.Provider>
}

const useAppBack = () => {
    const { goBack } = useContext(HistoryContext)!
    return goBack
}

const App = () => {
    const [auth, setAuth] = useState<AuthData | null>(() => {
        const savedAuth = localStorage.getItem('auth')
        return savedAuth ? JSON.parse(savedAuth) : null
    })
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const handleLogin = (authData: AuthData) => {
        setAuth(authData)
        localStorage.setItem('auth', JSON.stringify(authData))
    }

    const handleLogout = () => {
        setIsLoggingOut(true)
        localStorage.removeItem('repeatMode')
        setAuth(null)
        localStorage.removeItem('auth')
        setIsLoggingOut(false)
    }

    useEffect(() => {
        if (!auth) {
            localStorage.removeItem('auth')
        }
    }, [auth])

    useEffect(() => {
        const isWindows = /Win/.test(navigator.userAgent)
        const isChromium = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
        const isEdge = /Edg/.test(navigator.userAgent) && /Microsoft Corporation/.test(navigator.vendor)
        if (isWindows && (isChromium || isEdge)) {
            document.getElementsByTagName('html')[0].classList.add('winOS')
        } else {
            document.getElementsByTagName('html')[0].classList.add('otherOS')
        }
    }, [])

    const actualApp = (
        <div className="music-app">
            <Routes>
                <Route path="/login" element={auth ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
                <Route
                    path="/*"
                    element={
                        auth ? (
                            <JellyfinContextProvider auth={auth}>
                                <PlaybackContextProvider
                                    initialVolume={0.5}
                                    updateLastPlayed={(track: MediaItem) => {
                                        localStorage.setItem('lastPlayedTrack', JSON.stringify(track))
                                    }}
                                    clearOnLogout={isLoggingOut}
                                >
                                    <MainLayout auth={auth} handleLogout={handleLogout} />
                                </PlaybackContextProvider>
                            </JellyfinContextProvider>
                        ) : (
                            <Navigate to="/login" />
                        )
                    }
                />
            </Routes>
        </div>
    )

    return (
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
            <Router>
                <HistoryProvider>
                    <PageTitleProvider>
                        <ScrollContextProvider>
                            <ThemeContextProvider>{actualApp}</ThemeContextProvider>
                        </ScrollContextProvider>
                    </PageTitleProvider>
                </HistoryProvider>
            </Router>
        </PersistQueryClientProvider>
    )
}

interface AuthData {
    serverUrl: string
    token: string
    userId: string
    username: string
}

const MainLayout = ({ auth, handleLogout }: { auth: AuthData; handleLogout: () => void }) => {
    const playback = usePlaybackContext()

    const location = useLocation()
    const { showSidenav, toggleSidenav, closeSidenav } = useSidenav(location)
    const { pageTitle } = usePageTitle()

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' })
    }, [location.pathname])

    const getPageTitle = () => {
        // Return pageTitle if set (e.g., by SearchResults), otherwise fallback to defaults
        if (pageTitle) return pageTitle

        if (location.pathname.startsWith('/album/')) return 'Album'
        if (location.pathname.startsWith('/artist/')) return 'Artist'
        if (location.pathname.startsWith('/genre/')) return 'Genre'
        if (location.pathname.startsWith('/playlist/')) return 'Playlist'
        if (location.pathname.startsWith('/search/')) {
            const query = decodeURIComponent(location.pathname.split('/search/')[1])
            return `Search results for '${query}'`
        }

        switch (location.pathname) {
            case '/':
                return 'Home'
            case '/tracks':
                return 'Tracks'
            case '/albums':
                return 'Albums'
            case '/favorites':
                return 'Favorites'
            case '/settings':
                return 'Settings'
            case '/recently':
                return 'Recently Played'
            case '/frequently':
                return 'Frequently Played'
            default:
                return 'Home'
        }
    }

    const previousPage = useAppBack()

    return (
        <div className="interface">
            <Sidenav username={auth.username} showSidenav={showSidenav} closeSidenav={closeSidenav} />
            <div className={showSidenav ? 'dimmer active' : 'dimmer'} onClick={toggleSidenav}></div>
            <main className="main">
                <div className="main_header">
                    <div className="primary">
                        <div onClick={previousPage} className="return_icon">
                            <ArrowLeftIcon size={16}></ArrowLeftIcon>
                        </div>
                        <div className="container">
                            <div className="page_title">
                                <div className="text" title={getPageTitle()}>
                                    {getPageTitle()}
                                </div>
                                {location.pathname.startsWith('/album/') && pageTitle && (
                                    <div className="page-icon album" title="Album">
                                        <svg
                                            width="16"
                                            height="16"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16.1328 15.7715"
                                        >
                                            <g>
                                                <rect height="15.7715" opacity="0" width="16.1328" x="0" y="0" />
                                                <path d="M15.7715 7.88086C15.7715 12.2266 12.2363 15.7617 7.88086 15.7617C3.53516 15.7617 0 12.2266 0 7.88086C0 3.53516 3.53516 0 7.88086 0C12.2363 0 15.7715 3.53516 15.7715 7.88086ZM4.75586 7.87109C4.75586 9.59961 6.15234 10.9961 7.88086 10.9961C9.61914 10.9961 11.0156 9.59961 11.0156 7.87109C11.0156 6.14258 9.61914 4.73633 7.88086 4.73633C6.15234 4.73633 4.75586 6.14258 4.75586 7.87109Z" />
                                                <circle className="spindle-hole" cx="7.88086" cy="7.87109" r="1.5" />
                                            </g>
                                        </svg>
                                    </div>
                                )}
                                {location.pathname.startsWith('/artist/') && pageTitle && (
                                    <div className="page-icon artist" title="Artist">
                                        <svg
                                            width="16"
                                            height="16"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16.1328 15.7715"
                                        >
                                            <g>
                                                <rect height="15.7715" opacity="0" width="16.1328" x="0" y="0" />
                                                <path d="M7.88086 15.7617C12.2363 15.7617 15.7715 12.2363 15.7715 7.88086C15.7715 3.52539 12.2363 0 7.88086 0C3.53516 0 0 3.52539 0 7.88086C0 12.2363 3.53516 15.7617 7.88086 15.7617ZM7.88086 14.2773C4.3457 14.2773 1.49414 11.416 1.49414 7.88086C1.49414 4.3457 4.3457 1.48438 7.88086 1.48438C11.416 1.48438 14.2773 4.3457 14.2773 7.88086C14.2773 11.416 11.416 14.2773 7.88086 14.2773ZM13.1445 12.959L13.1152 12.8613C12.7637 11.7188 10.7227 10.5078 7.88086 10.5078C5.03906 10.5078 3.00781 11.7188 2.65625 12.8613L2.62695 12.959C4.02344 14.3164 6.50391 15.0879 7.88086 15.0879C9.26758 15.0879 11.748 14.3164 13.1445 12.959ZM7.88086 9.21875C9.35547 9.23828 10.5176 7.97852 10.5176 6.32812C10.5176 4.77539 9.35547 3.49609 7.88086 3.49609C6.41602 3.49609 5.24414 4.77539 5.25391 6.32812C5.26367 7.97852 6.40625 9.19922 7.88086 9.21875Z" />
                                            </g>
                                        </svg>
                                    </div>
                                )}
                                {location.pathname.startsWith('/genre/') && pageTitle && (
                                    <div className="page-icon genre" title="Genre">
                                        <BookmarkFillIcon size={16} />
                                    </div>
                                )}
                                {location.pathname.startsWith('/playlist/') && pageTitle && (
                                    <div className="page-icon playlist" title="Playlist">
                                        <svg
                                            width="16"
                                            height="16"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16.1523 15.9277"
                                        >
                                            <g>
                                                <rect height="15.9277" opacity="0" width="16.1523" x="0" y="0" />
                                                <path d="M0.585938 9.82422L7.33398 9.82422C7.66602 9.82422 7.91992 9.57031 7.91992 9.23828C7.91992 8.92578 7.65625 8.66211 7.33398 8.66211L0.585938 8.66211C0.263672 8.66211 0 8.92578 0 9.23828C0 9.57031 0.253906 9.82422 0.585938 9.82422Z" />
                                                <path d="M0.585938 7.06055L7.33398 7.06055C7.66602 7.06055 7.91992 6.79688 7.91992 6.47461C7.91992 6.15234 7.65625 5.89844 7.33398 5.89844L0.585938 5.89844C0.263672 5.89844 0 6.15234 0 6.47461C0 6.79688 0.253906 7.06055 0.585938 7.06055Z" />
                                                <path d="M0.585938 4.30664L7.33398 4.30664C7.65625 4.30664 7.91992 4.04297 7.91992 3.7207C7.91992 3.39844 7.65625 3.13477 7.33398 3.13477L0.585938 3.13477C0.263672 3.13477 0 3.39844 0 3.7207C0 4.04297 0.263672 4.30664 0.585938 4.30664Z" />
                                                <path d="M15.791 3.88672L15.791 0.966797C15.791 0.546875 15.4492 0.263672 15.0391 0.351562L11.0059 1.23047C10.4785 1.34766 10.1953 1.62109 10.1953 2.08008L10.1953 10.6738C10.2441 11.0254 10.0781 11.25 9.77539 11.3086L8.55469 11.5625C6.98242 11.8945 6.25 12.6953 6.25 13.8867C6.25 15.0879 7.17773 15.9277 8.47656 15.9277C9.61914 15.9277 11.3477 15.0781 11.3477 12.8125L11.3477 5.74219C11.3477 5.35156 11.4062 5.29297 11.748 5.22461L15.3516 4.42383C15.625 4.36523 15.791 4.16016 15.791 3.88672Z" />
                                            </g>
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="secondary">
                        <div className="sidenav_toggle noSelect" onClick={toggleSidenav}>
                            <div className="bar"></div>
                            <div className="bar"></div>
                        </div>
                    </div>
                </div>
                <div className="main_content">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/tracks" element={<Tracks />} />
                        <Route path="/albums" element={<Albums />} />
                        <Route path="/album/:albumId" element={<Album />} />
                        <Route path="/artist/:artistId" element={<Artist />} />
                        <Route path="/genre/:genre" element={<Genre />} />
                        <Route path="/playlist/:playlistId" element={<Playlist key={window.location.pathname} />} />
                        <Route path="/favorites" element={<Favorites />} />
                        <Route path="/recently" element={<RecentlyPlayed />} />
                        <Route path="/frequently" element={<FrequentlyPlayed />} />
                        <Route path="/settings" element={<Settings onLogout={handleLogout} />} />
                        <Route path="/search/:query" element={<SearchResults />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
                <div className="main_footer">
                    <div
                        className={
                            playback.isPlaying
                                ? 'playback playing'
                                : playback.currentTrack
                                ? 'playback paused'
                                : 'playback'
                        }
                    >
                        <div className="progress">
                            <input
                                type="range"
                                id="track-progress"
                                name="track-progress"
                                min="0"
                                max={playback.duration || 1}
                                step="0.01"
                                value={playback.progress}
                                style={
                                    {
                                        '--progress-width': `${
                                            playback.duration ? (playback.progress / playback.duration) * 100 : 0
                                        }%`,
                                        '--buffered-width': `${
                                            playback.duration ? (playback.buffered / playback.duration) * 100 : 0
                                        }%`,
                                    } as CSSProperties
                                }
                                onChange={playback.handleSeek}
                            />
                        </div>
                        <div className="container">
                            <div className="track-info">
                                <div className="track-name">
                                    <div className="text" title={playback.currentTrack?.Name || 'No Track Played'}>
                                        {playback.currentTrack?.Name || 'No Track Played'}
                                    </div>
                                    {playback.currentTrack?.UserData?.IsFavorite && (
                                        <span className="favorited" title="Favorited">
                                            <HeartFillIcon size={12}></HeartFillIcon>
                                        </span>
                                    )}
                                </div>
                                <div
                                    className="artist"
                                    title={
                                        playback.currentTrack?.Artists?.join(', ') ||
                                        playback.currentTrack?.AlbumArtist ||
                                        'No Artist'
                                    }
                                >
                                    {playback.currentTrack &&
                                    playback.currentTrack.ArtistItems &&
                                    playback.currentTrack.ArtistItems.length > 0
                                        ? (() => {
                                              const artistItems = playback.currentTrack.ArtistItems
                                              return artistItems.map((artist, index) => (
                                                  <span key={artist.Id}>
                                                      <Link to={`/artist/${artist.Id}`} className="text">
                                                          {artist.Name}
                                                      </Link>
                                                      {index < artistItems.length - 1 && ', '}
                                                  </span>
                                              ))
                                          })()
                                        : playback.currentTrack?.Artists?.join(', ') ||
                                          playback.currentTrack?.AlbumArtist ||
                                          'No Artist'}
                                </div>
                                <div className="album">
                                    {playback.currentTrack?.Album ? (
                                        <Link
                                            to={`/album/${playback.currentTrack.AlbumId}`}
                                            className="text"
                                            title={playback.currentTrack.Album}
                                        >
                                            {playback.currentTrack.Album}
                                        </Link>
                                    ) : (
                                        <div className="text">No Album</div>
                                    )}
                                    <div className="album-icon" title="Album">
                                        <svg
                                            width="12"
                                            height="12"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 16.1328 15.7715"
                                        >
                                            <g>
                                                <rect height="15.7715" opacity="0" width="16.1328" x="0" y="0" />
                                                <path d="M15.7715 7.88086C15.7715 12.2266 12.2363 15.7617 7.88086 15.7617C3.53516 15.7617 0 12.2266 0 7.88086C0 3.53516 3.53516 0 7.88086 0C12.2363 0 15.7715 3.53516 15.7715 7.88086ZM4.75586 7.87109C4.75586 9.59961 6.15234 10.9961 7.88086 10.9961C9.61914 10.9961 11.0156 9.59961 11.0156 7.87109C11.0156 6.14258 9.61914 4.73633 7.88086 4.73633C6.15234 4.73633 4.75586 6.14258 4.75586 7.87109Z" />
                                                <circle className="spindle-hole" cx="7.88086" cy="7.87109" r="1.5" />
                                            </g>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div className="controls">
                                <div className="knobs">
                                    <div
                                        className={`shuffle ${playback.shuffle ? 'active' : ''}`}
                                        onClick={playback.toggleShuffle}
                                    >
                                        <div className="shuffle-icon"></div>
                                    </div>
                                    <div className="primary">
                                        <div className="previous" onClick={playback.previousTrack}>
                                            <div className="previous-icon"></div>
                                        </div>
                                        <div className="container">
                                            <div className="play" onClick={playback.togglePlayPause}>
                                                <div className="play-icon"></div>
                                            </div>
                                            <div className="pause" onClick={playback.togglePlayPause}>
                                                <div className="pause-icon"></div>
                                            </div>
                                        </div>
                                        <div className="next" onClick={playback.nextTrack}>
                                            <div className="next-icon"></div>
                                        </div>
                                    </div>
                                    <div
                                        className={`repeat ${playback.repeat === 'off' ? '' : 'active'}`}
                                        onClick={playback.toggleRepeat}
                                    >
                                        <div className={`repeat-icon${playback.repeat === 'one' ? '-one' : ''}`}></div>
                                    </div>
                                </div>
                                <div className="duration noSelect">
                                    <div className="current">{playback.formatTime(playback.progress)}</div>
                                    <div className="divider">/</div>
                                    <div className="total">{playback.formatTime(playback.duration)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default App
