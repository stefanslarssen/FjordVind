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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { fetchTreatments, fetchCages, createTreatment, updateTreatmentStatus, Treatment, Merd } from '../services/api';

const TREATMENT_TYPES = [
  { value: 'THERMOLICER', label: 'Thermolicer (varmtvann)' },
  { value: 'HYDROLICER', label: 'Hydrolicer (mekanisk)' },
  { value: 'OPTILICER', label: 'Optilicer (trykkluft)' },
  { value: 'LUSESKJORT', label: 'Luseskjørt' },
  { value: 'RENSEFISK', label: 'Rensefisk' },
  { value: 'MEDIKAMENTELL', label: 'Medikamentell' },
  { value: 'FERSKVANN', label: 'Ferskvannsbad' },
  { value: 'LASER', label: 'Laser' },
  { value: 'ANNET', label: 'Annet' },
];

const STATUS_COLORS: Record<string, string> = {
  'PLANNED': '#3b82f6',
  'CONFIRMED': '#8b5cf6',
  'IN_PROGRESS': '#f59e0b',
  'COMPLETED': '#22c55e',
  'CANCELLED': '#64748b',
};

const STATUS_LABELS: Record<string, string> = {
  'PLANNED': 'Planlagt',
  'CONFIRMED': 'Bekreftet',
  'IN_PROGRESS': 'Pågår',
  'COMPLETED': 'Fullført',
  'CANCELLED': 'Avlyst',
};

export default function BehandlingerScreen() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [cages, setCages] = useState<Merd[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'completed' | 'all'>('upcoming');

  // New treatment form
  const [selectedCage, setSelectedCage] = useState('');
  const [treatmentType, setTreatmentType] = useState('THERMOLICER');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [treatmentData, cageData] = await Promise.all([
        fetchTreatments({ status: filter === 'completed' ? 'COMPLETED' : undefined }),
        fetchCages(),
      ]);

      let filtered = treatmentData;
      if (filter === 'upcoming') {
        filtered = treatmentData.filter((t: Treatment) =>
          ['PLANNED', 'CONFIRMED', 'IN_PROGRESS'].includes(t.status)
        );
      } else if (filter === 'completed') {
        filtered = treatmentData.filter((t: Treatment) => t.status === 'COMPLETED');
      }

      setTreatments(filtered);
      setCages(cageData);
      if (cageData.length > 0 && !selectedCage) {
        setSelectedCage(cageData[0].id);
      }
    } catch (error) {
      console.error('Error loading treatments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateTreatment = async () => {
    if (!selectedCage || !scheduledDate) {
      Alert.alert('Feil', 'Velg merd og dato');
      return;
    }

    setSubmitting(true);
    try {
      await createTreatment(selectedCage, treatmentType, scheduledDate, notes);
      setModalVisible(false);
      setNotes('');
      setScheduledDate('');
      loadData();
      Alert.alert('Suksess', 'Behandling planlagt');
    } catch (error) {
      console.error('Error creating treatment:', error);
      Alert.alert('Feil', 'Kunne ikke opprette behandling');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (treatmentId: string, newStatus: string) => {
    try {
      await updateTreatmentStatus(treatmentId, newStatus);
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Feil', 'Kunne ikke oppdatere status');
    }
  };

  const getTreatmentTypeLabel = (type: string) => {
    const found = TREATMENT_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

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
        <Text style={styles.title}>Behandlinger</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Ny</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'upcoming' && styles.filterTabActive]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>
            Kommende
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Fullførte
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Alle
          </Text>
        </TouchableOpacity>
      </View>

      {/* Treatment list */}
      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {treatments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#3b82f6" />
            <Text style={styles.emptyText}>Ingen behandlinger</Text>
            <Text style={styles.emptySubtext}>Trykk + for å planlegge</Text>
          </View>
        ) : (
          treatments.map((treatment) => (
            <View key={treatment.id} style={styles.treatmentCard}>
              <View style={styles.treatmentHeader}>
                <View>
                  <Text style={styles.treatmentType}>
                    {getTreatmentTypeLabel(treatment.treatment_type)}
                  </Text>
                  <Text style={styles.treatmentMerd}>
                    {(treatment as any).merds?.lokalitet} - {(treatment as any).merds?.navn}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[treatment.status] }]}>
                  <Text style={styles.statusText}>{STATUS_LABELS[treatment.status]}</Text>
                </View>
              </View>

              <View style={styles.treatmentDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Dato:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(treatment.scheduled_date).toLocaleDateString('nb-NO')}
                  </Text>
                </View>
                {treatment.notes && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Notater:</Text>
                    <Text style={styles.detailValue}>{treatment.notes}</Text>
                  </View>
                )}
              </View>

              {/* Status actions */}
              {treatment.status !== 'COMPLETED' && treatment.status !== 'CANCELLED' && (
                <View style={styles.treatmentActions}>
                  {treatment.status === 'PLANNED' && (
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: '#8b5cf6' }]}
                      onPress={() => handleUpdateStatus(treatment.id, 'CONFIRMED')}
                    >
                      <Text style={styles.statusButtonText}>Bekreft</Text>
                    </TouchableOpacity>
                  )}
                  {treatment.status === 'CONFIRMED' && (
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: '#f59e0b' }]}
                      onPress={() => handleUpdateStatus(treatment.id, 'IN_PROGRESS')}
                    >
                      <Text style={styles.statusButtonText}>Start</Text>
                    </TouchableOpacity>
                  )}
                  {treatment.status === 'IN_PROGRESS' && (
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: '#22c55e' }]}
                      onPress={() => handleUpdateStatus(treatment.id, 'COMPLETED')}
                    >
                      <Text style={styles.statusButtonText}>Fullfør</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#64748b' }]}
                    onPress={() => handleUpdateStatus(treatment.id, 'CANCELLED')}
                  >
                    <Text style={styles.statusButtonText}>Avlys</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* New Treatment Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ny behandling</Text>

            <Text style={styles.inputLabel}>Merd</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCage}
                onValueChange={setSelectedCage}
                style={styles.picker}
                dropdownIconColor="#fff"
              >
                {cages.map((cage) => (
                  <Picker.Item
                    key={cage.id}
                    label={`${cage.lokalitet} - ${cage.navn}`}
                    value={cage.id}
                    color="#000"
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Type behandling</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={treatmentType}
                onValueChange={setTreatmentType}
                style={styles.picker}
                dropdownIconColor="#fff"
              >
                {TREATMENT_TYPES.map((type) => (
                  <Picker.Item
                    key={type.value}
                    label={type.label}
                    value={type.value}
                    color="#000"
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Dato (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={scheduledDate}
              onChangeText={setScheduledDate}
              placeholder="2026-02-20"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.inputLabel}>Notater (valgfritt)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Tilleggsinformasjon..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateTreatment}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Opprett</Text>
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
  treatmentCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  treatmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  treatmentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  treatmentMerd: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  treatmentDetails: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    width: 70,
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  treatmentActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 6,
  },
  pickerContainer: {
    backgroundColor: '#334155',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    height: 50,
  },
  input: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
