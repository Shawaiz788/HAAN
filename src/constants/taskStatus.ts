/**
 * Task status IDs as defined in the backend database.
 * 1 = Searching (Task posted, finding pros)
 * 2 = Bidding (Receiving offers from pros)
 * 3 = Accepted (Pro assigned / in progress)
 * 4 = Completed (Finished)
 * 5 = Cancelled (Cancelled)
 */
export const TASK_STATUS = {
  SEARCHING: 1,
  BIDDING: 2,
  ACCEPTED: 3,
  COMPLETED: 4,
  CANCELLED: 5,
} as const;

export type TaskStatusId = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];
