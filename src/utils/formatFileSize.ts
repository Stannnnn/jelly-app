export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    const size = bytes / Math.pow(1024, i)

    return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
}
