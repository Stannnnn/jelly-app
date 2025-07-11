import { Component } from 'react'

interface IconProps {
    width?: number | string
    height?: number | string
    className?: string
}

export class AlbumIcon extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16.1328 15.7715"
                width={width}
                height={height}
                className={className}
            >
                <g>
                    <rect height="15.7715" opacity="0" width="16.1328" x="0" y="0" />
                    <path d="M15.7715 7.88086C15.7715 12.2266 12.2363 15.7617 7.88086 15.7617C3.53516 15.7617 0 12.2266 0 7.88086C0 3.53516 3.53516 0 7.88086 0C12.2363 0 15.7715 3.53516 15.7715 7.88086ZM4.75586 7.87109C4.75586 9.59961 6.15234 10.9961 7.88086 10.9961C9.61914 10.9961 11.0156 9.59961 11.0156 7.87109C11.0156 6.14258 9.61914 4.73633 7.88086 4.73633C6.15234 4.73633 4.75586 6.14258 4.75586 7.87109Z" />
                    <circle className="spindle-hole" cx="7.88086" cy="7.87109" r="1.5" />
                </g>
            </svg>
        )
    }
}

export class TrackIcon extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 9.90234 15.9277"
                width={width}
                height={height}
                className={className}
            >
                <g>
                    <rect height="15.9277" opacity="0" width="9.90234" x="0" y="0" />
                    <path d="M9.54102 3.88672L9.54102 0.966797C9.54102 0.546875 9.19922 0.263672 8.7793 0.351562L4.75586 1.23047C4.22852 1.34766 3.94531 1.62109 3.94531 2.08008L3.94531 10.6738C3.99414 11.0254 3.82812 11.25 3.51562 11.3086L2.29492 11.5625C0.732422 11.8945 0 12.6953 0 13.8867C0 15.0879 0.927734 15.9277 2.22656 15.9277C3.36914 15.9277 5.08789 15.0781 5.08789 12.8125L5.08789 5.74219C5.08789 5.35156 5.15625 5.29297 5.49805 5.22461L9.10156 4.42383C9.36523 4.36523 9.54102 4.16016 9.54102 3.88672Z" />
                </g>
            </svg>
        )
    }
}

export class TracksIcon extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 38 48"
                role="presentation"
                focusable="false"
                width={width}
                height={height}
                className={className}
            >
                <path d="M36.15 0c-.18.02-1.76.3-1.95.33l-19.7 3.7c-.58.13-1.03.32-1.37.6a2.1 2.1 0 0 0-.74 1.36c-.02.12-.05.36-.05.72v26.81c0 1.18-.9 2.16-2.1 2.38l-5.27.86A6 6 0 0 0 0 42.57C0 45.63 2.6 48 5.64 48c.37 0 .74-.04 1.11-.1l1.82-.36a7.13 7.13 0 0 0 5.8-7.08V17.25c0-1.22.4-1.54 1.42-1.78 0 0 17.52-3.52 18.37-3.68.22-.04.43-.07.61-.07.78 0 1.17.4 1.17 1.36v15.47c0 1.18-.89 2.16-2.1 2.39l-4.86.95c-3.1.55-5.35 2.97-5.35 5.77 0 3.04 2.8 5.4 6.08 5.4.4 0 .8-.03 1.2-.1l1.96-.35c4.23-1.2 5.13-5.07 5.13-7.75v-33C38 .74 37.41 0 36.36 0h-.2z" />
            </svg>
        )
    }
}

