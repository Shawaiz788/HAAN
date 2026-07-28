import React from 'react';
import { useBiddingWebSocket } from '@/hooks/useBiddingWebSocket';

interface ActiveBidListenerProps {
    jobId: number;
    userId: number | undefined;
    onAccepted: (jobId: number, bid: any) => void;
    onAssignedToOther: (jobId: number) => void;
}

export function ActiveBidListener({
    jobId,
    userId,
    onAccepted,
    onAssignedToOther,
}: ActiveBidListenerProps) {
    useBiddingWebSocket({
        taskId: jobId,
        userId,
        isCustomer: false,
        enabled: Boolean(jobId && userId),
        onBidAccepted: (bid) => {
            if (String(bid.user_id) === String(userId)) {
                onAccepted(jobId, bid);
            }
        },
        onTaskAssignedToOther: (closedId) => {
            onAssignedToOther(closedId);
        },
    });
    return null;
}
