import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AddTaskScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المهمة');
      return;
    }

    if (!date.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال التاريخ');
      return;
    }

    if (!time.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال الوقت');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          date,
          frequency,
          time,
          priority,
          category,
        }),
      });

      if (response.ok) {
        Alert.alert('نجح', 'تم إضافة المهمة بنجاح', [
          {
            text: 'حسناً',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('خطأ', 'فشل إضافة المهمة');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إضافة المهمة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1A3A4A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>إضافة مهمة جديدة</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Task Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم المهمة *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="أدخل اسم المهمة"
              placeholderTextColor="#B0BEC5"
            />
          </View>

          {/* Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>التاريخ * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="2025-07-15"
              placeholderTextColor="#B0BEC5"
            />
          </View>

          {/* Frequency */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>التكرار *</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  frequency === 'daily' && styles.optionButtonActive,
                ]}
                onPress={() => setFrequency('daily')}
              >
                <Text
                  style={[
                    styles.optionText,
                    frequency === 'daily' && styles.optionTextActive,
                  ]}
                >
                  يومي
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  frequency === 'weekly' && styles.optionButtonActive,
                ]}
                onPress={() => setFrequency('weekly')}
              >
                <Text
                  style={[
                    styles.optionText,
                    frequency === 'weekly' && styles.optionTextActive,
                  ]}
                >
                  أسبوعي
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>الوقت * (HH:MM)</Text>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="09:00"
              placeholderTextColor="#B0BEC5"
            />
          </View>

          {/* Priority */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>الأولوية</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  priority === 'high' && styles.optionButtonHigh,
                ]}
                onPress={() => setPriority('high')}
              >
                <Text
                  style={[
                    styles.optionText,
                    priority === 'high' && styles.optionTextActive,
                  ]}
                >
                  عالي
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  priority === 'medium' && styles.optionButtonMedium,
                ]}
                onPress={() => setPriority('medium')}
              >
                <Text
                  style={[
                    styles.optionText,
                    priority === 'medium' && styles.optionTextActive,
                  ]}
                >
                  متوسط
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  priority === 'low' && styles.optionButtonLow,
                ]}
                onPress={() => setPriority('low')}
              >
                <Text
                  style={[
                    styles.optionText,
                    priority === 'low' && styles.optionTextActive,
                  ]}
                >
                  منخفض
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>التصنيف</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="عام"
              placeholderTextColor="#B0BEC5"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'جاري الحفظ...' : 'حفظ المهمة'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A3A4A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A3A4A',
    borderWidth: 1,
    borderColor: '#D1DCE5',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1DCE5',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#2E7D8F',
    borderColor: '#2E7D8F',
  },
  optionButtonHigh: {
    backgroundColor: '#EF5350',
    borderColor: '#EF5350',
  },
  optionButtonMedium: {
    backgroundColor: '#FFA726',
    borderColor: '#FFA726',
  },
  optionButtonLow: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B8FA3',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#2E7D8F',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});