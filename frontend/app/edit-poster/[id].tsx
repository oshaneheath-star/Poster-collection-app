import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function EditPoster() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [imageBase64, setImageBase64] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extractingDate, setExtractingDate] = useState(false);

  useEffect(() => {
    fetchPoster();
  }, []);

  const fetchPoster = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/posters/${id}`);
      const poster = response.data;
      
      setTitle(poster.title);
      setLocation(poster.location);
      setDate(new Date(poster.date));
      setImageBase64(poster.image);
    } catch (error) {
      console.error('Error fetching poster:', error);
      Alert.alert('Error', 'Failed to load poster');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const extractDateFromImage = async (imageBase64: string) => {
    try {
      setExtractingDate(true);
      const response = await axios.post(`${BACKEND_URL}/api/extract-date`, {
        image: imageBase64,
      });

      if (response.data.success && response.data.date) {
        const extractedDate = new Date(response.data.date);
        setDate(extractedDate);
        Alert.alert(
          'Date Detected!',
          `Found date: ${response.data.date}. You can still edit it if needed.`
        );
      } else {
        Alert.alert(
          'No Date Found',
          'Could not detect a date from the poster. Please set it manually.'
        );
      }
    } catch (error) {
      console.error('Error extracting date:', error);
    } finally {
      setExtractingDate(false);
    }
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant permission to access your photo library.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setImageBase64(base64Image);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a title');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Validation Error', 'Please enter a location');
      return;
    }

    if (!imageBase64) {
      Alert.alert('Validation Error', 'Please select an image');
      return;
    }

    try {
      setSaving(true);
      await axios.put(`${BACKEND_URL}/api/posters/${id}`, {
        title: title.trim(),
        date: formatDate(date),
        location: location.trim(),
        image: imageBase64,
      });

      Alert.alert('Success', 'Poster updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error updating poster:', error);
      Alert.alert('Error', 'Failed to update poster');
    } finally {
      setSaving(false);
    }
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Poster</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
            {imageBase64 ? (
              <>
                <Image source={{ uri: imageBase64 }} style={styles.selectedImage} />
                <View style={styles.imageOverlay}>
                  <Ionicons name="camera" size={32} color="#FFFFFF" />
                  <Text style={styles.changeImageText}>Change Image</Text>
                </View>
              </>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={64} color="#CCCCCC" />
                <Text style={styles.imagePlaceholderText}>Tap to select poster image</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter poster title"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#999999"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Event Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#666666" />
              <Text style={styles.dateButtonText}>{formatDate(date)}</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter event location"
              value={location}
              onChangeText={setLocation}
              placeholderTextColor="#999999"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save" size={24} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  imagePickerButton: {
    width: '100%',
    height: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    alignItems: 'center',
  },
  changeImageText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999999',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333333',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
