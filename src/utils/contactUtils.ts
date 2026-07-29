import { Alert, Linking } from 'react-native';
import { Bid } from '@/context/post-job';
import { getCustomerProfile } from '@/services/customer';

export const handleMakePhoneCall = async (bid?: Bid | null) => {
  let rawPhone = bid?.phone_number || '';
  if (!rawPhone && bid?.user_id) {
    try {
      const p = await getCustomerProfile(bid.user_id);
      if (p?.phone_number) rawPhone = p.phone_number;
    } catch (e) {
      console.warn('[contactUtils] Error fetching worker phone number:', e);
    }
  }
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  if (!cleanPhone || cleanPhone.length < 7) {
    Alert.alert('Phone Number Unavailable', 'The service provider has not added a contact phone number yet.');
    return;
  }
  Linking.openURL(`tel:${cleanPhone}`).catch(() => {
    Alert.alert('Phone Call Error', 'Could not open phone dialer.');
  });
};

export const handleOpenWhatsApp = async (bid?: Bid | null, category?: string) => {
  let rawPhone = bid?.phone_number || '';
  if (!rawPhone && bid?.user_id) {
    try {
      const p = await getCustomerProfile(bid.user_id);
      if (p?.phone_number) rawPhone = p.phone_number;
    } catch (e) {
      console.warn('[contactUtils] Error fetching worker phone number:', e);
    }
  }
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  if (!cleanPhone || cleanPhone.length < 7) {
    Alert.alert('WhatsApp Unavailable', 'The service provider has not added a contact phone number yet.');
    return;
  }
  const textMessage = `Hi ${bid?.name || 'there'}, I am contacting you regarding task "${category || 'Service Request'}".`;
  Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`).catch(() => {
    Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Please ensure WhatsApp is installed on your device.');
  });
};
