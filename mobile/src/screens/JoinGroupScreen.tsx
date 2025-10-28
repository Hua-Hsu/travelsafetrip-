import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { getDeviceId, getDeviceName } from '../utils/device';

export default function JoinGroupScreen({ navigation, route }: any) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    // 處理 Deep Link
    const handleDeepLink = async (event: { url: string }) => {
      const { queryParams } = Linking.parse(event.url);
      if (queryParams?.code) {
        await handleJoin(queryParams.code as string);
      }
    };

    // 獲取初始 URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // 監聽 URL 變化
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => subscription.remove();
  }, []);

  const handleJoin = async (inviteCode: string) => {
    if (!inviteCode || inviteCode.length !== 6) {
      Alert.alert('錯誤', '請輸入 6 位數邀請碼');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        const { data: authData } = await supabase.auth.signInAnonymously();
        if (!authData.user) throw new Error('登入失敗');
      }

      const deviceId = await getDeviceId();
      const deviceName = getDeviceName();

      const { data, error } = await supabase.functions.invoke('join-group', {
        body: { 
          inviteCode: inviteCode.toUpperCase(),
          deviceId,
          deviceName,
        },
      });

      if (error) throw error;
      
      Alert.alert('成功', '已成功加入群組！', [
        { text: '確定', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('錯誤', error.message || '加入群組失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanning(false);
    try {
      const { queryParams } = Linking.parse(data);
      const scannedCode = queryParams?.code as string;
      if (scannedCode) {
        setCode(scannedCode);
        handleJoin(scannedCode);
      }
    } catch {
      Alert.alert('錯誤', '無效的 QR Code');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      Alert.alert('提示', '圖片 QR Code 掃描功能需要額外的處理庫');
      // 實際應用中需要使用 jsQR 或類似庫來解析圖片中的 QR code
    }
  };

  const startScanning = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('權限被拒絕', '需要相機權限才能掃描 QR Code');
        return;
      }
    }
    setScanning(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 方法 1: 輸入邀請碼 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>方法 1：輸入邀請碼</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase())}
          placeholder="輸入 6 位數代碼"
          maxLength={6}
          autoCapitalize="characters"
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, (loading || code.length !== 6) && styles.disabledButton]}
          onPress={() => handleJoin(code)}
          disabled={loading || code.length !== 6}
        >
          <Text style={styles.buttonText}>
            {loading ? '加入中...' : '加入群組'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 方法 2: 掃描 QR Code */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>方法 2：掃描 QR Code</Text>
        {!scanning ? (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={startScanning}
          >
            <Text style={styles.buttonText}>開啟相機掃描</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              onBarcodeScanned={handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
            <TouchableOpacity
              style={[styles.button, styles.tertiaryButton]}
              onPress={() => setScanning(false)}
            >
              <Text style={styles.buttonText}>關閉掃描</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 方法 3: 從圖庫選擇 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>方法 3：從圖庫選擇</Text>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={pickImage}
        >
          <Text style={styles.buttonText}>選擇圖片</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>支援 JPG、PNG 等圖片格式</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 4,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#059669',
  },
  tertiaryButton: {
    backgroundColor: '#6b7280',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  camera: {
    width: '100%',
    height: 300,
  },
  hint: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});