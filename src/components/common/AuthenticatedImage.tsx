import React, { useState, useEffect } from 'react';
import { Image, ImageProps, ImageSourcePropType } from 'react-native';
import * as SecureStore from 'expo-secure-store';

interface AuthenticatedImageProps extends Omit<ImageProps, 'source'> {
  uri?: string | null;
  fallbackSource?: ImageSourcePropType;
}

export default function AuthenticatedImage({
  uri,
  fallbackSource,
  style,
  resizeMode = 'cover',
  onLoad,
  onError,
  ...props
}: AuthenticatedImageProps) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    SecureStore.getItemAsync('user_token').then((t) => {
      if (isMounted && t) {
        setToken(t);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  if (!uri) {
    if (fallbackSource) {
      return <Image source={fallbackSource} style={style} resizeMode={resizeMode} {...props} />;
    }
    return null;
  }

  const isRemote = uri.startsWith('http://') || uri.startsWith('https://');
  const sourceObj = isRemote && token
    ? { uri, headers: { Authorization: `Bearer ${token}` } }
    : { uri };

  return (
    <Image
      source={sourceObj}
      style={style}
      resizeMode={resizeMode}
      onLoad={onLoad}
      onError={(e) => {
        if (onError) onError(e);
      }}
      {...props}
    />
  );
}
