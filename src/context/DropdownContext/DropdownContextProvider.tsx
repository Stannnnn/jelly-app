import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models'
import { ArrowLeftIcon, ChevronRightIcon } from '@primer/octicons-react'
import { Fragment, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MediaItem } from '../../api/jellyfin'
import { useJellyfinPlaylistsList } from '../../hooks/Jellyfin/useJellyfinPlaylistsList'
import { useDownloads } from '../../hooks/useDownloads'
import { useFavorites } from '../../hooks/useFavorites'
import { usePlaylists } from '../../hooks/usePlaylists'
import { useJellyfinContext } from '../JellyfinContext/JellyfinContext'
import { usePlaybackContext } from '../PlaybackContext/PlaybackContext'
import { useScrollContext } from '../ScrollContext/ScrollContext'
import { DropdownContext } from './DropdownContext'

export type IMenuItems = { [x in keyof IDropdownContext['menuItems']]?: boolean }
export type IDropdownContext = ReturnType<typeof useInitialState>

type IContext = { item: MediaItem; playlistId?: string }

const useInitialState = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [context, setContext] = useState<IContext>()
    const [subDropdown, setSubDropdown] = useState<{
        isOpen: boolean
        type: 'view-artists' | 'add-playlist' | ''
        flipX: boolean
        flipY: boolean
        width: number
        height: number
        top: number
        measured: boolean
        triggerRect: DOMRect | null
    }>({
        isOpen: false,
        type: '',
        flipX: false,
        flipY: false,
        width: 0,
        height: 0,
        top: 0,
        measured: false,
        triggerRect: null,
    })
    const [isTouchDevice, setIsTouchDevice] = useState(false)
    const scrollContext = useScrollContext()
    type IMenuItems = { [x in keyof typeof menuItems]?: boolean }
    const [hidden, setHidden] = useState<IMenuItems>()
    const navigate = useNavigate()
    const api = useJellyfinContext()
    const playback = usePlaybackContext()
    const { playlists } = useJellyfinPlaylistsList()
    const { addToFavorites, removeFromFavorites } = useFavorites()
    const { addToDownloads, removeFromDownloads } = useDownloads()
    const { addToPlaylist, addItemsToPlaylist, removeFromPlaylist, createPlaylist, deletePlaylist } = usePlaylists()

    const subMenuRef = useRef<HTMLDivElement>(null)

    const menuRef = useRef<HTMLDivElement>(null)

    const [playlistName, setPlaylistName] = useState<string>('')

    const closeSubDropdown = useCallback(() => {
        setSubDropdown(prev => ({ ...prev, isOpen: false, type: '', measured: false, triggerRect: null }))
    }, [])

    useEffect(() => {
        let timeoutId: NodeJS.Timeout

        if (!isOpen) {
            timeoutId = setTimeout(() => {
                setPosition({ x: 0, y: 0 })
            }, 200)
        }

        return () => {
            clearTimeout(timeoutId)
        }
    }, [isOpen])

    const closeDropdown = useCallback(() => {
        setIsOpen(false)
        setSubDropdown({
            isOpen: false,
            type: '',
            flipX: false,
            flipY: false,
            width: 0,
            height: 0,
            top: 0,
            measured: false,
            triggerRect: null,
        })
    }, [])

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => setPlaylistName(e.target.value),
        []
    )

    const handleInputKeyDown = useCallback(
        async (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && playlistName.trim() && context) {
                const playlist = await createPlaylist(playlistName.trim())
                await addToPlaylist(context.item, playlist.Id!)
                setPlaylistName('')
                closeDropdown()
            } else if (e.key === 'Escape') {
                setPlaylistName('')
            }
        },
        [addToPlaylist, closeDropdown, context, createPlaylist, playlistName]
    )

    const handleCreateClick = useCallback(
        async (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation()
            if (playlistName.trim() && context) {
                const playlist = await createPlaylist(playlistName.trim())
                await addToPlaylist(context.item, playlist.Id!)
                setPlaylistName('')
                closeDropdown()
            }
        },
        [addToPlaylist, closeDropdown, context, createPlaylist, playlistName]
    )

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeDropdown()
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [closeDropdown])

    useEffect(() => {
        const handlePointerDown = (e: PointerEvent) => {
            if (!isOpen) return
            const path = (e.composedPath?.() as unknown as Node[]) || []
            const clickedInside = path.some(
                node =>
                    node === menuRef.current ||
                    (node instanceof HTMLElement &&
                        (node.closest('.dropdown') !== null || node.closest('.sub-dropdown') !== null))
            )
            if (!clickedInside) {
                closeDropdown()
            }
        }

        document.addEventListener('pointerdown', handlePointerDown, true)

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, true)
        }
    }, [closeDropdown, isOpen])

    const openSubDropdown = useCallback(
        (type: 'view-artists' | 'add-playlist', e: React.MouseEvent<HTMLDivElement>) => {
            const rect = e.currentTarget.getBoundingClientRect()
            setSubDropdown({
                isOpen: true,
                type,
                flipX: false,
                flipY: false,
                width: 0,
                height: 0,
                top: 0,
                measured: false,
                triggerRect: rect,
            })
        },
        []
    )

    useLayoutEffect(() => {
        if (!subDropdown.isOpen || subDropdown.measured || !subDropdown.triggerRect) return

        const menuEl = subMenuRef.current?.querySelector('.dropdown-menu') as HTMLElement
        if (!menuEl) return

        const { width, height } = menuEl.getBoundingClientRect()
        const triggerRect = subDropdown.triggerRect
        const margin = 20 // Small margin for sub-menus
        const viewportW = window.innerWidth
        const viewportH = window.innerHeight

        // Determine if sub-menu should flip horizontally
        const newFlipX =
            triggerRect.left + triggerRect.width + width + margin > viewportW && // Overflows right
            triggerRect.left - width - margin < 0
                ? false // If it also overflows left, don't flip (or pick a side)
                : triggerRect.left + triggerRect.width + width + margin > viewportW // Default flip if overflows right

        // Determine if sub-menu should flip vertically (i.e., align bottom with parent's bottom)
        const newFlipY = triggerRect.top + height + margin > viewportH

        // Calculate CSS top position relative to the parent item
        // If newFlipY is true, align sub-menu bottom with parent item bottom
        // Otherwise, align sub-menu top with parent item top
        let newTop = newFlipY ? -height + triggerRect.height : 0

        // Ensure the sub-menu stays within vertical viewport bounds
        if (triggerRect.top + newTop < margin) {
            // Sub-menu is too high
            newTop = -triggerRect.top + margin
        } else if (triggerRect.top + newTop + height + margin > viewportH) {
            // Sub-menu is too low
            newTop = viewportH - height - triggerRect.top - margin
        }

        setSubDropdown(sd => ({
            ...sd,
            width,
            height,
            flipX: newFlipX,
            flipY: newFlipY,
            top: newTop,
            measured: true,
        }))
    }, [subDropdown.isOpen, subDropdown.measured, subDropdown.triggerRect])

    useEffect(() => {
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 480
        setIsTouchDevice(isTouch)
    }, [])

    useEffect(() => {
        if (scrollContext && isTouchDevice) {
            scrollContext.setDisabled(isOpen)
        }
    }, [isOpen, isTouchDevice, scrollContext])

    const openDropdown = useCallback(
        (context: IContext, x: number, y: number, ignoreMargin: boolean) => {
            let adjustedX = x
            let adjustedY = y
            if (isTouchDevice) {
                adjustedX = 0
                adjustedY = window.innerHeight
            } else if (!ignoreMargin) {
                const menuWidth = 210 // Approximate dropdown width
                const menuHeight = 180 // Approximate dropdown height
                const margin = 20
                const viewportWidth = window.innerWidth
                const viewportHeight = window.innerHeight + window.pageYOffset

                // Ensure dropdown stays within viewport
                adjustedX = x + menuWidth + margin > viewportWidth ? viewportWidth - menuWidth - margin : x
                adjustedY = y + menuHeight + margin > viewportHeight ? viewportHeight - menuHeight - margin : y
                adjustedY = y < margin ? margin : adjustedY // Prevent top overflow
                adjustedX = x < margin ? margin : adjustedX // Prevent left overflow
            } else {
                // Position dropdown below the toggle, aligned left with offsets
                let triggerElement = document.elementFromPoint(x, y)
                if (triggerElement) {
                    while (triggerElement && !triggerElement.classList.contains('more')) {
                        triggerElement = triggerElement.parentElement
                    }
                    if (triggerElement) {
                        const rect = triggerElement.getBoundingClientRect()
                        adjustedX = rect.left - window.pageXOffset - 142
                        adjustedY = rect.bottom + window.pageYOffset + 8
                    }
                }
            }
            setIsOpen(true)
            setPosition({ x: adjustedX, y: adjustedY })
            setContext(context)
            setSubDropdown({
                isOpen: false,
                type: '',
                flipX: false,
                flipY: false,
                top: 0,
                width: 0,
                height: 0,
                measured: false,
                triggerRect: null,
            })
        },
        [isTouchDevice]
    )

    const expandItems = useCallback(
        async (item: MediaItem) => {
            if (item.Type === BaseItemKind.MusicAlbum) {
                const tracks = await api.getAlbumDetails(item.Id)
                return tracks.tracks
            } else if (item.Type === BaseItemKind.MusicArtist) {
                const tracks = await api.getArtistDetails(item.Id)
                return tracks.tracks
            } else if (item.Type === BaseItemKind.Playlist) {
                const tracks = await api.getPlaylistAllTracks(item.Id)
                return tracks
            } else {
                return [item]
            }
        },
        [api]
    )

    const handlePlayNext = useCallback(
        async (item: MediaItem) => {
            const playlist = playback.currentPlaylist
            const newPlaylist = [...playlist, ...(await expandItems(item))]
            playback.setCurrentPlaylist({ playlist: newPlaylist, title: 'Direct Queue' })
            closeDropdown()
        },
        [closeDropdown, expandItems, playback]
    )

    const handleAddToQueue = useCallback(
        async (item: MediaItem) => {
            const playlist = playback.currentPlaylist
            const newPlaylist = [...playlist, ...(await expandItems(item))]
            playback.setCurrentPlaylist({ playlist: newPlaylist, title: 'Direct Queue' })
            closeDropdown()
        },
        [closeDropdown, expandItems, playback]
    )

    // Actually working
    const handleViewAlbum = useCallback(
        (item: MediaItem) => {
            closeDropdown()

            if (item.AlbumId) {
                navigate(`/album/${item.AlbumId}`)
            }
        },
        [closeDropdown, navigate]
    )

    const handleViewArtist = useCallback(
        (artistId: string | undefined) => {
            closeDropdown()

            if (artistId) {
                navigate(`/artist/${artistId}`)
            }
        },
        [closeDropdown, navigate]
    )

    const menuItems = useMemo(() => {
        return {
            next: (
                <div
                    className="dropdown-item play-next"
                    onClick={async () => await handlePlayNext(context!.item)}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>Play next</span>
                </div>
            ),
            add_to_queue: (
                <div
                    className="dropdown-item add-queue"
                    onClick={async () => await handleAddToQueue(context!.item)}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>Add to queue</span>
                </div>
            ),
            instant_mix: (
                <div
                    className="dropdown-item instant-mix"
                    onClick={async () => {
                        if (!context) return

                        closeDropdown()

                        const r = await api.getInstantMixFromSong(context.item.Id)

                        if (r) {
                            playback.setCurrentPlaylist({ playlist: r, title: 'Instant Mix' })
                            playback.playTrack(0)
                            navigate('/queue')
                        }
                    }}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>Play instant mix</span>
                </div>
            ),
            delete_playlist: (
                <div
                    className="dropdown-item delete-playlist has-removable"
                    onClick={async () => {
                        closeDropdown()

                        if (context?.item.Id) {
                            if (confirm('Are you sure you want to delete this playlist?')) {
                                await deletePlaylist(context.item.Id)
                            }
                        }
                    }}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>Delete playlist</span>
                </div>
            ),
            view_artists: (
                <div
                    className={`dropdown-item view-artists has-sub-menu${
                        subDropdown.isOpen && subDropdown.type === 'view-artists' ? ' active' : ''
                    }`}
                    onMouseEnter={!isTouchDevice ? e => openSubDropdown('view-artists', e) : undefined}
                    onClick={isTouchDevice ? e => openSubDropdown('view-artists', e) : undefined}
                >
                    <span>View artists</span>
                    <ChevronRightIcon size={12} className="icon" />
                    {!isTouchDevice && subDropdown.isOpen && subDropdown.type === 'view-artists' && (
                        <div
                            ref={subMenuRef}
                            className={
                                'sub-dropdown' +
                                (subDropdown.flipX ? ' flip-x' : '') +
                                (subDropdown.flipY ? ' flip-y' : '')
                            }
                            style={
                                !subDropdown.measured || !subDropdown.triggerRect
                                    ? { visibility: 'hidden', position: 'absolute', left: '-9999px', top: '-9999px' }
                                    : {
                                          position: 'absolute',
                                          top: `${subDropdown.top}px`,
                                          left: subDropdown.flipX ? 'auto' : '100%',
                                          right: subDropdown.flipX ? '100%' : 'auto',
                                      }
                            }
                        >
                            <div className="dropdown-menu">
                                {context?.item?.ArtistItems?.map(artist => (
                                    <div
                                        key={artist.Id}
                                        className="dropdown-item"
                                        onClick={() => handleViewArtist(artist.Id)}
                                    >
                                        {artist.Name || 'Unknown Artist'}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ),
            view_artist: (
                <div
                    className="dropdown-item view-artist"
                    onClick={() => handleViewArtist(context?.item?.ArtistItems?.[0].Id)}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>View artist</span>
                </div>
            ),
            view_album: (
                <div
                    className="dropdown-item view-album"
                    onClick={() => handleViewAlbum(context!.item)}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>View album</span>
                </div>
            ),
            add_to_favorite: (
                <div
                    className="dropdown-item add-favorite"
                    onClick={async () => {
                        closeDropdown()

                        if (context) {
                            await addToFavorites(context.item)
                        }
                    }}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>Add to favorites</span>
                </div>
            ),
            remove_from_favorite: (
                <div
                    className="dropdown-item remove-favorite has-removable"
                    onClick={async () => {
                        closeDropdown()

                        if (context) {
                            await removeFromFavorites(context.item)
                        }
                    }}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>Remove from favorites</span>
                </div>
            ),
            add_to_playlist: (
                <div
                    className={`dropdown-item add-playlist has-sub-menu${
                        subDropdown.isOpen && subDropdown.type === 'add-playlist' ? ' active' : ''
                    }`}
                    onMouseEnter={!isTouchDevice ? e => openSubDropdown('add-playlist', e) : undefined}
                    onClick={isTouchDevice ? e => openSubDropdown('add-playlist', e) : undefined}
                >
                    <span>Add to playlist</span>
                    <ChevronRightIcon size={12} className="icon" />
                    {!isTouchDevice && subDropdown.isOpen && subDropdown.type === 'add-playlist' && (
                        <div
                            ref={subMenuRef}
                            className={`sub-dropdown${subDropdown.flipX ? ' flip-x' : ''}${
                                subDropdown.flipY ? ' flip-y' : ''
                            }`}
                            style={
                                !subDropdown.measured || !subDropdown.triggerRect
                                    ? { visibility: 'hidden', position: 'absolute', left: '-9999px', top: '-9999px' }
                                    : {
                                          position: 'absolute',
                                          top: `${subDropdown.top}px`,
                                          left: subDropdown.flipX ? 'auto' : '100%',
                                          right: subDropdown.flipX ? '100%' : 'auto',
                                      }
                            }
                        >
                            <div className="dropdown-menu">
                                <div className="dropdown-item">
                                    <div className="playlist-input-container">
                                        <input
                                            value={playlistName}
                                            onChange={handleInputChange}
                                            onKeyDown={handleInputKeyDown}
                                            onClick={e => e.stopPropagation()}
                                            placeholder="New..."
                                            className={`playlist-input${playlistName.trim() ? ' has-text' : ''}`}
                                        />
                                        <button className="create-btn" onClick={handleCreateClick}>
                                            Create
                                        </button>
                                    </div>
                                </div>

                                <div className="dropdown-separator" />

                                {playlists.map(playlist => (
                                    <div
                                        key={playlist.Id}
                                        className="dropdown-item"
                                        onClick={async () => {
                                            closeDropdown()

                                            if (context) {
                                                await addItemsToPlaylist(await expandItems(context.item), playlist.Id)
                                            }
                                        }}
                                    >
                                        {playlist.Name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ),
            remove_from_playlist: context?.playlistId ? (
                <div
                    className="dropdown-item remove-playlist has-removable"
                    onClick={async () => {
                        closeDropdown()

                        await removeFromPlaylist(context.item, context.playlistId!)
                    }}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>Remove from playlist</span>
                </div>
            ) : null,
            download_song:
                context?.item.offlineState === 'downloaded' ? (
                    <div
                        className="dropdown-item remove-song has-removable"
                        onClick={async () => {
                            closeDropdown()

                            if (context) {
                                removeFromDownloads(
                                    (await expandItems(context.item)).map(i => i.Id),
                                    context.item.Type === BaseItemKind.Audio ? undefined : context.item.Id
                                )
                            }
                        }}
                        onMouseEnter={closeSubDropdown}
                    >
                        <span>
                            Remove{' '}
                            {context?.item.Type === BaseItemKind.Audio
                                ? 'song'
                                : context?.item.Type === BaseItemKind.MusicAlbum
                                ? 'album'
                                : context?.item.Type === BaseItemKind.MusicArtist
                                ? 'artist'
                                : context?.item.Type === BaseItemKind.Playlist
                                ? 'playlist'
                                : ''}
                        </span>
                    </div>
                ) : !context?.item.offlineState ? (
                    <div
                        className="dropdown-item"
                        onClick={async () => {
                            closeDropdown()

                            if (context) {
                                addToDownloads(
                                    (await expandItems(context.item)).map(i => i.Id),
                                    context.item.Type === BaseItemKind.Audio ? undefined : context.item.Id
                                )
                            }
                        }}
                        onMouseEnter={closeSubDropdown}
                    >
                        <span>
                            Download{' '}
                            {context?.item.Type === BaseItemKind.Audio
                                ? 'song'
                                : context?.item.Type === BaseItemKind.MusicAlbum
                                ? 'album'
                                : context?.item.Type === BaseItemKind.MusicArtist
                                ? 'artist'
                                : context?.item.Type === BaseItemKind.Playlist
                                ? 'playlist'
                                : ''}
                        </span>
                    </div>
                ) : null,
        }
    }, [
        addItemsToPlaylist,
        addToDownloads,
        addToFavorites,
        api,
        closeDropdown,
        closeSubDropdown,
        context,
        deletePlaylist,
        expandItems,
        handleAddToQueue,
        handleCreateClick,
        handleInputChange,
        handleInputKeyDown,
        handlePlayNext,
        handleViewAlbum,
        handleViewArtist,
        isTouchDevice,
        navigate,
        openSubDropdown,
        playback,
        playlistName,
        playlists,
        removeFromDownloads,
        removeFromFavorites,
        removeFromPlaylist,
        subDropdown.flipX,
        subDropdown.flipY,
        subDropdown.isOpen,
        subDropdown.measured,
        subDropdown.top,
        subDropdown.triggerRect,
        subDropdown.type,
    ])

    const dropdownNode = useMemo(() => {
        const renderMobileSubMenuItems = () => {
            const backButton = (
                <div key="back-button" className="dropdown-item return-item" onClick={closeSubDropdown}>
                    <ArrowLeftIcon size={16} className="return-icon" />
                    <span>Back</span>
                </div>
            )

            let items: ReactNode[] = []

            if (subDropdown.type === 'view-artists') {
                items =
                    context?.item?.ArtistItems?.map(artist => (
                        <div
                            key={artist.Id}
                            className="dropdown-item"
                            onClick={() => {
                                handleViewArtist(artist.Id)
                                // handleViewArtist already calls closeDropdown
                            }}
                        >
                            {artist.Name || 'Unknown Artist'}
                        </div>
                    )) || []
            } else if (subDropdown.type === 'add-playlist') {
                items = [
                    <div key="playlist-input-item" className="dropdown-item">
                        <div className="playlist-input-container">
                            <input
                                value={playlistName}
                                onChange={handleInputChange}
                                onKeyDown={handleInputKeyDown} // Calls closeDropdown on Enter
                                onClick={e => e.stopPropagation()}
                                placeholder="New..."
                                className={`playlist-input${playlistName.trim() ? ' has-text' : ''}`}
                            />
                            <button className="create-btn" onClick={handleCreateClick}>
                                {' '}
                                {/* Calls closeDropdown */}
                                Create
                            </button>
                        </div>
                    </div>,
                    <div key="playlist-separator" className="dropdown-separator" />,
                    ...playlists.map(playlist => (
                        <div
                            key={playlist.Id}
                            className="dropdown-item"
                            onClick={async () => {
                                closeDropdown()

                                if (context) {
                                    await addToPlaylist(context.item, playlist.Id)
                                }
                            }}
                        >
                            {playlist.Name}
                        </div>
                    )),
                ]
            }
            return [backButton, <div key="back-separator" className="dropdown-separator" />, ...items]
        }

        const renderDropdownItems = () => {
            const menuItemz: { isVisible: boolean; node: ReactNode }[][] = [
                [
                    {
                        isVisible:
                            !hidden?.next &&
                            (context?.item.Type === BaseItemKind.Audio ||
                                context?.item.Type === BaseItemKind.MusicAlbum ||
                                context?.item.Type === BaseItemKind.MusicArtist),
                        node: menuItems.next,
                    },
                    {
                        isVisible:
                            !hidden?.add_to_queue &&
                            (context?.item.Type === BaseItemKind.Audio ||
                                context?.item.Type === BaseItemKind.MusicAlbum ||
                                context?.item.Type === BaseItemKind.MusicArtist),
                        node: menuItems.add_to_queue,
                    },
                    {
                        isVisible: !hidden?.instant_mix,
                        node: menuItems.instant_mix,
                    },
                ],
                [
                    {
                        isVisible: !hidden?.view_artists && (context?.item?.ArtistItems?.length || 0) > 1,
                        node: menuItems.view_artists,
                    },
                    {
                        isVisible: !hidden?.view_artist && context?.item?.ArtistItems?.length === 1,
                        node: menuItems.view_artist,
                    },
                    {
                        isVisible: !!(
                            !hidden?.view_album &&
                            context?.item.Type !== BaseItemKind.MusicAlbum &&
                            context?.item.AlbumId
                        ),
                        node: menuItems.view_album,
                    },
                ],
                [
                    {
                        isVisible: !hidden?.add_to_favorite && !context?.item?.UserData?.IsFavorite,
                        node: menuItems.add_to_favorite,
                    },
                    {
                        isVisible: !!(!hidden?.remove_from_favorite && context?.item.UserData?.IsFavorite),
                        node: menuItems.remove_from_favorite,
                    },
                    {
                        isVisible: !!(!hidden?.remove_from_playlist && context?.item.Type === BaseItemKind.Audio),
                        node: menuItems.remove_from_playlist,
                    },
                    {
                        isVisible:
                            !hidden?.add_to_playlist &&
                            (context?.item.Type === BaseItemKind.Audio ||
                                context?.item.Type === BaseItemKind.MusicAlbum ||
                                context?.item.Type === BaseItemKind.MusicArtist),
                        node: menuItems.add_to_playlist,
                    },
                    {
                        isVisible: !hidden?.delete_playlist && context?.item.Type === BaseItemKind.Playlist,
                        node: menuItems.delete_playlist,
                    },
                ],
                [
                    {
                        isVisible:
                            !hidden?.download_song &&
                            (context?.item.Type === BaseItemKind.Audio ||
                                context?.item.Type === BaseItemKind.MusicAlbum ||
                                context?.item.Type === BaseItemKind.MusicArtist ||
                                context?.item.Type === BaseItemKind.Playlist),
                        node: menuItems.download_song,
                    },
                ],
            ]

            const visibleGroups = menuItemz
                .map(group => group.filter(item => item.isVisible))
                .filter(group => group.length > 0)

            return visibleGroups.map((group, index) => (
                <Fragment key={index}>
                    {group.map((item, idx) => (item.isVisible ? <Fragment key={idx}>{item.node}</Fragment> : null))}
                    {index !== visibleGroups.length - 1 && <div className="dropdown-separator" />}
                </Fragment>
            ))
        }

        return (
            <div
                className={'dropdown noSelect' + (isOpen ? ' active' : '')}
                style={{
                    top: `${position.y}px`,
                    left: `${position.x}px`,
                    bottom: 'auto',
                }}
                ref={menuRef}
            >
                <div className="dropdown-menu">
                    {isTouchDevice && subDropdown.isOpen ? renderMobileSubMenuItems() : renderDropdownItems()}
                </div>
            </div>
        )
    }, [
        addToPlaylist,
        closeDropdown,
        closeSubDropdown,
        context,
        handleCreateClick,
        handleInputChange,
        handleInputKeyDown,
        handleViewArtist,
        hidden?.add_to_favorite,
        hidden?.add_to_playlist,
        hidden?.add_to_queue,
        hidden?.delete_playlist,
        hidden?.download_song,
        hidden?.instant_mix,
        hidden?.next,
        hidden?.remove_from_favorite,
        hidden?.remove_from_playlist,
        hidden?.view_album,
        hidden?.view_artist,
        hidden?.view_artists,
        isOpen,
        isTouchDevice,
        menuItems.add_to_favorite,
        menuItems.add_to_playlist,
        menuItems.add_to_queue,
        menuItems.delete_playlist,
        menuItems.download_song,
        menuItems.instant_mix,
        menuItems.next,
        menuItems.remove_from_favorite,
        menuItems.remove_from_playlist,
        menuItems.view_album,
        menuItems.view_artist,
        menuItems.view_artists,
        playlistName,
        playlists,
        position.x,
        position.y,
        subDropdown.isOpen,
        subDropdown.type,
    ])

    const touchTimeoutRef = useRef<number | null>(null)

    const handleTouchStart = useCallback(
        (e: React.TouchEvent<HTMLElement>, context: IContext, ignoreMargin = false, hidden: IMenuItems = {}) => {
            e.preventDefault()
            touchTimeoutRef.current = window.setTimeout(() => {
                const touch = e.touches[0]
                const x = touch.clientX
                const y = touch.clientY + window.pageYOffset
                openDropdown(context, x, y, ignoreMargin)
                setHidden(hidden)
            }, 400)
        },
        [openDropdown]
    )

    const clearTouchTimer = useCallback(() => {
        if (touchTimeoutRef.current !== null) {
            clearTimeout(touchTimeoutRef.current)
            touchTimeoutRef.current = null
        }
    }, [])

    return {
        isOpen,
        position,
        selectedItem: context?.item,
        menuItems,
        subDropdown,
        isTouchDevice,
        openDropdown,
        closeDropdown,
        openSubDropdown,
        closeSubDropdown,
        onContextMenu: (
            e: React.MouseEvent<HTMLElement, MouseEvent>,
            context: IContext,
            ignoreMargin = false,
            hidden: IMenuItems = {}
        ) => {
            e.preventDefault()
            const x = e.clientX
            const y = e.clientY + window.pageYOffset
            openDropdown(context, x, y, ignoreMargin)
            setHidden(hidden)
        },
        onTouchStart: handleTouchStart,
        onTouchClear: clearTouchTimer,
        dropdownNode,
    }
}

export const DropdownContextProvider = ({ children }: { children: ReactNode }) => {
    const initialState = useInitialState()

    return <DropdownContext.Provider value={initialState}>{children}</DropdownContext.Provider>
}
