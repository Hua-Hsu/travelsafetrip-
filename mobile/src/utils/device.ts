import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getDeviceId(): Promise<string> {
  let deviceId = await AsyncStorage.getItem('device_id');
  
  if (!deviceId) {
    deviceId = Device.osBuildId || `${Device.osName}-${Date.now()}`;
    await AsyncStorage.setItem('device_id', deviceId);
  }
  
  return deviceId;
}

export function getDeviceName(): string {
  return `${Device.modelName} (${Device.osName} ${Device.osVersion})`;
}