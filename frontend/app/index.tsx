import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import * as Notifications from 'expo-notifications';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Task {
  id: string;
  userId: string;
  name: string;
  date: string;
  frequency: string;
  time: string;
  priority: string;
  category: string;
  completed: boolean;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function HomeScreen() {
  const router = useRouter();
  const { userId, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly'>('all');

  useEffect(() => {
    requestNotificationPermissions();
    fetchTasks();
  }, [filter, userId]);

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('تنبيه', 'لن تتلقى إشعارات للمهام بدون إذن الإشعارات');
    }
  };

  const fetchTasks = async () => {
    if (!userId) return;
    
    try {
      const url = filter === 'all' 
        ? `${BACKEND_URL}/api/tasks?userId=${userId}`
        : `${BACKEND_URL}/api/tasks?userId=${userId}&frequency=${filter}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setTasks(data);
      
      // Schedule notifications for tasks
      scheduleNotifications(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const scheduleNotifications = async (tasks: Task[]) => {
    // Skip notifications on web platform
    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web platform');
      return;
    }
    
    try {
      // Cancel all existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Schedule new notifications
      for (const task of tasks) {
        if (!task.completed) {
          try {
            const [hours, minutes] = task.time.split(':');
            const taskDate = new Date(task.date);
            taskDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            // Only schedule if task is in the future
            if (taskDate > new Date()) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: 'تذكير بالمهمة',
                  body: task.name,
                  data: { taskId: task.id },
                },
                trigger: taskDate,
              });
            }
            
            // For daily tasks, also schedule for tomorrow
            if (task.frequency === 'daily') {
              const tomorrow = new Date(taskDate);
              tomorrow.setDate(tomorrow.getDate() + 1);
              
              if (tomorrow > new Date()) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: 'تذكير بالمهمة اليومية',
                    body: task.name,
                    data: { taskId: task.id },
                  },
                  trigger: tomorrow,
                });
              }
            }
          } catch (error) {
            console.error('Error scheduling notification:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error with notifications:', error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, [filter, userId]);

  const toggleTaskComplete = async (taskId: string, completed: boolean) => {
    try {
      await fetch(`${BACKEND_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من تسجيل الخروج؟',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'تسجيل خروج',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#EF5350';
      case 'medium':
        return '#FFA726';
      case 'low':
        return '#4CAF50';
      default:
        return '#6B8FA3';
    }
  };

  const renderTask = (task: Task) => (
    <TouchableOpacity
      key={task.id}
      style={[styles.taskCard, task.completed && styles.taskCardCompleted]}
      onPress={() => router.push(`/task/${task.id}`)}
    >
      <View style={styles.taskHeader}>
        <TouchableOpacity
          onPress={() => toggleTaskComplete(task.id, task.completed)}
          style={styles.checkbox}
        >
          {task.completed ? (
            <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
          ) : (
            <Ionicons name="ellipse-outline" size={28} color="#D1DCE5" />
          )}
        </TouchableOpacity>
        
        <View style={styles.taskContent}>
          <Text style={[styles.taskName, task.completed && styles.taskNameCompleted]}>
            {task.name}
          </Text>
          <View style={styles.taskMeta}>
            <Ionicons name="time-outline" size={14} color="#6B8FA3" />
            <Text style={styles.taskTime}>{task.time}</Text>
            <Text style={styles.taskDate}>{task.date}</Text>
          </View>
        </View>

        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: getPriorityColor(task.priority) },
          ]}
        >
          <Text style={styles.priorityText}>
            {task.priority === 'high' ? 'عالي' : task.priority === 'medium' ? 'متوسط' : 'منخفض'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2E7D8F" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>مذكرة الخطة التنفيذية</Text>
          <Text style={styles.headerSubtitle}>مرحباً، {userId}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.importButton}
            onPress={() => router.push('/import')}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#EF5350" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            الكل
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'daily' && styles.filterTabActive]}
          onPress={() => setFilter('daily')}
        >
          <Text style={[styles.filterText, filter === 'daily' && styles.filterTextActive]}>
            يومي
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'weekly' && styles.filterTabActive]}
          onPress={() => setFilter('weekly')}
        >
          <Text style={[styles.filterText, filter === 'weekly' && styles.filterTextActive]}>
            أسبوعي
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tasks List */}
      <ScrollView
        style={styles.tasksList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D8F']} />
        }
      >
        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#D1DCE5" />
            <Text style={styles.emptyText}>لا توجد مهام</Text>
            <Text style={styles.emptySubtext}>
              قم بإضافة مهام جديدة أو استيراد من Excel
            </Text>
          </View>
        ) : (
          tasks.map(renderTask)
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-task')}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A3A4A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B8FA3',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  importButton: {
    backgroundColor: '#2E7D8F',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#FFE8E7',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F0F4F8',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#2E7D8F',
  },
  filterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B8FA3',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  tasksList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D8F',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  taskCardCompleted: {
    opacity: 0.6,
    borderLeftColor: '#D1DCE5',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A3A4A',
    marginBottom: 8,
  },
  taskNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B8FA3',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskTime: {
    fontSize: 14,
    color: '#6B8FA3',
  },
  taskDate: {
    fontSize: 14,
    color: '#6B8FA3',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A3A4A',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B8FA3',
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2E7D8F',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});