export class ArtistsIcon extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16.1328 15.7715"
                width={width}
                height={height}
                className={className}
            >
                <g>
                    <rect height="15.7715" opacity="0" width="16.1328" x="0" y="0" />
                    <path d="M7.88086 15.7617C12.2363 15.7617 15.7715 12.2363 15.7715 7.88086C15.7715 3.52539 12.2363 0 7.88086 0C3.53516 0 0 3.52539 0 7.88086C0 12.2363 3.53516 15.7617 7.88086 15.7617ZM7.88086 14.2773C4.3457 14.2773 1.49414 11.416 1.49414 7.88086C1.49414 4.3457 4.3457 1.48438 7.88086 1.48438C11.416 1.48438 14.2773 4.3457 14.2773 7.88086C14.2773 11.416 11.416 14.2773 7.88086 14.2773ZM13.1445 12.959L13.1152 12.8613C12.7637 11.7188 10.7227 10.5078 7.88086 10.5078C5.03906 10.5078 3.00781 11.7188 2.65625 12.8613L2.62695 12.959C4.02344 14.3164 6.50391 15.0879 7.88086 15.0879C9.26758 15.0879 11.748 14.3164 13.1445 12.959ZM7.88086 9.21875C9.35547 9.23828 10.5176 7.97852 10.5176 6.32812C10.5176 4.77539 9.35547 3.49609 7.88086 3.49609C6.41602 3.49609 5.24414 4.77539 5.25391 6.32812C5.26367 7.97852 6.40625 9.19922 7.88086 9.21875Z" />
                </g>
            </svg>
        )
    }
}

export class PlaylistIcon extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16.1523 15.9277"
                width={width}
                height={height}
                className={className}
            >
                <g>
                    <rect height="15.9277" opacity="0" width="16.1523" x="0" y="0" />
                    <path d="M0.585938 9.82422L7.33398 9.82422C7.66602 9.82422 7.91992 9.57031 7.91992 9.23828C7.91992 8.92578 7.65625 8.66211 7.33398 8.66211L0.585938 8.66211C0.263672 8.66211 0 8.92578 0 9.23828C0 9.57031 0.253906 9.82422 0.585938 9.82422Z" />
                    <path d="M0.585938 7.06055L7.33398 7.06055C7.66602 7.06055 7.91992 6.79688 7.91992 6.47461C7.91992 6.15234 7.65625 5.89844 7.33398 5.89844L0.585938 5.89844C0.263672 5.89844 0 6.15234 0 6.47461C0 6.79688 0.253906 7.06055 0.585938 7.06055Z" />
                    <path d="M0.585938 4.30664L7.33398 4.30664C7.65625 4.30664 7.91992 4.04297 7.91992 3.7207C7.91992 3.39844 7.65625 3.13477 7.33398 3.13477L0.585938 3.13477C0.263672 3.13477 0 3.39844 0 3.7207C0 4.04297 0.263672 4.30664 0.585938 4.30664Z" />
                    <path d="M15.791 3.88672L15.791 0.966797C15.791 0.546875 15.4492 0.263672 15.0391 0.351562L11.0059 1.23047C10.4785 1.34766 10.1953 1.62109 10.1953 2.08008L10.1953 10.6738C10.2441 11.0254 10.0781 11.25 9.77539 11.3086L8.55469 11.5625C6.98242 11.8945 6.25 12.6953 6.25 13.8867C6.25 15.0879 7.17773 15.9277 8.47656 15.9277C9.61914 15.9277 11.3477 15.0781 11.3477 12.8125L11.3477 5.74219C11.3477 5.35156 11.4062 5.29297 11.748 5.22461L15.3516 4.42383C15.625 4.36523 15.791 4.16016 15.791 3.88672Z" />
                </g>
            </svg>
        )
    }
}

export class SearchIcon extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 15.4395 15.2246"
                width={width}
                height={height}
                className={className}
            >
                <g>
                    <rect height="15.2246" opacity="0" width="15.4395" x="0" y="0" />
                    <path d="M0 6.21094C0 9.63867 2.7832 12.4121 6.21094 12.4121C7.5293 12.4121 8.74023 12.002 9.74609 11.2988L13.3789 14.9414C13.584 15.1367 13.8379 15.2246 14.1016 15.2246C14.668 15.2246 15.0781 14.7949 15.0781 14.2285C15.0781 13.9551 14.9707 13.7109 14.8047 13.5254L11.1914 9.90234C11.9629 8.86719 12.4121 7.59766 12.4121 6.21094C12.4121 2.7832 9.63867 0 6.21094 0C2.7832 0 0 2.7832 0 6.21094ZM1.50391 6.21094C1.50391 3.60352 3.60352 1.50391 6.21094 1.50391C8.80859 1.50391 10.918 3.60352 10.918 6.21094C10.918 8.80859 8.80859 10.918 6.21094 10.918C3.60352 10.918 1.50391 8.80859 1.50391 6.21094Z" />
                </g>
            </svg>
        )
    }
}

