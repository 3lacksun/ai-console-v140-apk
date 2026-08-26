import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { UPLOAD_LIMITS, formatMb } from './uploadLimits.mjs';
const MAX_MEDIA_BYTES = UPLOAD_LIMITS.maxImageBytes;

const normaliseAsset = async (asset, source) => {
  if (!asset?.uri) return null;
  let size = Number(asset.fileSize) || 0;
  if (!size) {
    try { const info = await FileSystem.getInfoAsync(asset.uri, { size: true }); size = Number(info?.size) || 0; } catch (_) {}
  }
  if (size > MAX_MEDIA_BYTES) throw new Error(`Selected image exceeds the ${formatMb(MAX_MEDIA_BYTES)} MB per-file ceiling.`);
  return {
    name: asset.fileName || `${source}-${Date.now()}.jpg`,
    uri: asset.uri,
    mimeType: asset.mimeType || 'image/jpeg',
    size,
    kind: source === 'camera' ? 'camera' : 'gallery',
    source,
  };
};

export async function captureCameraImage() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Camera permission was denied.');
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false, exif: false });
  if (result.canceled) return null;
  return normaliseAsset(result.assets?.[0], 'camera');
}

export async function pickGalleryImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Photo library permission was denied.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsMultipleSelection: false, exif: false });
  if (result.canceled) return null;
  return normaliseAsset(result.assets?.[0], 'gallery');
}

export async function loadImageDataUrl(asset) {
  if (!asset?.uri) throw new Error('Selected image is no longer available.');
  let size = Number(asset.size) || 0;
  try { const info = await FileSystem.getInfoAsync(asset.uri, { size: true }); size = Number(info?.size) || size; } catch (_) {}
  if (!size) throw new Error('Unable to establish selected image size safely.');
  if (size > MAX_MEDIA_BYTES) throw new Error(`Selected image exceeds the ${formatMb(MAX_MEDIA_BYTES)} MB per-file ceiling.`);
  const mime = /^image\/(png|jpe?g|webp|gif)$/i.test(asset.mimeType || '') ? asset.mimeType : 'image/jpeg';
  const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  if (Math.ceil(base64.length * 3 / 4) > MAX_MEDIA_BYTES) throw new Error(`Selected image exceeds the ${formatMb(MAX_MEDIA_BYTES)} MB per-file ceiling.`);
  return `data:${mime};base64,${base64}`;
}
