import {
    closestCenter,
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { HeartFillIcon } from '@primer/octicons-react'
import { InfiniteData } from '@tanstack/react-query'
import { ReactNode, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MediaItem } from '../api/jellyfin'
import { useDownloadContext } from '../context/DownloadContext/DownloadContext'
import { useDropdownContext } from '../context/DropdownContext/DropdownContext'
import { IMenuItems } from '../context/DropdownContext/DropdownContextProvider'
import { usePlaybackContext } from '../context/PlaybackContext/PlaybackContext'
import { useDisplayItems } from '../hooks/useDisplayItems'
import { formatDateYear } from '../utils/formatDate'
import { JellyImg } from './JellyImg'
import { Loader } from './Loader'
import { IReviver } from './PlaybackManager'
import { Skeleton } from './Skeleton'
import { Squircle } from './Squircle'
import { DeletingIcon, DownloadedIcon, DownloadingIcon, PlaystateAnimationMedalist } from './SvgIcons'
import { VirtuosoWindow } from './VirtuosoWindow'

export const MediaList = ({
    items = [],
    infiniteData = { pageParams: [], pages: [] },
    indexOffset = 0,
    isLoading,
    type,
    title,
    disableUrl,
    reviver,
    loadMore,
    hidden: _hidden = {},
    disableActions = false,
    albumDisplayMode = 'artist',
    isDraggable,
    removeButton,
    disableEvents = false,
    className,
    preferItemType = false,
}: {
    items: MediaItem[] | undefined
    infiniteData: InfiniteData<MediaItem[], unknown> | undefined
    indexOffset?: number
    isLoading: boolean
    type: 'song' | 'album' | 'artist' | 'playlist' | 'genre'
    title: string
    disableUrl?: boolean
    reviver?: IReviver | 'persistAll'
    loadMore?: () => void
    hidden?: IMenuItems
    disableActions?: boolean
    albumDisplayMode?: 'artist' | 'year' | 'both'
    isDraggable?: boolean
    removeButton?: (item: MediaItem) => ReactNode
    disableEvents?: boolean
    className?: string
    preferItemType?: boolean
}) => {
    const playback = usePlaybackContext()
    const navigate = useNavigate()
    const location = useLocation()
    const { displayItems, setRowRefs } = useDisplayItems(items, isLoading)

    const hidden: IMenuItems = disableActions
        ? {
              ..._hidden,
              add_to_favorite: true,
              remove_from_favorite: true,
              add_to_playlist: true,
              remove_from_playlist: true,
          }
        : _hidden

    const dropdown = useDropdownContext()

    const [activeId, setActiveId] = useState<string | null>(null)

    const getItemType = (item: MediaItem | { isPlaceholder: true } | undefined): typeof type => {
        if (!preferItemType || !item || 'isPlaceholder' in item) {
            return type
        }

        if (item.Type === 'Audio') return 'song'
        if (item.Type === 'MusicAlbum') return 'album'
        if (item.Type === 'MusicArtist') return 'artist'
        if (item.Type === 'Playlist') return 'playlist'
        if (item.Type === 'MusicGenre') return 'genre'

        return type
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex(i => (i.queueId || i.Id) === active.id)
            const newIndex = items.findIndex(i => (i.queueId || i.Id) === over.id)

            if (oldIndex !== -1 && newIndex !== -1) {
                const globalOldIndex = indexOffset + oldIndex
                const globalNewIndex = indexOffset + newIndex
                playback.moveItemInPlaylist(globalOldIndex, globalNewIndex)

                // Force update the display items
                const updated = Array.from(items)
                const [moved] = updated.splice(oldIndex, 1)
                updated.splice(newIndex, 0, moved)
                displayItems.length = 0
                displayItems.push(...updated)
            }
        }

        setActiveId(null)
    }

    const handleDragStart = ({ active }: DragStartEvent) => {
        setActiveId(active.id as string)
    }

    const isEqual = (a?: MediaItem, b?: MediaItem) => {
        if (!a || !b) return false

        return isDraggable && a.queueId && b.queueId ? a.queueId === b.queueId : a.Id === b.Id
    }

    const handleSongClick = (item: MediaItem, index: number) => {
        const itemType = getItemType(item)
        if (itemType === 'song') {
            if (isEqual(playback.currentTrack, item)) {
                playback.togglePlayPause()
            } else {
                if (playback.setCurrentPlaylist({ pages: infiniteData, title, disableUrl, reviver })) {
                    playback.playTrack(indexOffset + index)
                }
            }
        }
    }

    const renderItem = (
        index: number,
        item: MediaItem | { isPlaceholder: true } | undefined,
        listeners?: SyntheticListenerMap | undefined
    ) => {
        const itemType = getItemType(item)

        if (!item || 'isPlaceholder' in item) {
            if (itemType === 'album') {
                return (
                    <div className={`media-item album-item ${className || ''}`} ref={el => setRowRefs(index, el)}>
                        <Skeleton type="album" />
                    </div>
                )
            } else if (itemType === 'artist') {
                return (
                    <div className={`media-item artist-item ${className || ''}`} ref={el => setRowRefs(index, el)}>
                        <Skeleton type="artist" />
                    </div>
                )
            } else if (itemType === 'playlist') {
                return (
                    <div className={`media-item album-item ${className || ''}`} ref={el => setRowRefs(index, el)}>
                        <Skeleton type="album" />
                    </div>
                )
            } else if (itemType === 'genre') {
                return (
                    <div className={`media-item genre-item ${className || ''}`} ref={el => setRowRefs(index, el)}>
                        <Skeleton type="genre" />
                    </div>
                )
            } else {
                return (
                    <div className={`media-item song-item ${className || ''}`} ref={el => setRowRefs(index, el)}>
                        <Skeleton type="song" />
                    </div>
                )
            }
        }

        const isActive = isEqual(dropdown.selectedItem, item) && dropdown.isOpen

        const itemClass = [
            itemType === 'song' && isEqual(playback.currentTrack, item)
                ? playback.isPlaying
                    ? 'playing'
                    : 'paused'
                : '',
            isActive ? 'active' : '',
        ]
            .filter(Boolean)
            .join(' ')

        if (itemType === 'album') {
            return (
                <div
                    className={`media-item album-item ${itemClass} ${className || ''}`}
                    ref={el => setRowRefs(index, el)}
                    {...(disableEvents
                        ? {}
                        : {
                              onClick: () => navigate(`/album/${item.Id}`),
                              onContextMenu: e =>
                                  dropdown.onContextMenu(
                                      e,
                                      { item, sourceTitle: item.Name, sourceUrl: `/album/${item.Id}` },
                                      false,
                                      hidden
                                  ),
                              onTouchStart: e =>
                                  dropdown.onTouchStart(
                                      e,
                                      { item, sourceTitle: item.Name, sourceUrl: `/album/${item.Id}` },
                                      false,
                                      hidden
                                  ),
                              onTouchMove: dropdown.onTouchClear,
                              onTouchEnd: dropdown.onTouchClear,
                          })}
                >
                    <Squircle width={46} height={46} cornerRadius={6} className="media-state">
                        <JellyImg item={item} type={'Primary'} width={46} height={46} />
                    </Squircle>
                    <div className="media-details">
                        <span className="song-name">{item.Name}</span>
                        <div className="container">
                            {albumDisplayMode === 'year' && (
                                <div className="year">{formatDateYear(item.PremiereDate)}</div>
                            )}
                            {albumDisplayMode === 'artist' && (
                                <div className="artist">{item.AlbumArtist || 'Unknown Artist'}</div>
                            )}
                            {albumDisplayMode === 'both' && (
                                <>
                                    <div className="year">{formatDateYear(item.PremiereDate)}</div>
                                    <div className="divider"></div>
                                    <div className="artist">{item.AlbumArtist || 'Unknown Artist'}</div>
                                </>
                            )}
                        </div>
                    </div>

                    <MediaIndicators
                        item={item}
                        disableActions={disableActions}
                        listeners={listeners}
                        isDraggable={isDraggable}
                        removeButton={removeButton}
                    />
                </div>
            )
        } else if (itemType === 'artist') {
            return (
                <div
                    className={`media-item artist-item ${itemClass} ${className || ''}`}
                    ref={el => setRowRefs(index, el)}
                    {...(disableEvents
                        ? {}
                        : {
                              onClick: () => navigate(`/artist/${item.Id}`),
                              onContextMenu: e =>
                                  dropdown.onContextMenu(
                                      e,
                                      { item, sourceTitle: item.Name, sourceUrl: `/artist/${item.Id}` },
                                      false,
                                      hidden
                                  ),
                              onTouchStart: e =>
                                  dropdown.onTouchStart(
                                      e,
                                      { item, sourceTitle: item.Name, sourceUrl: `/artist/${item.Id}` },
                                      false,
                                      hidden
                                  ),
                              onTouchMove: dropdown.onTouchClear,
                              onTouchEnd: dropdown.onTouchClear,
                          })}
                >
                    <div className="media-state">
                        <JellyImg item={item} type={'Primary'} width={36} height={36} />
                    </div>
                    <div className="media-details">
                        <div className="song-name">{item.Name || 'Unknown Artist'}</div>
                    </div>

                    <MediaIndicators
                        item={item}
                        disableActions={disableActions}
                        listeners={listeners}
                        isDraggable={isDraggable}
                        removeButton={removeButton}
                    />
                </div>
            )
        } else if (itemType === 'playlist') {
            return (
                <div
                    className={`media-item playlist-item ${itemClass} ${className || ''}`}
                    ref={el => setRowRefs(index, el)}
                    {...(disableEvents
                        ? {}
                        : {
                              onClick: () => navigate(`/playlist/${item.Id}`),
                              onContextMenu: e =>
                                  dropdown.onContextMenu(
                                      e,
                                      { item, sourceTitle: item.Name, sourceUrl: `/playlist/${item.Id}` },
                                      false,
                                      hidden
                                  ),
                              onTouchStart: e =>
                                  dropdown.onTouchStart(
                                      e,
                                      { item, sourceTitle: item.Name, sourceUrl: `/playlist/${item.Id}` },
                                      false,
                                      hidden
                                  ),
                              onTouchMove: dropdown.onTouchClear,
                              onTouchEnd: dropdown.onTouchClear,
                          })}
                >
                    <Squircle width={46} height={46} cornerRadius={6} className="media-state">
                        <JellyImg item={item} type={'Primary'} width={46} height={46} />
                    </Squircle>
                    <div className="media-details">
                        <span className="song-name">{item.Name}</span>
                        <div className="container">
                            <div className="track-amount">
                                <span className="number">{item.ChildCount || 0}</span>{' '}
                                <span>{(item.ChildCount || 0) === 1 ? 'Track' : 'Tracks'}</span>
                            </div>
                        </div>
                    </div>

                    <MediaIndicators
                        item={item}
                        disableActions={disableActions}
                        listeners={listeners}
                        isDraggable={isDraggable}
                        removeButton={removeButton}
                    />
                </div>
            )
        } else if (itemType === 'genre') {
            return (
                <div
                    className={`media-item genre-item ${itemClass} ${className || ''}`}
                    ref={el => setRowRefs(index, el)}
                    {...(disableEvents
                        ? {}
                        : {
                              onClick: () => navigate(`/genre/${encodeURIComponent(item.Name || '')}`),
                              onContextMenu: e =>
                                  dropdown.onContextMenu(
                                      e,
                                      {
                                          item,
                                          sourceTitle: item.Name,
                                          sourceUrl: `/genre/${encodeURIComponent(item.Name || '')}`,
                                      },
                                      false,
                                      hidden
                                  ),
                              onTouchStart: e =>
                                  dropdown.onTouchStart(
                                      e,
                                      {
                                          item,
                                          sourceTitle: item.Name,
                                          sourceUrl: `/genre/${encodeURIComponent(item.Name || '')}`,
                                      },
                                      false,
                                      hidden
                                  ),
                              onTouchMove: dropdown.onTouchClear,
                              onTouchEnd: dropdown.onTouchClear,
                          })}
                >
                    <Squircle width={36} height={36} cornerRadius={8} className="media-state">
                        <JellyImg item={item} type={'Primary'} width={36} height={36} />
                    </Squircle>
                    <div className="media-details">
                        <span className="song-name">{item.Name || 'Unknown Genre'}</span>
                    </div>

                    <MediaIndicators
                        item={item}
                        disableActions={disableActions}
                        listeners={listeners}
                        isDraggable={isDraggable}
                        removeButton={removeButton}
                    />
                </div>
            )
        } else {
            return (
                <div
                    className={`media-item song-item ${itemClass} ${className || ''}`}
                    ref={el => setRowRefs(index, el)}
                    {...(disableEvents
                        ? {}
                        : {
                              onClick: () => handleSongClick(item, index),
                              onContextMenu: e =>
                                  dropdown.onContextMenu(
                                      e,
                                      { item, sourceTitle: title, sourceUrl: location.pathname },
                                      false,
                                      hidden
                                  ),
                              onTouchStart: e =>
                                  dropdown.onTouchStart(
                                      e,
                                      { item, sourceTitle: title, sourceUrl: location.pathname },
                                      false,
                                      hidden
                                  ),
                              onTouchMove: dropdown.onTouchClear,
                              onTouchEnd: dropdown.onTouchClear,
                          })}
                >
                    <Squircle width={46} height={46} cornerRadius={6} className="media-state">
                        <JellyImg item={item} type={'Primary'} width={46} height={46} />

                        <div className="overlay">
                            <div className="container">
                                <div className="play">
                                    <div className="play-icon"></div>
                                </div>
                                <div className="pause">
                                    <div className="pause-icon"></div>
                                </div>
                            </div>
                            <div className="play-state-animation">
                                <PlaystateAnimationMedalist width={28} height={20} className="sound-bars" />
                            </div>
                        </div>
                    </Squircle>
                    <div className="media-details">
                        <span className="song-name">{item.Name}</span>
                        <div className="container">
                            <div className="artist">
                                {item.Artists && item.Artists.length > 0 ? item.Artists.join(', ') : 'Unknown Artist'}
                            </div>
                            <div className="divider"></div>
                            <div className="album">{item.Album || 'Unknown Album'}</div>
                        </div>
                    </div>

                    <MediaIndicators
                        item={item}
                        disableActions={disableActions}
                        listeners={listeners}
                        isDraggable={isDraggable}
                        removeButton={removeButton}
                    />
                </div>
            )
        }
    }

    if (isLoading && items.length === 0) {
        return <Loader />
    }

    if (items.length === 0 && !isLoading) {
        return (
            <div className="empty">
                {type === 'song'
                    ? 'No tracks were found'
                    : type === 'album'
                      ? 'No albums were found'
                      : type === 'artist'
                        ? 'No artists were found'
                        : type === 'playlist'
                          ? 'No playlists were found'
                          : 'No genres were found'}
            </div>
        )
    }

    return (
        <ul className="media-list noSelect">
            {isDraggable && (
                <DraggableVirtuoso
                    handleDragStart={handleDragStart}
                    handleDragEnd={handleDragEnd}
                    items={items}
                    renderItem={renderItem}
                    activeId={activeId}
                >
                    <VirtuosoWindow
                        data={displayItems}
                        itemContent={(index, item) => {
                            if ('isPlaceholder' in item) {
                                return renderItem(index, item)
                            }

                            return (
                                <SortableItem
                                    key={item.queueId || item.Id}
                                    id={item.queueId || item.Id}
                                    cb={({ listeners }) => renderItem(index, item, listeners)}
                                />
                            )
                        }}
                        endReached={loadMore}
                        overscan={800}
                    />
                </DraggableVirtuoso>
            )}

            {!isDraggable && (
                <VirtuosoWindow data={displayItems} itemContent={renderItem} endReached={loadMore} overscan={800} />
            )}
        </ul>
    )
}

