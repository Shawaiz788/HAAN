/**
 * Task status IDs as defined in the backend database.
 * Use these instead of hardcoded magic numbers throughout the codebase.
 */
export const TASK_STATUS = {
  OPEN: 1,
  ACCEPTED: 2,
  CANCELLED_BY_SYSTEM: 3,
  COMPLETED: 4,
  CANCELLED: 5,
} as const;

export type TaskStatusId = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];
