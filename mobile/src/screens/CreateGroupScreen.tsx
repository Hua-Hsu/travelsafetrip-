import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';

export default function CreateGroupScreen({ navigation }: any) {
  const [groupName, setGroupName] = useState('');
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert('錯誤', '請輸入群組名稱');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        const { data: authData } = await supabase.auth.signInAnonymously();
        if (!authData.user) throw new Error('登入失敗');
      }

      const { data, error } = await supabase.functions.invoke('create-group', {
        body: { name: groupName },
      });

      if (error) throw error;
      
      setGroup(data);
    } catch (error: any) {
      Alert.alert('錯誤', error.message || '建立群組失敗');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('已複製', `${label}已複製到剪貼簿`);
  };

  const shareLink = group 
    ? `myapp://join?code=${group.invite_code}`
    : '';

  if (group) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.successTitle}>群組已建立！</Text>

        <View style={styles.qrContainer}>
          <Text style={styles.sectionTitle}>掃描加入</Text>
          <View style={styles.qrWrapper}>
            <QRCode value={shareLink} size={220} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>邀請碼</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{group.invite_code}</Text>
          </View>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => copyToClipboard(group.invite_code, '邀請碼')}
          >
            <Text style={styles.copyButtonText}>複製邀請碼</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            setGroup(null);
            setGroupName('');
          }}
        >
          <Text style={styles.resetButtonText}>建立另一個群組</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>群組名稱</Text>
      <TextInput
        style={styles.input}
        value={groupName}
        onChangeText={setGroupName}
        placeholder="輸入群組名稱..."
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.createButton, loading && styles.disabledButton]}
        onPress={handleCreate}
        disabled={loading}
      >
        <Text style={styles.createButtonText}>
          {loading ? '建立中...' : '建立群組'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 30,
  },
  qrContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  codeContainer: {
    backgroundColor: '#f3f4f6',
    padding: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  codeText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    color: '#111827',
  },
  copyButton: {
    backgroundColor: '#e5e7eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#6b7280',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});