const DraggableVirtuoso = ({
    handleDragStart,
    handleDragEnd,
    items,
    renderItem,
    activeId,
    children,
}: {
    handleDragStart: (event: DragStartEvent) => void
    handleDragEnd: (event: DragEndEvent) => void
    items: MediaItem[]
    renderItem: (index: number, item: MediaItem | { isPlaceholder: true }) => React.ReactNode
    activeId: string | null
    children: React.ReactNode
}) => {
    const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor))

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
        >
            <SortableContext items={items.map(i => i.queueId || i.Id)} strategy={verticalListSortingStrategy}>
                {children}
            </SortableContext>
            <DragOverlay className="drag-overlay">
                {activeId
                    ? renderItem(
                          items.findIndex(i => (i.queueId || i.Id) === activeId),
                          items.find(i => (i.queueId || i.Id) === activeId) || { isPlaceholder: true }
                      )
                    : null}
            </DragOverlay>
        </DndContext>
    )
}

const SortableItem = ({
    id,
    cb,
}: {
    id: string
    cb: (props: { listeners: SyntheticListenerMap | undefined }) => ReactNode
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        zIndex: isDragging ? 999 : undefined,
        opacity: isDragging ? 0 : 1,
    }

    const memoCb = useMemo(() => cb({ listeners }), [listeners, cb])

    return (
        <li ref={setNodeRef} className={isDragging ? 'active' : ''} style={style} {...attributes}>
            {memoCb}
        </li>
    )
}

