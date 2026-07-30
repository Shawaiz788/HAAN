# 🛠️ `attachmentUtils`

**Source File**: [src/utils/attachmentUtils.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/utils/attachmentUtils.ts)

## Overview
`attachmentUtils` provides helper functions for picking images from the device library (`pickImageFromLibrary`), capturing photos via camera (`captureImageFromCamera`), and generating fallback file metadata.

---

## Function Signatures

```typescript
export const pickImageFromLibrary = async (): Promise<string | null>;
export const captureImageFromCamera = async (): Promise<string | null>;
export const getFileExtension = (uri: string): string;
```

---

## Usage Example

```tsx
import { pickImageFromLibrary } from '@/utils/attachmentUtils';

export default function AttachmentPicker() {
  const handlePick = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) console.log('Selected image URI:', uri);
  };

  return <Button title="Pick Photo" onPress={handlePick} />;
}
```
