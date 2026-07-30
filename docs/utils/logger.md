# 🛠️ `logger`

**Source File**: [src/utils/logger.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/utils/logger.ts)

## Overview
`logger` is an environment-aware logging utility. In development builds (`__DEV__`), it outputs formatted logs, warnings, and errors to the console. In production builds, it safely silences non-critical logs to prevent performance degradation or security leaks.

---

## Utility Interface

```typescript
export const logger = {
  log: (...args: any[]) => void,
  warn: (...args: any[]) => void,
  error: (...args: any[]) => void,
};
```

---

## Usage Example

```tsx
import { logger } from '@/utils/logger';

logger.log('[WebSocket] Connecting to server...');
logger.warn('[Auth] Token nearing expiry.');
logger.error('[API] Request failed:', error);
```
