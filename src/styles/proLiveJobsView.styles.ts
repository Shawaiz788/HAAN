import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export const states = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        gap: 12,
    },
    pulseCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    searchIconBox: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(34,197,94,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    stateText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    stateSub: {
        color: Colors.neutral[400],
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dots: {
        flexDirection: 'row',
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.pro.accent,
    },
});

export const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: Colors.pro.bg,
    },
    header: {
        backgroundColor: Colors.pro.header,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerBtn: {
        padding: 4,
    },
    activeJobBanner: {
        backgroundColor: '#059669',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },
    activeBannerTextCol: {
        flex: 1,
    },
    activeBannerTitle: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    activeBannerSub: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        marginTop: 2,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        color: Colors.white,
        fontSize: 20,
        fontWeight: '700',
    },
    livePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: Colors.pro.liveChip,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.pro.accent,
    },
    livePillText: {
        color: Colors.white,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    avatarBtn: {},
    avatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.pro.accentDim,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    avatarText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    subHeader: {
        backgroundColor: Colors.pro.header,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 16,
    },
    subLabel: {
        color: Colors.neutral[500],
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 3,
    },
    subValue: {
        color: Colors.white,
        fontSize: 20,
        fontWeight: '700',
    },
    subDivider: {
        width: 1,
        height: 32,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    subRight: {
        alignItems: 'flex-end',
    },
    subValueRight: {
        color: Colors.white,
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'right',
    },
    onlineBar: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    onlineBarText: {
        flex: 1,
        color: Colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
    jobList: {
        flex: 1,
    },
    jobListContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    refreshingBanner: {
        backgroundColor: 'rgba(34,197,94,0.12)',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        marginBottom: 12,
    },
    refreshingText: {
        color: Colors.pro.accent,
        fontSize: 13,
        fontWeight: '600',
    },
});
