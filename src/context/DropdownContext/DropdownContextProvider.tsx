import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models'
import { ArrowLeftIcon, ChevronRightIcon, HeartFillIcon, XIcon } from '@primer/octicons-react'
import { Fragment, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JELLYFIN_MAX_LIMIT, MediaItem } from '../../api/jellyfin'
import { InlineLoader } from '../../components/InlineLoader'
import { JellyImg } from '../../components/JellyImg'
import { Squircle } from '../../components/Squircle'
import { TracksIcon } from '../../components/SvgIcons'
import { useJellyfinPlaylistsList } from '../../hooks/Jellyfin/useJellyfinPlaylistsList'
import { useFavorites } from '../../hooks/useFavorites'
import { usePlaylists } from '../../hooks/usePlaylists'
import { useDownloadContext } from '../DownloadContext/DownloadContext'
import { useJellyfinContext } from '../JellyfinContext/JellyfinContext'
import { usePlaybackContext } from '../PlaybackContext/PlaybackContext'
import { useScrollContext } from '../ScrollContext/ScrollContext'
import { DropdownContext } from './DropdownContext'
import { DropdownItem } from './DropdownItem'

export type IMenuItems = { [x in keyof IDropdownContext['menuItems']]?: boolean }
export type IDropdownContext = ReturnType<typeof useInitialState>

type IContext = { item: MediaItem; playlistId?: string; customContainer?: string }

