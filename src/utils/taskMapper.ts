import { BackendTask, Task } from '@/types';
import { TASK_STATUS } from '@/constants/taskStatus';

/**
 * Maps a backend task object to the local Task type used by the client.
 * Single source of truth for status mapping and field transformation.
 * 1 = searching, 2 = bidding, 3 = accepted, 4 = completed, 5 = cancelled
 */
export function mapBackendTaskToLocal(bt: BackendTask): Task {
  let status: Task['status'] = 'searching';

  if (bt.status_id === TASK_STATUS.COMPLETED) {
    status = 'completed';
  } else if (bt.status_id === TASK_STATUS.CANCELLED) {
    status = 'cancelled';
  } else if (bt.status_id === TASK_STATUS.ACCEPTED) {
    status = 'accepted';
  } else if (bt.status_id === TASK_STATUS.BIDDING) {
    status = 'bidding';
  } else if (bt.status_id === TASK_STATUS.SEARCHING) {
    status = 'searching';
  }

  return {
    id: bt.id ? bt.id.toString() : Date.now().toString(),
    backend_id: bt.id,
    category: bt.subject || 'General Task',
    description: bt.body || '',
    budget: bt.price || 0,
    locationName: 'Specified Location',
    paymentPref: 'Cash',
    status,
    createdAt: bt.created_at || new Date().toISOString(),
  };
}
