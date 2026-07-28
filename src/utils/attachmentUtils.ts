const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export function getNormalizedAttachments(attachmentsData: any): string[] {
    if (!attachmentsData) return [];

    let list: any[] = [];
    if (Array.isArray(attachmentsData)) {
        list = attachmentsData;
    } else if (typeof attachmentsData === 'string') {
        const trimmed = attachmentsData.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) list = parsed;
            } catch {
                list = trimmed.split(',').map((s) => s.trim());
            }
        } else if (trimmed.length > 0) {
            list = trimmed.split(',').map((s) => s.trim());
        }
    } else if (typeof attachmentsData === 'object') {
        list = [attachmentsData];
    }

    return list
        .map((item) => {
            if (!item) return null;
            let uri = '';
            if (typeof item === 'string') {
                uri = item;
            } else if (typeof item === 'object') {
                uri = item.file || item.uri || item.url || item.path || '';
            }
            if (!uri) return null;
            if (
                !uri.startsWith('http://') &&
                !uri.startsWith('https://') &&
                !uri.startsWith('file://') &&
                !uri.startsWith('data:')
            ) {
                if (BASE_URL) {
                    const cleanPath = uri.startsWith('/') ? uri : `/${uri}`;
                    uri = `${BASE_URL}${cleanPath}`;
                }
            }
            return uri;
        })
        .filter((uri): uri is string => Boolean(uri && uri.trim().length > 0));
}
