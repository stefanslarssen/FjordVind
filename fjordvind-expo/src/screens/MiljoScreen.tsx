import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { fetchEnvironment, fetchLocations, createEnvironmentReading, EnvironmentReading } from '../services/api';

const { width } = Dimensions.get('window');

export default function MiljoScreen() {
  const [readings, setReadings] = useState<EnvironmentReading[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // New reading form
  const [newTemperature, setNewTemperature] = useState('');
  const [newOxygen, setNewOxygen] = useState('');
  const [newSalinity, setNewSalinity] = useState('');
  const [newPh, setNewPh] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [envData, locData] = await Promise.all([
        fetchEnvironment({ locality: selectedLocation || undefined }),
        fetchLocations(),
      ]);
      setReadings(envData);
      setLocations(locData);
    } catch (error) {
      console.error('Error loading environment data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedLocation]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateReading = async () => {
    if (!newTemperature && !newOxygen && !newSalinity && !newPh) {
      Alert.alert('Feil', 'Fyll inn minst én verdi');
      return;
    }

    setSubmitting(true);
    try {
      await createEnvironmentReading({
        locality: selectedLocation || locations[0]?.name,
        temperature: newTemperature ? parseFloat(newTemperature) : undefined,
        oxygen: newOxygen ? parseFloat(newOxygen) : undefined,
        salinity: newSalinity ? parseFloat(newSalinity) : undefined,
        ph: newPh ? parseFloat(newPh) : undefined,
      });
      setModalVisible(false);
      setNewTemperature('');
      setNewOxygen('');
      setNewSalinity('');
      setNewPh('');
      loadData();
      Alert.alert('Suksess', 'Måling registrert');
    } catch (error) {
      console.error('Error creating reading:', error);
      Alert.alert('Feil', 'Kunne ikke lagre måling');
    } finally {
      setSubmitting(false);
    }
  };

  const getLatestReadings = () => {
    if (readings.length === 0) return null;
    const latest = readings[0];
    return {
      temperature: latest.temperature_celsius,
      oxygen: latest.oxygen_percent,
      salinity: latest.salinity_ppt,
      ph: latest.ph,
      timestamp: latest.timestamp,
    };
  };

  const getStatusColor = (type: string, value: number | undefined) => {
    if (value === undefined || value === null) return '#64748b';

    switch (type) {
      case 'temperature':
        if (value < 4 || value > 18) return '#ef4444';
        if (value < 6 || value > 16) return '#f59e0b';
        return '#22c55e';
      case 'oxygen':
        if (value < 60) return '#ef4444';
        if (value < 70) return '#f59e0b';
        return '#22c55e';
      case 'salinity':
        if (value < 25 || value > 38) return '#f59e0b';
        return '#22c55e';
      case 'ph':
        if (value < 7.0 || value > 8.5) return '#f59e0b';
        return '#22c55e';
      default:
        return '#64748b';
    }
  };

  const latest = getLatestReadings();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Miljødata</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Ny</Text>
        </TouchableOpacity>
      </View>

      {/* Location filter */}
      <View style={styles.filterContainer}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedLocation}
            onValueChange={setSelectedLocation}
            style={styles.picker}
            dropdownIconColor="#fff"
          >
            <Picker.Item label="Alle lokaliteter" value="" color="#000" />
            {locations.map((loc) => (
              <Picker.Item key={loc.id} label={loc.name} value={loc.name} color="#000" />
            ))}
          </Picker>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current readings cards */}
        {latest && (
          <View style={styles.currentSection}>
            <Text style={styles.sectionTitle}>Siste målinger</Text>
            <Text style={styles.timestamp}>
              {new Date(latest.timestamp).toLocaleString('nb-NO')}
            </Text>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: getStatusColor('temperature', latest.temperature) }]}>
                  <Text style={styles.metricIconText}>°C</Text>
                </View>
                <Text style={styles.metricValue}>
                  {latest.temperature?.toFixed(1) ?? '-'}
                </Text>
                <Text style={styles.metricLabel}>Temperatur</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: getStatusColor('oxygen', latest.oxygen) }]}>
                  <Text style={styles.metricIconText}>O₂</Text>
                </View>
                <Text style={styles.metricValue}>
                  {latest.oxygen?.toFixed(0) ?? '-'}%
                </Text>
                <Text style={styles.metricLabel}>Oksygen</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: getStatusColor('salinity', latest.salinity) }]}>
                  <Text style={styles.metricIconText}>‰</Text>
                </View>
                <Text style={styles.metricValue}>
                  {latest.salinity?.toFixed(1) ?? '-'}
                </Text>
                <Text style={styles.metricLabel}>Salinitet</Text>
              </View>

              <View style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: getStatusColor('ph', latest.ph) }]}>
                  <Text style={styles.metricIconText}>pH</Text>
                </View>
                <Text style={styles.metricValue}>
                  {latest.ph?.toFixed(1) ?? '-'}
                </Text>
                <Text style={styles.metricLabel}>pH-verdi</Text>
              </View>
            </View>
          </View>
        )}

        {/* Historical readings */}
        <Text style={styles.sectionTitle}>Historikk</Text>
        {readings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={48} color="#3b82f6" />
            <Text style={styles.emptyText}>Ingen målinger</Text>
            <Text style={styles.emptySubtext}>Trykk + for å registrere</Text>
          </View>
        ) : (
          readings.slice(0, 20).map((reading, index) => (
            <View key={reading.id || index} style={styles.readingCard}>
              <View style={styles.readingHeader}>
                <Text style={styles.readingTime}>
                  {new Date(reading.timestamp).toLocaleString('nb-NO')}
                </Text>
                {reading.locality && (
                  <Text style={styles.readingLocation}>{reading.locality}</Text>
                )}
              </View>
              <View style={styles.readingValues}>
                {reading.temperature_celsius !== undefined && (
                  <View style={styles.readingValue}>
                    <Text style={styles.readingValueLabel}>Temp</Text>
                    <Text style={styles.readingValueText}>{reading.temperature_celsius}°C</Text>
                  </View>
                )}
                {reading.oxygen_percent !== undefined && (
                  <View style={styles.readingValue}>
                    <Text style={styles.readingValueLabel}>O₂</Text>
                    <Text style={styles.readingValueText}>{reading.oxygen_percent}%</Text>
                  </View>
                )}
                {reading.salinity_ppt !== undefined && (
                  <View style={styles.readingValue}>
                    <Text style={styles.readingValueLabel}>Sal</Text>
                    <Text style={styles.readingValueText}>{reading.salinity_ppt}‰</Text>
                  </View>
                )}
                {reading.ph !== undefined && (
                  <View style={styles.readingValue}>
                    <Text style={styles.readingValueLabel}>pH</Text>
                    <Text style={styles.readingValueText}>{reading.ph}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* New Reading Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ny miljømåling</Text>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Temperatur (°C)</Text>
                <TextInput
                  style={styles.input}
                  value={newTemperature}
                  onChangeText={setNewTemperature}
                  placeholder="8.5"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Oksygen (%)</Text>
                <TextInput
                  style={styles.input}
                  value={newOxygen}
                  onChangeText={setNewOxygen}
                  placeholder="95"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Salinitet (‰)</Text>
                <TextInput
                  style={styles.input}
                  value={newSalinity}
                  onChangeText={setNewSalinity}
                  placeholder="34.0"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>pH</Text>
                <TextInput
                  style={styles.input}
                  value={newPh}
                  onChangeText={setNewPh}
                  placeholder="7.8"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateReading}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Lagre</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  pickerContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    height: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  currentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    width: (width - 44) / 2,
    alignItems: 'center',
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIconText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  readingCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  readingTime: {
    fontSize: 14,
    color: '#94a3b8',
  },
  readingLocation: {
    fontSize: 14,
    color: '#64748b',
  },
  readingValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  readingValue: {
    alignItems: 'center',
  },
  readingValueLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  readingValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