export const DownloadIndicators = ({
    offlineState,
    size,
    itemId,
}: {
    offlineState: string | undefined
    size: number
    itemId: string | undefined
}) => {
    const { queue } = useDownloadContext()
    const isActiveInQueue = queue[0]?.mediaItem.Id === itemId || queue[0]?.containerId === itemId

    if (!offlineState) {
        return null
    }

    return (
        <div className="download-state">
            {offlineState === 'downloading' && (
                <div className={`icon downloading ${isActiveInQueue ? 'active-sync' : ''}`} title="Syncing...">
                    <DownloadingIcon width={size} height={size} />
                </div>
            )}

            {offlineState === 'downloaded' && (
                <div className="icon downloaded" title="Synced">
                    <DownloadedIcon width={size} height={size} />
                </div>
            )}

            {offlineState === 'deleting' && (
                <div className={`icon deleting ${isActiveInQueue ? 'active-sync' : ''}`} title="Unsyncing...">
                    <DeletingIcon width={size} height={size} />
                </div>
            )}
        </div>
    )
}

const MediaIndicators = ({
    item,
    disableActions,
    listeners,
    isDraggable,
    removeButton,
}: {
    item: MediaItem
    disableActions: boolean
    listeners?: SyntheticListenerMap | undefined
    isDraggable?: boolean
    removeButton?: (item: MediaItem) => ReactNode
}) => {
    return (
        <div className="media-indicators">
            {removeButton && removeButton(item)}

            <DownloadIndicators offlineState={item.offlineState} size={16} itemId={item.Id} />

            {!disableActions && item.UserData?.IsFavorite && location.pathname !== '/favorites' && (
                <div className="favorited" title="Favorited">
                    <HeartFillIcon size={16} />
                </div>
            )}

            {isDraggable && (
                <div className="draggable" title="Drag" {...listeners}>
                    <div className="grid">
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                    </div>
                </div>
            )}
        </div>
    )
}
