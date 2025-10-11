import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ImportScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setFileName(file.name);
        uploadFile(file);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('خطأ', 'فشل اختيار الملف');
    }
  };

  const uploadFile = async (file: any) => {
    setLoading(true);
    try {
      const formData = new FormData();
      
      // Create file object for upload
      const fileToUpload: any = {
        uri: file.uri,
        type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        name: file.name,
      };

      formData.append('file', fileToUpload);

      const response = await fetch(`${BACKEND_URL}/api/tasks/import?userId=${userId}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'نجح الاستيراد',
          `تم استيراد ${data.tasks_imported} مهمة بنجاح`,
          [
            {
              text: 'حسناً',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('خطأ', data.detail || 'فشل استيراد الملف');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('خطأ', 'فشل رفع الملف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A3A4A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>استيراد من Excel</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-upload" size={80} color="#2E7D8F" />
        </View>

        <Text style={styles.title}>استيراد المهام</Text>
        <Text style={styles.description}>
          قم برفع ملف Excel يحتوي على المهام{'\n'}
          الأعمدة المطلوبة (7 أعمدة)
        </Text>

        {fileName && (
          <View style={styles.fileInfo}>
            <Ionicons name="document" size={24} color="#2E7D8F" />
            <Text style={styles.fileName}>{fileName}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickDocument}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="folder-open" size={24} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>اختر ملف Excel</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>التعليمات:</Text>
          <View style={styles.instructionItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.instructionText}>
              الصف الأول يجب أن يحتوي على رؤوس الأعمدة
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.instructionText}>
              العمود الأول: اسم المهمة (نص)
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.instructionText}>
              العمود الثاني: التاريخ (YYYY-MM-DD)
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.instructionText}>
              العمود الثالث: التكرار (daily أو weekly)
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.instructionText}>
              العمود الرابع: الوقت (HH:MM مثل 09:00)
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D1DCE5',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A3A4A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A3A4A',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6B8FA3',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4F8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 12,
  },
  fileName: {
    fontSize: 14,
    color: '#1A3A4A',
    flex: 1,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D8F',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    minWidth: 200,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  instructions: {
    marginTop: 48,
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1DCE5',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A3A4A',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 16,
    color: '#2E7D8F',
    marginRight: 8,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 15,
    color: '#6B8FA3',
    flex: 1,
    lineHeight: 22,
  },
});