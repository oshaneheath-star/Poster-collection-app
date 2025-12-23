import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { Calendar } from 'react-native-calendars';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface Poster {
  id: string;
  title: string;
  date: string;
  location: string;
  image: string;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    fetchPosters();
  }, []);

  const fetchPosters = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/posters`);
      setPosters(response.data);
    } catch (error) {
      console.error('Error fetching posters:', error);
      Alert.alert('Error', 'Failed to load posters');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePoster = async (posterId: string) => {
    Alert.alert(
      'Delete Poster',
      'Are you sure you want to delete this poster?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${BACKEND_URL}/api/posters/${posterId}`);
              fetchPosters();
              Alert.alert('Success', 'Poster deleted successfully');
            } catch (error) {
              console.error('Error deleting poster:', error);
              Alert.alert('Error', 'Failed to delete poster');
            }
          },
        },
      ]
    );
  };

  // Create marked dates for calendar
  const getMarkedDates = () => {
    const marked: any = {};
    posters.forEach((poster) => {
      const dateKey = poster.date;
      if (!marked[dateKey]) {
        marked[dateKey] = {
          marked: true,
          dotColor: '#4A90E2',
          selected: dateKey === selectedDate,
          selectedColor: '#4A90E2',
        };
      }
    });
    return marked;
  };

  // Get posters for selected date
  const getPostersForDate = (date: string) => {
    return posters.filter((poster) => poster.date === date);
  };

  // Filter posters by selected date or show all
  const displayedPosters = selectedDate
    ? getPostersForDate(selectedDate)
    : posters;

  const renderCalendarView = () => (
    <View style={styles.calendarContainer}>
      <Calendar
        markedDates={getMarkedDates()}
        onDayPress={(day) => {
          setSelectedDate(day.dateString);
        }}
        theme={{
          backgroundColor: '#FFFFFF',
          calendarBackground: '#FFFFFF',
          textSectionTitleColor: '#333333',
          selectedDayBackgroundColor: '#4A90E2',
          selectedDayTextColor: '#FFFFFF',
          todayTextColor: '#4A90E2',
          dayTextColor: '#2d4150',
          textDisabledColor: '#d9e1e8',
          dotColor: '#4A90E2',
          selectedDotColor: '#FFFFFF',
          arrowColor: '#4A90E2',
          monthTextColor: '#333333',
          textDayFontWeight: '500',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 14,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 12,
        }}
      />

      {selectedDate && (
        <View style={styles.selectedDateHeader}>
          <Text style={styles.selectedDateText}>
            Posters for {selectedDate}
          </Text>
          <TouchableOpacity
            onPress={() => setSelectedDate('')}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>Show All</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.postersListContainer}>
        {displayedPosters.length > 0 ? (
          displayedPosters.map((poster) => (
            <View key={poster.id} style={styles.posterCard}>
              <Image
                source={{ uri: poster.image }}
                style={styles.posterImage}
              />
              <View style={styles.posterInfo}>
                <Text style={styles.posterTitle}>{poster.title}</Text>
                <View style={styles.posterDetails}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.posterDetailText}>{poster.date}</Text>
                </View>
                <View style={styles.posterDetails}>
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <Text style={styles.posterDetailText}>{poster.location}</Text>
                </View>
              </View>
              <View style={styles.posterActions}>
                <TouchableOpacity
                  onPress={() => router.push(`/edit-poster/${poster.id}`)}
                  style={styles.actionButton}
                >
                  <Ionicons name="pencil" size={20} color="#4A90E2" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeletePoster(poster.id)}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash" size={20} color="#E74C3C" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            {selectedDate
              ? 'No posters for this date'
              : 'No posters yet. Add your first poster!'}
          </Text>
        )}
      </ScrollView>
    </View>
  );

  const renderListView = () => {
    // Group posters by month for better organization
    const groupedPosters: { [key: string]: Poster[] } = {};
    posters.forEach((poster) => {
      const date = new Date(poster.date);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groupedPosters[monthYear]) {
        groupedPosters[monthYear] = [];
      }
      groupedPosters[monthYear].push(poster);
    });

    return (
      <ScrollView style={styles.listContainer}>
        {posters.length > 0 ? (
          <>
            <View style={styles.listHeader}>
              <Ionicons name="list" size={20} color="#4A90E2" />
              <Text style={styles.listHeaderText}>
                Sorted by Date (Earliest to Latest)
              </Text>
            </View>
            {Object.keys(groupedPosters).map((monthYear) => (
              <View key={monthYear}>
                <Text style={styles.monthHeader}>{monthYear}</Text>
                {groupedPosters[monthYear].map((poster) => (
                  <View key={poster.id} style={styles.listItem}>
                    <Image
                      source={{ uri: poster.image }}
                      style={styles.listItemImage}
                    />
                    <View style={styles.listItemInfo}>
                      <Text style={styles.listItemTitle}>{poster.title}</Text>
                      <View style={styles.listItemDetails}>
                        <Ionicons name="calendar-outline" size={14} color="#666" />
                        <Text style={styles.listItemDetailText}>{poster.date}</Text>
                      </View>
                      <View style={styles.listItemDetails}>
                        <Ionicons name="location-outline" size={14} color="#666" />
                        <Text style={styles.listItemDetailText}>{poster.location}</Text>
                      </View>
                    </View>
                    <View style={styles.listItemActions}>
                      <TouchableOpacity
                        onPress={() => router.push(`/edit-poster/${poster.id}`)}
                        style={styles.listActionButton}
                      >
                        <Ionicons name="pencil" size={18} color="#4A90E2" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeletePoster(poster.id)}
                        style={styles.listActionButton}
                      >
                        <Ionicons name="trash" size={18} color="#E74C3C" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.emptyText}>No posters yet. Add your first poster!</Text>
        )}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Poster Collection</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
            style={styles.viewToggle}
          >
            <Ionicons
              name={viewMode === 'calendar' ? 'list' : 'calendar'}
              size={24}
              color="#4A90E2"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={fetchPosters}
            style={styles.refreshButton}
          >
            <Ionicons name="refresh" size={24} color="#4A90E2" />
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'calendar' ? renderCalendarView() : renderListView()}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-poster')}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  viewToggle: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  calendarContainer: {
    flex: 1,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#E3F2FD',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4A90E2',
    borderRadius: 16,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  postersListContainer: {
    flex: 1,
    padding: 16,
  },
  posterCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  posterImage: {
    width: 100,
    height: 120,
    resizeMode: 'cover',
  },
  posterInfo: {
    flex: 1,
    padding: 12,
  },
  posterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  posterDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  posterDetailText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666666',
  },
  posterActions: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listItemImage: {
    width: 80,
    height: 100,
    resizeMode: 'cover',
  },
  listItemInfo: {
    flex: 1,
    padding: 12,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 6,
  },
  listItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  listItemDetailText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#666666',
  },
  listItemActions: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  listActionButton: {
    padding: 6,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
    color: '#999999',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
