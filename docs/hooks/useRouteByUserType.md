# ⚓ `useRouteByUserType`

**Source File**: [src/hooks/useRouteByUserType.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/hooks/useRouteByUserType.ts)

## Overview
`useRouteByUserType` evaluates the authenticated user's `usertype_id` role and automatically redirects them to their designated application root tab (`/(protected)/(client)/home`, `/(protected)/(pro)/dashboard`, or `/(protected)/(admin)/dashboard`).

---

## Role Mapping Table

| `usertype_id` | Role Name | Destination Route |
| :--- | :--- | :--- |
| **1** | Customer | `/(protected)/(client)/home` |
| **2** | Professional | `/(protected)/(pro)/dashboard` |
| **3** | Admin | `/(protected)/(admin)/dashboard` |

---

## Usage Example

```tsx
import { useRouteByUserType } from '@/hooks/useRouteByUserType';

export default function IndexScreen() {
  const { navigateToUserHome } = useRouteByUserType();

  useEffect(() => {
    navigateToUserHome();
  }, []);

  return <ActivityIndicator />;
}
```