export class SearchClearIcon extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16.1328 15.7715"
                width={width}
                height={height}
                className={className}
            >
                <g>
                    <rect height="15.7715" opacity="0" width="16.1328" x="0" y="0" />
                    <path d="M15.7715 7.88086C15.7715 12.2266 12.2363 15.7617 7.88086 15.7617C3.53516 15.7617 0 12.2266 0 7.88086C0 3.53516 3.53516 0 7.88086 0C12.2363 0 15.7715 3.53516 15.7715 7.88086ZM9.98047 4.80469L7.88086 6.88477L5.81055 4.81445C5.67383 4.6875 5.51758 4.61914 5.3125 4.61914C4.92188 4.61914 4.59961 4.92188 4.59961 5.33203C4.59961 5.51758 4.67773 5.69336 4.80469 5.83008L6.86523 7.89062L4.80469 9.95117C4.67773 10.0879 4.59961 10.2637 4.59961 10.4492C4.59961 10.8594 4.92188 11.1816 5.3125 11.1816C5.51758 11.1816 5.70312 11.1133 5.83008 10.9766L7.88086 8.90625L9.94141 10.9766C10.0684 11.1133 10.2539 11.1816 10.4492 11.1816C10.8594 11.1816 11.1816 10.8594 11.1816 10.4492C11.1816 10.2539 11.1133 10.0781 10.9668 9.94141L8.90625 7.89062L10.9766 5.82031C11.1328 5.67383 11.1914 5.50781 11.1914 5.3125C11.1914 4.91211 10.8691 4.59961 10.4688 4.59961C10.2832 4.59961 10.127 4.66797 9.98047 4.80469Z" />
                </g>
            </svg>
        )
    }
}

export class MoreIcon extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 12.1562 3"
                width={width}
                height={height}
                className={className}
            >
                <g>
                    <rect height="3" opacity="0" width="12.1562" x="0" y="0" />
                    <circle cx="10.5391" cy="1.5" r="1.3" />
                    <circle cx="5.875" cy="1.5" r="1.3" />
                    <circle cx="1.31094" cy="1.5" r="1.3" />
                </g>
            </svg>
        )
    }
}

export class PlaystateAnimationMedalist extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 28 20"
                width={width}
                height={height}
                className={className}
            >
                <rect x="2" y="12" width="2" height="8" rx="1" className="bar bar1"></rect>
                <rect x="6" y="10" width="2" height="10" rx="1" className="bar bar2"></rect>
                <rect x="10" y="14" width="2" height="6" rx="1" className="bar bar3"></rect>
                <rect x="14" y="11" width="2" height="9" rx="1" className="bar bar4"></rect>
                <rect x="18" y="13" width="2" height="7" rx="1" className="bar bar5"></rect>
                <rect x="22" y="12" width="2" height="8" rx="1" className="bar bar6"></rect>
            </svg>
        )
    }
}

export class PlaystateAnimationTracklist extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 18 18"
                width={width}
                height={height}
                className={className}
            >
                <rect x="1" y="10" width="3" height="8" rx="1.5" className="bar bar1"></rect>
                <rect x="5" y="9" width="3" height="9" rx="1.5" className="bar bar2"></rect>
                <rect x="9" y="11" width="3" height="7" rx="1.5" className="bar bar3"></rect>
                <rect x="13" y="10" width="3" height="8" rx="1.5" className="bar bar4"></rect>
            </svg>
        )
    }
}

export class PlaystateAnimationSearch extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 14 14"
                width={width}
                height={height}
                className={className}
            >
                <rect x="1" y="8" width="3" height="6" rx="1.5" className="bar bar1"></rect>
                <rect x="5.5" y="7" width="3" height="7" rx="1.5" className="bar bar2"></rect>
                <rect x="10" y="9" width="3" height="5" rx="1.5" className="bar bar3"></rect>
            </svg>
        )
    }
}

