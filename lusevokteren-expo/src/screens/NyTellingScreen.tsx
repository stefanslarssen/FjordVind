import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { fetchLocations, fetchCages, createSample, Merd, FishObservation } from '../services/api';

export default function NyTellingScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [cages, setCages] = useState<Merd[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCage, setSelectedCage] = useState('');
  const [observations, setObservations] = useState<FishObservation[]>([
    { fish_id: '1', voksne_hunnlus: 0, bevegelige_lus: 0, fastsittende_lus: 0 },
  ]);
  const [temperatur, setTemperatur] = useState('');
  const [notat, setNotat] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadCages(selectedLocation);
    }
  }, [selectedLocation]);

  const loadLocations = async () => {
    try {
      const locs = await fetchLocations();
      setLocations(locs);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadCages = async (locationId: string) => {
    try {
      const c = await fetchCages(locationId);
      setCages(c);
      if (c.length > 0) {
        setSelectedCage(c[0].id);
      }
    } catch (error) {
      console.error('Error loading cages:', error);
    }
  };

  const addFish = (count: number = 1) => {
    const newObs: FishObservation[] = [];
    for (let i = 0; i < count; i++) {
      const newId = (observations.length + i + 1).toString();
      newObs.push({ fish_id: newId, voksne_hunnlus: 0, bevegelige_lus: 0, fastsittende_lus: 0 });
    }
    setObservations([...observations, ...newObs]);
  };

  const removeFish = (index: number) => {
    if (observations.length > 1) {
      setObservations(observations.filter((_, i) => i !== index));
    }
  };

  const updateObservation = (index: number, field: keyof FishObservation, value: number) => {
    const updated = [...observations];
    updated[index] = { ...updated[index], [field]: value };
    setObservations(updated);
  };

  const getTotalLice = () => {
    return observations.reduce((sum, o) => sum + o.voksne_hunnlus, 0);
  };

  const getAvgLice = () => {
    if (observations.length === 0) return 0;
    return getTotalLice() / observations.length;
  };

  const getStatusColor = () => {
    const avg = getAvgLice();
    if (avg >= 0.5) return '#ef4444';
    if (avg >= 0.2) return '#f59e0b';
    return '#22c55e';
  };

  const handleSubmit = async () => {
    if (!selectedCage) {
      Alert.alert('Feil', 'Velg en merd');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const dato = now.toISOString().split('T')[0];
      const tidspunkt = now.toTimeString().slice(0, 5);

      await createSample(
        selectedCage,
        user?.id || '',
        dato,
        tidspunkt,
        observations,
        temperatur ? parseFloat(temperatur) : undefined,
        notat || undefined
      );

      Alert.alert('Suksess', 'Telling lagret!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Feil', error.message || 'Kunne ikke lagre telling');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Ny Telling</Text>

      {/* Location Picker */}
      <Text style={styles.label}>Lokalitet</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedLocation}
          onValueChange={setSelectedLocation}
          style={styles.picker}
          dropdownIconColor="#fff"
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="Velg lokalitet..." value="" color="#94a3b8" />
          {locations.map((loc) => (
            <Picker.Item key={loc.id} label={loc.name} value={loc.id} color="#0f172a" />
          ))}
        </Picker>
      </View>

      {/* Cage Picker */}
      <Text style={styles.label}>Merd</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedCage}
          onValueChange={setSelectedCage}
          style={styles.picker}
          dropdownIconColor="#fff"
          itemStyle={styles.pickerItem}
          enabled={cages.length > 0}
        >
          <Picker.Item label="Velg merd..." value="" color="#94a3b8" />
          {cages.map((cage) => (
            <Picker.Item key={cage.id} label={cage.navn || cage.merd_id} value={cage.id} color="#0f172a" />
          ))}
        </Picker>
      </View>

      {/* Temperature */}
      <Text style={styles.label}>Temperatur (valgfritt)</Text>
      <TextInput
        style={styles.input}
        placeholder="f.eks. 8.5"
        placeholderTextColor="#64748b"
        value={temperatur}
        onChangeText={setTemperatur}
        keyboardType="decimal-pad"
      />

      {/* Fish Observations */}
      <View style={styles.fishHeader}>
        <Text style={styles.label}>Fisk ({observations.length})</Text>
        <View style={styles.addButtonsRow}>
          <TouchableOpacity style={styles.addButton} onPress={() => addFish(1)}>
            <Text style={styles.addButtonText}>+1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => addFish(5)}>
            <Text style={styles.addButtonText}>+5</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => addFish(10)}>
            <Text style={styles.addButtonText}>+10</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => addFish(20)}>
            <Text style={styles.addButtonText}>+20</Text>
          </TouchableOpacity>
        </View>
      </View>

      {observations.map((obs, index) => (
        <View key={index} style={styles.fishCard}>
          <View style={styles.fishCardHeader}>
            <Text style={styles.fishNumber}>Fisk #{index + 1}</Text>
            {observations.length > 1 && (
              <TouchableOpacity onPress={() => removeFish(index)}>
                <Text style={styles.removeText}>Fjern</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.liceRow}>
            <View style={styles.liceInput}>
              <Text style={styles.liceLabel}>Voksne hunnlus</Text>
              <TextInput
                style={styles.liceField}
                value={obs.voksne_hunnlus.toString()}
                onChangeText={(v) => updateObservation(index, 'voksne_hunnlus', parseInt(v) || 0)}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.liceInput}>
              <Text style={styles.liceLabel}>Bevegelige</Text>
              <TextInput
                style={styles.liceField}
                value={obs.bevegelige_lus.toString()}
                onChangeText={(v) => updateObservation(index, 'bevegelige_lus', parseInt(v) || 0)}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.liceInput}>
              <Text style={styles.liceLabel}>Fastsittende</Text>
              <TextInput
                style={styles.liceField}
                value={obs.fastsittende_lus.toString()}
                onChangeText={(v) => updateObservation(index, 'fastsittende_lus', parseInt(v) || 0)}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>
      ))}

      {/* Stats */}
      <View style={[styles.statsCard, { borderLeftColor: getStatusColor() }]}>
        <Text style={styles.statsTitle}>Oppsummering</Text>
        <Text style={styles.statsText}>
          Snitt voksne hunnlus: <Text style={{ color: getStatusColor() }}>{getAvgLice().toFixed(2)}</Text>
        </Text>
        <Text style={styles.statsText}>Totalt: {getTotalLice()} lus på {observations.length} fisk</Text>
      </View>

      {/* Notes */}
      <Text style={styles.label}>Notat (valgfritt)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Eventuelle notater..."
        placeholderTextColor="#64748b"
        value={notat}
        onChangeText={setNotat}
        multiline
        numberOfLines={3}
      />

      {/* Submit */}
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Lagre Telling</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    backgroundColor: '#1e293b',
  },
  pickerItem: {
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fishHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  fishCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  fishCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fishNumber: {
    color: '#fff',
    fontWeight: '600',
  },
  removeText: {
    color: '#ef4444',
  },
  liceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  liceInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  liceLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  liceField: {
    backgroundColor: '#0f172a',
    borderRadius: 6,
    padding: 10,
    color: '#fff',
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  statsTitle: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  statsText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
