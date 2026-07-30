# ⚓ `useProfileSubmit`

**Source File**: [src/hooks/useProfileSubmit.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/hooks/useProfileSubmit.ts)

## Overview
`useProfileSubmit` handles onboarding profile setup, form data compilation, avatar upload, role assignment (Customer vs Professional), and user profile registration via TanStack Query mutations (`useMutation`).

---

## Hook Signature

```typescript
export function useProfileSubmit(options: {
  initialRole?: 'customer' | 'professional';
}): {
  role: 'customer' | 'professional';
  setRole: (role: 'customer' | 'professional') => void;
  submitting: boolean;
  submitProfile: (formData: ProfileFormData) => Promise<boolean>;
}
```

---

## Usage Example

```tsx
import { useProfileSubmit } from '@/hooks/useProfileSubmit';

export default function ProfileSetupScreen() {
  const { role, setRole, submitting, submitProfile } = useProfileSubmit({ initialRole: 'customer' });

  const onSubmit = async (data: any) => {
    const success = await submitProfile(data);
    if (success) console.log('Profile created successfully!');
  };

  return <Button title="Submit Profile" onPress={onSubmit} disabled={submitting} />;
}
```