export class DownloadingIcon extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 13.0234 12.6172"
                width={width}
                height={height}
                className={className}
            >
                <g>
                    <rect height="12.6172" opacity="0" width="13.0234" x="0" y="0" />
                    <path d="M6.30469 12.6094C9.78906 12.6094 12.6172 9.78906 12.6172 6.30469C12.6172 2.82031 9.78906 0 6.30469 0C2.82812 0 0 2.82031 0 6.30469C0 9.78906 2.82812 12.6094 6.30469 12.6094ZM6.30469 11.4219C3.47656 11.4219 1.19531 9.13281 1.19531 6.30469C1.19531 3.47656 3.47656 1.1875 6.30469 1.1875C9.13281 1.1875 11.4219 3.47656 11.4219 6.30469C11.4219 9.13281 9.13281 11.4219 6.30469 11.4219Z" />
                    <path d="M6.30469 9.41406C6.45312 9.41406 6.57031 9.36719 6.71094 9.22656L8.71875 7.3125C8.82031 7.20312 8.88281 7.09375 8.88281 6.94531C8.88281 6.65625 8.66406 6.45312 8.375 6.45312C8.23438 6.45312 8.09375 6.50781 7.99219 6.61719L7.13281 7.55469L6.82031 7.89062L6.86719 6.96094L6.86719 3.73438C6.86719 3.44531 6.60938 3.19531 6.30469 3.19531C6.00781 3.19531 5.75 3.44531 5.75 3.73438L5.75 6.96094L5.79688 7.89062L5.47656 7.55469L4.61719 6.61719C4.52344 6.50781 4.36719 6.45312 4.23438 6.45312C3.94531 6.45312 3.73438 6.65625 3.73438 6.94531C3.73438 7.09375 3.78906 7.20312 3.89844 7.3125L5.89844 9.22656C6.04688 9.36719 6.16406 9.41406 6.30469 9.41406Z" />
                </g>
            </svg>
        )
    }
}

export class DownloadedIcon extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 13.0234 12.6172"
                width={width}
                height={height}
                className={className}
            >
                <g>
                    <rect height="12.6172" opacity="0" width="13.0234" x="0" y="0" />
                    <path d="M12.6172 6.30469C12.6172 9.78125 9.78906 12.6094 6.30469 12.6094C2.82812 12.6094 0 9.78125 0 6.30469C0 2.82812 2.82812 0 6.30469 0C9.78906 0 12.6172 2.82812 12.6172 6.30469ZM5.73438 3.64062L5.73438 6.98438L5.78125 7.95312L5.45312 7.60156L4.5625 6.63281C4.46094 6.51562 4.30469 6.46094 4.16406 6.46094C3.85938 6.46094 3.64062 6.67188 3.64062 6.96875C3.64062 7.125 3.70312 7.24219 3.8125 7.35156L5.89844 9.33594C6.04688 9.48438 6.16406 9.53125 6.3125 9.53125C6.46875 9.53125 6.58594 9.48438 6.73438 9.33594L8.8125 7.35156C8.92969 7.24219 8.98438 7.125 8.98438 6.96875C8.98438 6.67188 8.75781 6.46094 8.46094 6.46094C8.32031 6.46094 8.16406 6.51562 8.07031 6.63281L7.17188 7.60156L6.85156 7.95312L6.89062 6.98438L6.89062 3.64062C6.89062 3.32812 6.63281 3.07812 6.3125 3.07812C6 3.07812 5.73438 3.32812 5.73438 3.64062Z" />
                </g>
            </svg>
        )
    }
}

export class DeletingIcon extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 13.0234 12.6172"
                width={width}
                height={height}
                className={className}
            >
                <g>
                    <rect height="12.6172" opacity="0" width="13.0234" x="0" y="0" />
                    <path d="M12.6172 6.30469C12.6172 9.78125 9.78906 12.6094 6.30469 12.6094C2.82812 12.6094 0 9.78125 0 6.30469C0 2.82812 2.82812 0 6.30469 0C9.78906 0 12.6172 2.82812 12.6172 6.30469ZM3.92969 5.70312C3.5 5.70312 3.22656 5.92188 3.22656 6.32031C3.22656 6.71094 3.51562 6.92188 3.92969 6.92188L8.69531 6.92188C9.10938 6.92188 9.38281 6.71094 9.38281 6.32031C9.38281 5.92188 9.125 5.70312 8.69531 5.70312Z" />
                </g>
            </svg>
        )
    }
}

