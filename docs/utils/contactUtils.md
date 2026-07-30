# 🛠️ `contactUtils`

**Source File**: [src/utils/contactUtils.ts](file:///c:/Users/Fahad/Documents/KaamKarwao/src/utils/contactUtils.ts)

## Overview
`contactUtils` provides phone number formatting, phone call dialing helpers (`Linking.openURL('tel:...')`), and WhatsApp messaging deep-link launchers (`Linking.openURL('whatsapp://send?phone=...')`).

---

## Function Signatures

```typescript
export const formatPhoneNumber = (phone: string): string;
export const dialPhoneNumber = (phone: string): Promise<void>;
export const openWhatsAppChat = (phone: string, text?: string): Promise<void>;
```

---

## Usage Example

```tsx
import { dialPhoneNumber, openWhatsAppChat } from '@/utils/contactUtils';

export default function ContactActions({ phone }: { phone: string }) {
  return (
    <View>
      <Button title="Call Worker" onPress={() => dialPhoneNumber(phone)} />
      <Button title="Chat on WhatsApp" onPress={() => openWhatsAppChat(phone, 'Hello!')} />
    </View>
  );
}
```