const useInitialState = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [context, setContext] = useState<IContext>()
    const [subDropdown, setSubDropdown] = useState<{
        isOpen: boolean
        type: 'view-artists' | 'add-playlist' | 'rename-playlist' | ''
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
    const [isInteractionBlocked, setIsInteractionBlocked] = useState(false)
    const { setDisabled } = useScrollContext()
    type IMenuItems = { [x in keyof typeof menuItems]?: boolean }
    const [hidden, setHidden] = useState<IMenuItems>()
    const navigate = useNavigate()
    const api = useJellyfinContext()
    const playback = usePlaybackContext()
    const { playlists } = useJellyfinPlaylistsList()
    const { addToFavorites, removeFromFavorites } = useFavorites()
    const { addToDownloads, removeFromDownloads } = useDownloadContext()
    const { addItemsToPlaylist, removeFromPlaylist, createPlaylist, deletePlaylist, renamePlaylist } = usePlaylists()

    const menuRef = useRef<HTMLDivElement>(null)
    const subMenuRef = useRef<HTMLDivElement>(null)
    const [playlistName, setPlaylistName] = useState<string>('')
    const [renamePlaylistName, setRenamePlaylistName] = useState<string>('')
    const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
    const [isRenamingPlaylist, setIsRenamingPlaylist] = useState(false)

    // Resize handler to update isTouchDevice and reset dropdown on viewport changes
    useEffect(() => {
        const handleResize = () => {
            const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 480
            setIsTouchDevice(isTouch)
            if (isOpen && document.activeElement?.tagName !== 'INPUT') {
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
                setPosition({ x: 0, y: 0 })
                setDisabled(false)
            }
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [isOpen, setDisabled])

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

    // Block interactions for 400ms after dropdown opens on touch devices to prevent accidental taps
    useEffect(() => {
        if (!isOpen || !isTouchDevice) {
            setIsInteractionBlocked(false)
            return
        }

        setIsInteractionBlocked(true)
        const timeoutId = setTimeout(() => {
            setIsInteractionBlocked(false)
        }, 400)

        return () => {
            clearTimeout(timeoutId)
        }
    }, [isOpen, isTouchDevice])

    const closeDropdown = useCallback(() => {
        setIsOpen(false)
        setDisabled(false)
    }, [setDisabled])

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => setPlaylistName(e.target.value),
        []
    )

    const handleRenameInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => setRenamePlaylistName(e.target.value),
        []
    )

    const expandItems = useCallback(
        async (item: MediaItem, customContainer?: string) => {
            if (item.Type === BaseItemKind.MusicAlbum) {
                const tracks = await api.getAlbumDetails(item.Id)
                return tracks.tracks
            } else if (item.Type === BaseItemKind.MusicArtist) {
                const tracks = await api.getArtistDetails(item.Id)
                return tracks.tracks
            } else if (item.Type === BaseItemKind.Playlist) {
                const tracks = await api.getPlaylistAllTracks(item.Id)
                return tracks
            } else if (item.Type === BaseItemKind.MusicGenre) {
                const genreTracks = await api.getGenreTracks(item.Name, 0, JELLYFIN_MAX_LIMIT)
                return genreTracks
            } else if (customContainer === 'favorites') {
                const favorites = await api.getFavoriteTracks(0, JELLYFIN_MAX_LIMIT)
                return favorites
            } else {
                return [item]
            }
        },
        [api]
    )

    const handleInputKeyDown = useCallback(
        async (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (!context) return

            if (e.key === 'Enter' && playlistName.trim()) {
                const playlist = await createPlaylist(playlistName.trim())
                await addItemsToPlaylist(await expandItems(context.item, context.customContainer), playlist.Id!)
                setPlaylistName('')
                closeDropdown()
            } else if (e.key === 'Escape') {
                setPlaylistName('')
            }
        },
        [addItemsToPlaylist, closeDropdown, context, createPlaylist, expandItems, playlistName]
    )

    const handleRenameInputKeyDown = useCallback(
        async (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (!context) return

            if (e.key === 'Enter' && renamePlaylistName.trim()) {
                await renamePlaylist(context.item.Id, renamePlaylistName.trim())
                setRenamePlaylistName('')
                closeDropdown()
            } else if (e.key === 'Escape') {
                setRenamePlaylistName('')
            }
        },
        [closeDropdown, context, renamePlaylist, renamePlaylistName]
    )

    const handleCreateClick = useCallback(
        async (e: React.MouseEvent<HTMLButtonElement>) => {
            if (!context || isCreatingPlaylist) return

            e.stopPropagation()
            if (playlistName.trim()) {
                setIsCreatingPlaylist(true)
                try {
                    const playlist = await createPlaylist(playlistName.trim())
                    await addItemsToPlaylist(await expandItems(context.item, context.customContainer), playlist.Id!)
                    setPlaylistName('')
                    closeDropdown()
                } finally {
                    setIsCreatingPlaylist(false)
                }
            }
        },
        [addItemsToPlaylist, closeDropdown, context, createPlaylist, expandItems, playlistName, isCreatingPlaylist]
    )

    const handleRenameClick = useCallback(
        async (e: React.MouseEvent<HTMLButtonElement>) => {
            if (!context || isRenamingPlaylist) return

            e.stopPropagation()
            if (renamePlaylistName.trim()) {
                setIsRenamingPlaylist(true)
                try {
                    await renamePlaylist(context.item.Id, renamePlaylistName.trim())
                    setRenamePlaylistName('')
                    closeDropdown()
                } finally {
                    setIsRenamingPlaylist(false)
                }
            }
        },
        [closeDropdown, context, renamePlaylist, renamePlaylistName, isRenamingPlaylist]
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
        (type: 'view-artists' | 'add-playlist' | 'rename-playlist', e: React.MouseEvent<HTMLDivElement>) => {
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

            // Set initial value for rename playlist
            if (type === 'rename-playlist' && context?.item.Name) {
                setRenamePlaylistName(context.item.Name)
            }
        },
        [context?.item.Name]
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

    const openDropdown = useCallback(
        (
            e: React.MouseEvent<HTMLElement, MouseEvent> | React.TouchEvent<HTMLElement>,
            context: IContext,
            x: number,
            y: number,
            ignoreMargin: boolean
        ) => {
            let adjustedX = x
            let adjustedY = y
            if (isTouchDevice) {
                adjustedX = 0
                adjustedY = window.innerHeight
            } else if (!ignoreMargin) {
                const menuWidth = 210 // Approximate dropdown width
                const menuHeight = 250 // Approximate dropdown height
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
                const triggerElement = e.currentTarget.closest('.more')

                if (triggerElement) {
                    const rect = triggerElement.getBoundingClientRect()
                    adjustedX = rect.left - window.pageXOffset - 142
                    adjustedY = rect.bottom + window.pageYOffset + 8
                }
            }
            setIsOpen(true)

            if (isTouchDevice) {
                setDisabled(true)
            }

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
        [isTouchDevice, setDisabled]
    )

    const handlePlayNext = useCallback(
        async (item: MediaItem) => {
            if (!context) return

            const insertionPoint = (playback.currentTrackIndex ?? -1) + 1

            await playback.updateCurrentPlaylist(async pages => {
                let trackCounter = 0

                for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                    const page = pages[pageIndex]

                    for (let trackIndex = 0; trackIndex < page.length; trackIndex++) {
                        if (trackCounter === insertionPoint) {
                            const expandedItems = await expandItems(item, context.customContainer)
                            const markedItems = playback.markAsManuallyAdded(expandedItems)

                            return [
                                ...pages.slice(0, pageIndex),
                                [...page.slice(0, trackIndex), ...markedItems, ...page.slice(trackIndex)],
                                ...pages.slice(pageIndex + 1),
                            ]
                        }

                        trackCounter++
                    }
                }

                if (insertionPoint >= trackCounter) {
                    const expandedItems = await expandItems(item, context.customContainer)
                    const markedItems = playback.markAsManuallyAdded(expandedItems)

                    return [...pages.slice(0, pages.length - 1), [...pages[pages.length - 1], ...markedItems]]
                }

                const expandedItems = await expandItems(item, context.customContainer)
                const markedItems = playback.markAsManuallyAdded(expandedItems)

                return [
                    [...(pages[0]?.slice(0, 1) || []), ...markedItems, ...(pages[0]?.slice(1) || [])],
                    ...pages.slice(1),
                ]
            })

            if (playback.currentTrackIndex === -1) {
                playback.playTrack(0)
            }

            closeDropdown()
        },
        [closeDropdown, context, expandItems, playback]
    )

    const handleAddToQueue = useCallback(
        async (item: MediaItem) => {
            if (!context) return

            const expandedItems = await expandItems(item, context.customContainer)
            const markedItems = playback.markAsManuallyAdded(expandedItems)

            await playback.updateCurrentPlaylist(async pages => [
                ...pages.slice(0, pages.length - 1),
                [...(pages[pages.length - 1] || []), ...markedItems],
            ])

            if (playback.currentTrackIndex === -1) {
                playback.playTrack(0)
            }

            closeDropdown()
        },
        [closeDropdown, context, expandItems, playback]
    )

    const handleRemoveFromQueue = useCallback(
        async (item: MediaItem) => {
            await playback.updateCurrentPlaylist(async pages =>
                pages.map(page => page.filter(i => i.queueId !== item.queueId))
            )

            closeDropdown()
        },
        [closeDropdown, playback]
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
                <DropdownItem
                    className="play-next"
                    onClick={async () => context && (await handlePlayNext(context.item))}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>Play next</span>
                </DropdownItem>
            ),
            add_to_queue: (
                <DropdownItem
                    className="add-queue"
                    onClick={async () => context && (await handleAddToQueue(context.item))}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>Add to queue</span>
                </DropdownItem>
            ),
            remove_from_queue: (
                <DropdownItem
                    className="remove-queue has-removable"
                    onClick={async () => context && (await handleRemoveFromQueue(context.item))}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>Remove from queue</span>
                </DropdownItem>
            ),
            instant_mix: (
                <DropdownItem
                    className="instant-mix"
                    onClick={async () => {
                        if (!context) return

                        closeDropdown()
                        navigate('/instantmix/' + context.item.Id)
                    }}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>Go to instant mix</span>
                </DropdownItem>
            ),
            delete_playlist: (
                <DropdownItem
                    className="delete-playlist has-removable"
                    onClick={async () => {
                        if (!context) return

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
                </DropdownItem>
            ),
            rename_playlist: (
                <div
                    className={`dropdown-item rename-playlist has-sub-menu${
                        subDropdown.isOpen && subDropdown.type === 'rename-playlist' ? ' active' : ''
                    }`}
                    onMouseEnter={!isTouchDevice ? e => openSubDropdown('rename-playlist', e) : undefined}
                    onClick={isTouchDevice ? e => openSubDropdown('rename-playlist', e) : undefined}
                >
                    <span>Rename playlist</span>
                    <ChevronRightIcon size={12} className="icon" />
                    {!isTouchDevice && subDropdown.isOpen && subDropdown.type === 'rename-playlist' && (
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
                                <DropdownItem>
                                    <div className="playlist-input-container">
                                        <input
                                            value={renamePlaylistName}
                                            onChange={handleRenameInputChange}
                                            onKeyDown={handleRenameInputKeyDown}
                                            onClick={e => e.stopPropagation()}
                                            placeholder="Rename playlist..."
                                            className={`playlist-input${renamePlaylistName.trim() ? ' has-text' : ''}`}
                                            disabled={isRenamingPlaylist}
                                        />

                                        {isRenamingPlaylist && <InlineLoader />}

                                        {!isRenamingPlaylist && (
                                            <button className="create-btn" onClick={handleRenameClick}>
                                                Rename
                                            </button>
                                        )}
                                    </div>
                                </DropdownItem>
                            </div>
                        </div>
                    )}
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
                                {context?.item.ArtistItems?.map(artist => (
                                    <DropdownItem key={artist.Id} onClick={() => handleViewArtist(artist.Id)}>
                                        {artist.Name || 'Unknown Artist'}
                                    </DropdownItem>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ),
            view_artist: (
                <DropdownItem
                    className="view-artist"
                    onClick={() => handleViewArtist(context?.item.ArtistItems?.[0].Id)}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>View artist</span>
                </DropdownItem>
            ),
            view_album: (
                <DropdownItem
                    className="view-album"
                    onClick={() => context && handleViewAlbum(context.item)}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>View album</span>
                </DropdownItem>
            ),
            add_to_favorite: (
                <DropdownItem
                    className="add-favorite"
                    onClick={async () => {
                        if (!context) return

                        closeDropdown()
                        await addToFavorites(context.item)
                    }}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>Add to favorites</span>
                </DropdownItem>
            ),
            remove_from_favorite: (
                <DropdownItem
                    className="remove-favorite has-removable"
                    onClick={async () => {
                        if (!context) return

                        closeDropdown()
                        await removeFromFavorites(context.item)
                    }}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>Remove from favorites</span>
                </DropdownItem>
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
                                <DropdownItem>
                                    <div className="playlist-input-container">
                                        <input
                                            value={playlistName}
                                            onChange={handleInputChange}
                                            onKeyDown={handleInputKeyDown}
                                            onClick={e => e.stopPropagation()}
                                            placeholder="New..."
                                            className={`playlist-input${playlistName.trim() ? ' has-text' : ''}`}
                                            disabled={isCreatingPlaylist}
                                        />

                                        {isCreatingPlaylist && <InlineLoader />}

                                        {!isCreatingPlaylist && (
                                            <button className="create-btn" onClick={handleCreateClick}>
                                                Create
                                            </button>
                                        )}
                                    </div>
                                </DropdownItem>

                                {playlists.length > 0 && <div className="dropdown-separator" />}

                                {playlists.map(playlist => (
                                    <DropdownItem
                                        key={playlist.Id}
                                        onClick={async () => {
                                            if (!context) return

                                            closeDropdown()
                                            await addItemsToPlaylist(
                                                await expandItems(context.item, context.customContainer),
                                                playlist.Id
                                            )
                                        }}
                                    >
                                        {playlist.Name}
                                    </DropdownItem>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ),
            remove_from_playlist: context?.playlistId ? (
                <DropdownItem
                    className="remove-playlist has-removable"
                    onClick={async () => {
                        if (!context) return

                        closeDropdown()
                        await removeFromPlaylist(context.item, context.playlistId!)
                    }}
                    onMouseEnter={closeSubDropdown}
                >
                    <span>Remove from playlist</span>
                </DropdownItem>
            ) : null,
            download_song:
                context?.item.offlineState === 'downloaded' ? (
                    <DropdownItem
                        className="remove-song has-removable"
                        onClick={async () => {
                            if (!context) return

                            closeDropdown()
                            const containerItem = context.customContainer
                                ? await api.createCustomContainerMediaItem(context.customContainer)
                                : context.item.Type === BaseItemKind.Audio
                                ? undefined
                                : context.item
                            removeFromDownloads(await expandItems(context.item, context.customContainer), containerItem)
                        }}
                        onMouseEnter={closeSubDropdown}
                    >
                        <span>Unsync from cache</span>
                    </DropdownItem>
                ) : context?.item.offlineState === 'deleting' ? (
                    <DropdownItem className="disabled" onMouseEnter={closeSubDropdown} disabled>
                        <span>Unsyncing...</span>
                    </DropdownItem>
                ) : !context?.item.offlineState ? (
                    <DropdownItem
                        onClick={async () => {
                            if (!context) return

                            closeDropdown()
                            const containerItem = context.customContainer
                                ? await api.createCustomContainerMediaItem(context.customContainer)
                                : context.item.Type === BaseItemKind.Audio
                                ? undefined
                                : context.item
                            addToDownloads(await expandItems(context.item, context.customContainer), containerItem)
                        }}
                        onMouseEnter={closeSubDropdown}
                    >
                        <span>Sync to cache</span>
                    </DropdownItem>
                ) : (
                    <DropdownItem className="disabled" onMouseEnter={closeSubDropdown} disabled>
                        <span>Syncing...</span>
                    </DropdownItem>
                ),
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
        handleRemoveFromQueue,
        handleRenameClick,
        handleRenameInputChange,
        handleRenameInputKeyDown,
        handleViewAlbum,
        handleViewArtist,
        isCreatingPlaylist,
        isRenamingPlaylist,
        isTouchDevice,
        navigate,
        openSubDropdown,
        playlistName,
        playlists,
        removeFromDownloads,
        removeFromFavorites,
        removeFromPlaylist,
        renamePlaylistName,
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
            let items: ReactNode[] = []

            if (subDropdown.type === 'view-artists') {
                items =
                    context?.item.ArtistItems?.map(artist => (
                        <DropdownItem
                            key={artist.Id}
                            onClick={() => {
                                handleViewArtist(artist.Id)
                                // handleViewArtist already calls closeDropdown
                            }}
                        >
                            {artist.Name || 'Unknown Artist'}
                        </DropdownItem>
                    )) || []
            } else if (subDropdown.type === 'add-playlist') {
                items = [
                    <DropdownItem key="playlist-input-item">
                        <div className="playlist-input-container">
                            <input
                                value={playlistName}
                                onChange={handleInputChange}
                                onKeyDown={handleInputKeyDown} // Calls closeDropdown on Enter
                                onClick={e => e.stopPropagation()}
                                placeholder="New..."
                                className={`playlist-input${playlistName.trim() ? ' has-text' : ''}`}
                                disabled={isCreatingPlaylist}
                            />

                            {isCreatingPlaylist && <InlineLoader />}

                            {!isCreatingPlaylist && (
                                <button className="create-btn" onClick={handleCreateClick}>
                                    Create
                                </button>
                            )}
                        </div>
                    </DropdownItem>,
                    ...(playlists.length > 0 ? [<div key="playlist-separator" className="dropdown-separator" />] : []),
                    ...playlists.map(playlist => (
                        <DropdownItem
                            key={playlist.Id}
                            onClick={async () => {
                                if (!context) return

                                closeDropdown()
                                await addItemsToPlaylist(
                                    await expandItems(context.item, context.customContainer),
                                    playlist.Id
                                )
                            }}
                        >
                            {playlist.Name}
                        </DropdownItem>
                    )),
                ]
            } else if (subDropdown.type === 'rename-playlist') {
                items = [
                    <DropdownItem key="rename-playlist-input-item">
                        <div className="playlist-input-container">
                            <input
                                value={renamePlaylistName}
                                onChange={handleRenameInputChange}
                                onKeyDown={handleRenameInputKeyDown} // Calls closeDropdown on Enter
                                onClick={e => e.stopPropagation()}
                                placeholder="Rename playlist..."
                                className={`playlist-input${renamePlaylistName.trim() ? ' has-text' : ''}`}
                                disabled={isRenamingPlaylist}
                            />

                            {isRenamingPlaylist && <InlineLoader />}

                            {!isRenamingPlaylist && (
                                <button className="create-btn" onClick={handleRenameClick}>
                                    Rename
                                </button>
                            )}
                        </div>
                    </DropdownItem>,
                ]
            }
            return items
        }

        const renderDropdownItems = () => {
            const menuItemz: { isVisible: boolean; node: ReactNode }[][] = [
                [
                    {
                        isVisible:
                            !hidden?.next &&
                            (context?.item.Type === BaseItemKind.Audio ||
                                context?.item.Type === BaseItemKind.MusicAlbum ||
                                context?.item.Type === BaseItemKind.MusicArtist ||
                                context?.item.Type === BaseItemKind.MusicGenre ||
                                context?.customContainer === 'favorites'),
                        node: menuItems.next,
                    },
                    {
                        isVisible:
                            !hidden?.add_to_queue &&
                            (context?.item.Type === BaseItemKind.Audio ||
                                context?.item.Type === BaseItemKind.MusicAlbum ||
                                context?.item.Type === BaseItemKind.MusicArtist ||
                                context?.item.Type === BaseItemKind.MusicGenre ||
                                context?.customContainer === 'favorites'),
                        node: menuItems.add_to_queue,
                    },
                    {
                        isVisible:
                            !!hidden?.add_to_queue &&
                            !hidden?.remove_from_queue &&
                            (context?.item.Type === BaseItemKind.Audio ||
                                context?.item.Type === BaseItemKind.MusicAlbum ||
                                context?.item.Type === BaseItemKind.MusicArtist ||
                                context?.item.Type === BaseItemKind.MusicGenre ||
                                context?.customContainer === 'favorites'),
                        node: menuItems.remove_from_queue,
                    },
                    {
                        isVisible: !hidden?.instant_mix,
                        node: menuItems.instant_mix,
                    },
                ],
                [
                    {
                        isVisible: !hidden?.view_artists && (context?.item.ArtistItems?.length || 0) > 1,
                        node: menuItems.view_artists,
                    },
                    {
                        isVisible: !hidden?.view_artist && context?.item.ArtistItems?.length === 1,
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
                        isVisible: !hidden?.add_to_favorite && !context?.item.UserData?.IsFavorite,
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
                                context?.item.Type === BaseItemKind.MusicArtist ||
                                context?.item.Type === BaseItemKind.MusicGenre ||
                                context?.customContainer === 'favorites'),
                        node: menuItems.add_to_playlist,
                    },
                    {
                        isVisible: !hidden?.rename_playlist && context?.item.Type === BaseItemKind.Playlist,
                        node: menuItems.rename_playlist,
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
                                context?.item.Type === BaseItemKind.Playlist ||
                                context?.item.Type === BaseItemKind.MusicGenre ||
                                !!context?.customContainer),
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
                <div className="dropdown-menu" style={isInteractionBlocked ? { pointerEvents: 'none' } : undefined}>
                    {isTouchDevice && context && (
                        <div className="dropdown-header">
                            <div
                                className={`container ${
                                    context.item.Type === BaseItemKind.Audio
                                        ? 'track'
                                        : context.item.Type === BaseItemKind.MusicAlbum
                                        ? 'album'
                                        : context.item.Type === BaseItemKind.MusicArtist
                                        ? 'artist'
                                        : context.item.Type === BaseItemKind.Playlist
                                        ? 'playlist'
                                        : context.item.Type === BaseItemKind.MusicGenre
                                        ? 'genre'
                                        : 'unknown'
                                }`}
                            >
                                <Squircle
                                    width={36}
                                    height={36}
                                    cornerRadius={6}
                                    className="thumbnail"
                                    useSquircle={context.item.Type !== BaseItemKind.MusicArtist}
                                >
                                    {context.item && (
                                        <>
                                            {context.item.Id === 'JMA_CUSTOM_FAVORITES' && (
                                                <div className="art">
                                                    <HeartFillIcon size={16} />
                                                </div>
                                            )}

                                            {context.item.Id !== 'JMA_CUSTOM_FAVORITES' && (
                                                <JellyImg
                                                    data-fav={context.item.Id}
                                                    item={context.item}
                                                    type={'Primary'}
                                                    width={36}
                                                    height={36}
                                                />
                                            )}
                                        </>
                                    )}

                                    {!context.item && (
                                        <div className="fallback-thumbnail">
                                            <TracksIcon width="50%" height="50%" />
                                        </div>
                                    )}
                                </Squircle>
                                <div className="info">
                                    <div className="title">
                                        <div className="text" title={context.item.Name || 'Unknown'}>
                                            {context.item.Name || 'Unknown'}
                                        </div>
                                        {context.item.UserData?.IsFavorite && (
                                            <span className="favorited" title="Favorited">
                                                <HeartFillIcon size={12} />
                                            </span>
                                        )}
                                    </div>
                                    {context.item.Type !== BaseItemKind.MusicArtist &&
                                        context.item.Type !== BaseItemKind.MusicGenre &&
                                        context.item.Id !== 'JMA_CUSTOM_FAVORITES' && (
                                            <div className="desc">
                                                {context.item.Type === BaseItemKind.Audio
                                                    ? context.item.Artists?.join(', ') || 'Unknown Artist'
                                                    : context.item.Type === BaseItemKind.MusicAlbum
                                                    ? context.item.AlbumArtist || 'Unknown Artist'
                                                    : context.item.Type === BaseItemKind.Playlist
                                                    ? `${context.item.ChildCount || 0} Track${
                                                          context.item.ChildCount === 1 ? '' : 's'
                                                      }`
                                                    : 'Unknown'}
                                            </div>
                                        )}
                                </div>
                            </div>
                            <div className="actions">
                                {subDropdown.isOpen && (
                                    <div className="back icon" onClick={closeSubDropdown}>
                                        <ArrowLeftIcon size={16} />
                                    </div>
                                )}
                                <div className="close icon" onClick={closeDropdown}>
                                    <XIcon size={16} />
                                </div>
                            </div>
                        </div>
                    )}
                    {isTouchDevice && subDropdown.isOpen ? (
                        <>
                            <div className="dropdown-separator" />
                            {renderMobileSubMenuItems()}
                        </>
                    ) : (
                        renderDropdownItems()
                    )}
                </div>
            </div>
        )
    }, [
        addItemsToPlaylist,
        closeDropdown,
        closeSubDropdown,
        context,
        expandItems,
        handleCreateClick,
        handleInputChange,
        handleInputKeyDown,
        handleRenameClick,
        handleRenameInputChange,
        handleRenameInputKeyDown,
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
        hidden?.remove_from_queue,
        hidden?.rename_playlist,
        hidden?.view_album,
        hidden?.view_artist,
        hidden?.view_artists,
        isCreatingPlaylist,
        isInteractionBlocked,
        isOpen,
        isRenamingPlaylist,
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
        menuItems.remove_from_queue,
        menuItems.rename_playlist,
        menuItems.view_album,
        menuItems.view_artist,
        menuItems.view_artists,
        playlistName,
        playlists,
        position.x,
        position.y,
        renamePlaylistName,
        subDropdown.isOpen,
        subDropdown.type,
    ])

    const touchTimeoutRef = useRef<number | null>(null)

    const clearTouchTimer = useCallback(() => {
        if (touchTimeoutRef.current !== null) {
            clearTimeout(touchTimeoutRef.current)
            touchTimeoutRef.current = null
        }
    }, [])

    const handleTouchStart = useCallback(
        (e: React.TouchEvent<HTMLElement>, context: IContext, ignoreMargin = false, hidden: IMenuItems = {}) => {
            if ((e.target as HTMLElement).closest('.draggable')) {
                return
            }

            e.preventDefault()
            clearTouchTimer()
            touchTimeoutRef.current = window.setTimeout(() => {
                const touch = e.touches[0]
                const x = touch.clientX
                const y = touch.clientY + window.pageYOffset
                openDropdown(e, context, x, y, ignoreMargin)
                setHidden(hidden)
            }, 400)
        },
        [clearTouchTimer, openDropdown]
    )

    return {
        isOpen,
        position,
        selectedItem: context?.item,
        menuItems,
        subDropdown,
        isTouchDevice,
        closeDropdown,
        openSubDropdown,
        closeSubDropdown,
        onContextMenu: (
            e: React.MouseEvent<HTMLElement, MouseEvent>,
            context: IContext,
            ignoreMargin = false,
            hidden: IMenuItems = {}
        ) => {
            if ((e.target as HTMLElement).closest('.draggable')) {
                return
            }

            e.preventDefault()
            const x = e.clientX
            const y = e.clientY + window.pageYOffset
            openDropdown(e, context, x, y, ignoreMargin)
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