export class SortingIcon extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 15.4834 11.9011"
                width={width}
                height={height}
                className={className}
            >
                <g>
                    <rect height="11.9011" opacity="0" width="15.4834" x="0" y="0" />
                    <path
                        className="arrow up"
                        d="M11.7615 11.6415L14.8371 8.475C14.9816 8.32516 15.0771 8.09791 15.0771 7.90475C15.0771 7.4428 14.7523 7.12324 14.2956 7.12324C14.0787 7.12324 13.8987 7.19816 13.7542 7.34765L12.5485 8.6051L11.9198 9.3617L11.9624 8.13288L11.9624 0.79319C11.9624 0.339051 11.6326 0.00919333 11.1784 0.00919333C10.7243 0.00919333 10.3891 0.339051 10.3891 0.79319L10.3891 8.13288L10.4371 9.3617L9.80302 8.6051L8.59741 7.34765C8.45823 7.19816 8.27288 7.12324 8.05593 7.12324C7.59931 7.12324 7.27975 7.4428 7.27975 7.90475C7.27975 8.09791 7.36993 8.32516 7.51978 8.475L10.5901 11.6415C10.9178 11.9849 11.4337 11.9902 11.7615 11.6415Z"
                    />
                    <path
                        className="arrow down"
                        d="M3.31567 0.262005L0.24003 3.42607C0.0955153 3.57591 0 3.79783 0 3.99631C0 4.45827 0.324889 4.77783 0.781512 4.77783C0.998465 4.77783 1.17848 4.70291 1.32299 4.55342L2.5286 3.29597L3.15733 2.53404L3.10938 3.76818L3.10938 11.1079C3.10938 11.5698 3.44456 11.8997 3.8987 11.8997C4.35284 11.8997 4.68802 11.5698 4.68802 11.1079L4.68802 3.76818L4.64007 2.53404L5.2688 3.29597L6.47441 4.55342C6.61892 4.70291 6.79893 4.77783 7.01589 4.77783C7.47251 4.77783 7.7974 4.45827 7.7974 3.99631C7.7974 3.79783 7.70188 3.57591 7.55737 3.42607L4.48706 0.262005C4.15932-0.0760251 3.6434-0.0813533 3.31567 0.262005Z"
                    />
                </g>
            </svg>
        )
    }
}

