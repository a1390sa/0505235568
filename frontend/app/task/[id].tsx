import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [category, setCategory] = useState('general');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchTask();
  }, []);

  const fetchTask = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/${id}`);
      const data = await response.json();
      
      setName(data.name);
      setDate(data.date);
      setFrequency(data.frequency);
      setTime(data.time);
      setPriority(data.priority);
      setCategory(data.category);
      setCompleted(data.completed);
    } catch (error) {
      console.error('Error fetching task:', error);
      Alert.alert('خطأ', 'فشل تحميل بيانات المهمة');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المهمة');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/${id}`, {
        method: 'PUT',
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
          completed,
        }),
      });

      if (response.ok) {
        Alert.alert('نجح', 'تم تحديث المهمة بنجاح', [
          {
            text: 'حسناً',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('خطأ', 'فشل تحديث المهمة');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تحديث المهمة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذه المهمة؟',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/tasks/${id}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('نجح', 'تم حذف المهمة بنجاح', [
                  {
                    text: 'حسناً',
                    onPress: () => router.back(),
                  },
                ]);
              } else {
                Alert.alert('خطأ', 'فشل حذف المهمة');
              }
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('خطأ', 'حدث خطأ أثناء حذف المهمة');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2E7D8F" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>تفاصيل المهمة</Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={24} color="#EF5350" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Completed Toggle */}
          <TouchableOpacity
            style={[styles.completedToggle, completed && styles.completedToggleActive]}
            onPress={() => setCompleted(!completed)}
          >
            <Ionicons
              name={completed ? 'checkmark-circle' : 'ellipse-outline'}
              size={32}
              color={completed ? '#4CAF50' : '#D1DCE5'}
            />
            <Text style={[styles.completedText, completed && styles.completedTextActive]}>
              {completed ? 'تم الإنجاز' : 'غير مكتمل'}
            </Text>
          </TouchableOpacity>

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
            <Text style={styles.label}>التاريخ *</Text>
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
            <Text style={styles.label}>الوقت *</Text>
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
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
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
  deleteButton: {
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
  completedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#D1DCE5',
  },
  completedToggleActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  completedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B8FA3',
    marginLeft: 12,
  },
  completedTextActive: {
    color: '#4CAF50',
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