export class LyricsIcon extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 14.0234 13.6328"
                width={width}
                height={height}
                className={className}
            >
                <g>
                    <rect height="13.6328" opacity="0" width="14.0234" x="0" y="0" />
                    <path d="M3.92188 13.6328C4.26562 13.6328 4.5 13.4531 4.92188 13.0703L7.01562 11.1953L10.6875 11.1953C12.6094 11.1953 13.6172 10.1562 13.6172 8.26562L13.6172 3.71875C13.6172 1.82812 12.6094 0.789062 10.6875 0.789062L2.92969 0.789062C1.00781 0.789062 0 1.82812 0 3.71875L0 8.26562C0 10.1562 1.00781 11.1953 2.92969 11.1953L3.15625 11.1953L3.15625 12.75C3.15625 13.2891 3.42969 13.6328 3.92188 13.6328ZM4.21094 12.3516L4.21094 10.5938C4.21094 10.2109 4.07031 10.0703 3.6875 10.0703L2.92969 10.0703C1.67188 10.0703 1.125 9.46875 1.125 8.26562L1.125 3.71875C1.125 2.52344 1.67188 1.92188 2.92969 1.92188L10.6875 1.92188C11.9453 1.92188 12.4922 2.52344 12.4922 3.71875L12.4922 8.26562C12.4922 9.46875 11.9453 10.0703 10.6875 10.0703L6.95312 10.0703C6.57812 10.0703 6.38281 10.125 6.13281 10.3906Z" />
                    <path d="M3.84375 5.32812C3.84375 6.03125 4.28125 6.57812 4.97656 6.57812C5.22656 6.57812 5.47656 6.54688 5.63281 6.35156L5.67969 6.35156C5.45312 6.83594 5.02344 7.14062 4.60156 7.25C4.36719 7.3125 4.29688 7.42188 4.29688 7.57031C4.29688 7.73438 4.42969 7.86719 4.60938 7.86719C5.25781 7.86719 6.49219 7.11719 6.49219 5.55469C6.49219 4.72656 5.96094 4.07812 5.14844 4.07812C4.40625 4.07812 3.84375 4.58594 3.84375 5.32812ZM7.13281 5.32812C7.13281 6.03125 7.5625 6.57812 8.26562 6.57812C8.50781 6.57812 8.76562 6.54688 8.92188 6.35156L8.96875 6.35156C8.74219 6.83594 8.30469 7.14062 7.89062 7.25C7.65625 7.3125 7.58594 7.42188 7.58594 7.57031C7.58594 7.73438 7.71094 7.86719 7.89844 7.86719C8.54688 7.86719 9.77344 7.11719 9.77344 5.55469C9.77344 4.72656 9.25 4.07812 8.4375 4.07812C7.69531 4.07812 7.13281 4.58594 7.13281 5.32812Z" />
                </g>
            </svg>
        )
    }
}

export class QueueIcon extends Component<IconProps> {
    static defaultProps = {
        width: '100%',
        height: '100%',
    }

    render() {
        const { width, height, className } = this.props
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 13.3765 9.58136"
                width={width}
                height={height}
                className={className}
            >
                <g>
                    <rect height="9.58136" opacity="0" width="13.3765" x="0" y="0" />
                    <path d="M3.99477 9.32711L12.2707 9.32711C12.6578 9.32711 12.9702 9.00258 12.9702 8.62052C12.9702 8.22568 12.6602 7.91393 12.2707 7.91393L3.99477 7.91393C3.60774 7.91393 3.3006 8.23065 3.3006 8.62052C3.3006 8.99762 3.61023 9.32711 3.99477 9.32711Z" />
                    <path d="M0.96084 9.58136C1.48778 9.58136 1.92168 9.14746 1.92168 8.62052C1.92168 8.08826 1.48778 7.65968 0.96084 7.65968C0.433905 7.65968 0 8.08826 0 8.62052C0 9.14746 0.433905 9.58136 0.96084 9.58136Z" />
                    <path d="M3.99477 5.49869L12.2707 5.49869C12.6578 5.49869 12.9702 5.17416 12.9702 4.7921C12.9702 4.40259 12.6602 4.08551 12.2707 4.08551L3.99477 4.08551C3.60774 4.08551 3.3006 4.40756 3.3006 4.7921C3.3006 5.1692 3.61023 5.49869 3.99477 5.49869Z" />
                    <path d="M0.96084 5.75294C1.48778 5.75294 1.92168 5.31904 1.92168 4.7921C1.92168 4.26517 1.48778 3.83126 0.96084 3.83126C0.433905 3.83126 0 4.26517 0 4.7921C0 5.31904 0.433905 5.75294 0.96084 5.75294Z" />
                    <path d="M3.99477 1.67027L12.2707 1.67027C12.6578 1.67027 12.9702 1.34575 12.9702 0.963684C12.9702 0.57417 12.6602 0.257093 12.2707 0.257093L3.99477 0.257093C3.60774 0.257093 3.3006 0.579139 3.3006 0.963684C3.3006 1.34078 3.61023 1.67027 3.99477 1.67027Z" />
                    <path d="M0.96084 1.92452C1.48778 1.92452 1.92168 1.49062 1.92168 0.963684C1.92168 0.436749 1.48778 0.00284386 0.96084 0.00284386C0.433905 0.00284386 0 0.436749 0 0.963684C0 1.49062 0.433905 1.92452 0.96084 1.92452Z" />
                </g>
            </svg>
        )
    }
}
