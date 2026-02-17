import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { fetchLocations, fetchCages, Merd } from '../services/api';
import { supabase } from '../config/supabase';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import DateTimePicker from '@react-native-community/datetimepicker';

// Web Speech API for web platform
const getSpeechRecognition = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  }
  return null;
};

// Grouped mortality causes
const ARSAK_KATEGORIER = {
  'Normal': [
    { value: 'Naturlig', label: 'Naturlig dodlighet' },
    { value: 'Ukjent', label: 'Ukjent arsak' },
  ],
  'Sykdom': [
    { value: 'PD', label: 'PD (Pancreas Disease)' },
    { value: 'ILA', label: 'ILA (Infeksios lakseanemi)' },
    { value: 'CMS', label: 'CMS (Hjertesprekk)' },
    { value: 'AGD', label: 'AGD (Amobegjellesykdom)' },
    { value: 'Vintersaar', label: 'Vintersaar' },
    { value: 'Bakteriell', label: 'Bakteriell infeksjon' },
    { value: 'Parasitter', label: 'Parasitter' },
  ],
  'Behandling': [
    { value: 'Avlusning_mekanisk', label: 'Avlusning - mekanisk' },
    { value: 'Avlusning_termisk', label: 'Avlusning - termisk' },
    { value: 'Avlusning_medisinsk', label: 'Avlusning - medisinsk' },
    { value: 'Ferskvannsbehandling', label: 'Ferskvannsbehandling' },
    { value: 'Vaksinering', label: 'Vaksinering' },
  ],
  'Haandtering': [
    { value: 'Trenging', label: 'Trenging' },
    { value: 'Sortering', label: 'Sortering' },
    { value: 'Transport', label: 'Transport' },
    { value: 'Notskifte', label: 'Notskifte' },
  ],
  'Predator': [
    { value: 'Sel', label: 'Sel' },
    { value: 'Oter', label: 'Oter' },
    { value: 'Fugl', label: 'Fugl' },
  ],
  'Miljo': [
    { value: 'Algeoppblomstring', label: 'Algeoppblomstring' },
    { value: 'Manet', label: 'Manet' },
    { value: 'Oksygenmangel', label: 'Oksygenmangel' },
    { value: 'Temperaturstress', label: 'Temperaturstress' },
  ],
  'Annet': [
    { value: 'Romming', label: 'Romming (gjenfanget dod)' },
    { value: 'Annet', label: 'Annet' },
  ],
};

const grunnlagOptions = ['Velg...', 'Observert', 'Estimert', 'Telt'];

interface MerdRow {
  id: string;
  navn: string;
  laks: string;
  leppefisk: string;
  arsak: string;
  grunnlag: string;
}

export default function DodlighetScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [merdRows, setMerdRows] = useState<MerdRow[]>([]);
  const [dato, setDato] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [klokkeslett, setKlokkeslett] = useState('');
  const [temperatur, setTemperatur] = useState('');
  const [notat, setNotat] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showArsakModal, setShowArsakModal] = useState(false);
  const [activeArsakIndex, setActiveArsakIndex] = useState<number | null>(null);

  // Voice recognition
  const [isListening, setIsListening] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<{ index: number; field: 'laks' | 'leppefisk' } | null>(null);
  const recognitionRef = useRef<any>(null);

  // Native speech recognition event handlers (for iOS/Android)
  useSpeechRecognitionEvent('result', (event) => {
    if (activeVoiceField && event.results && event.results.length > 0) {
      const transcript = event.results[0]?.transcript?.toLowerCase() || '';
      console.log('Native heard:', transcript);
      const num = parseNumberFromSpeech(transcript);
      if (num !== null) {
        const currentValue = parseInt(merdRows[activeVoiceField.index][activeVoiceField.field]) || 0;
        updateMerdRow(activeVoiceField.index, activeVoiceField.field, (currentValue + num).toString());
      } else {
        Alert.alert('Stemme', `Horte: "${transcript}" - kunne ikke tolke som tall`);
      }
    }
    setIsListening(false);
    setActiveVoiceField(null);
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error('Native speech error:', event.error);
    setIsListening(false);
    setActiveVoiceField(null);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    setActiveVoiceField(null);
  });

  const stopVoiceInput = () => {
    if (Platform.OS !== 'web') {
      ExpoSpeechRecognitionModule.stop();
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setActiveVoiceField(null);
  };

  const toggleVoiceInput = async (index: number, field: 'laks' | 'leppefisk') => {
    if (isListening) {
      stopVoiceInput();
      return;
    }
    startVoiceInput(index, field);
  };

  const startVoiceInput = async (index: number, field: 'laks' | 'leppefisk') => {
    // Use native speech recognition on mobile
    if (Platform.OS !== 'web') {
      try {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
          Alert.alert('Tillatelse', 'Mikrofontilgang er nodvendig for stemmegjenkjenning');
          return;
        }

        setActiveVoiceField({ index, field });
        setIsListening(true);

        ExpoSpeechRecognitionModule.start({
          lang: 'no-NO',
          interimResults: false,
          continuous: false,
        });
      } catch (err: any) {
        console.error('Native speech error:', err);
        Alert.alert('Feil', err.message || 'Kunne ikke starte stemmegjenkjenning');
        setIsListening(false);
        setActiveVoiceField(null);
      }
      return;
    }

    // Web Speech API for web platform
    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      window.alert('Stemmegjenkjenning stottes ikke i denne nettleseren. Bruk Chrome.');
      return;
    }

    // Request microphone permission first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
    } catch (err) {
      window.alert('Mikrofontilgang nektet. Tillat mikrofon i nettleserinnstillingene.');
      return;
    }

    setActiveVoiceField({ index, field });
    setIsListening(true);

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'no-NO';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log('Heard:', transcript);
        const num = parseNumberFromSpeech(transcript);
        if (num !== null) {
          const currentValue = parseInt(merdRows[index][field]) || 0;
          updateMerdRow(index, field, (currentValue + num).toString());
        } else {
          window.alert('Horte: "' + transcript + '" - kunne ikke tolke som tall');
        }
        setIsListening(false);
        setActiveVoiceField(null);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech error:', event.error);
        setIsListening(false);
        setActiveVoiceField(null);
      };

      recognition.onend = () => {
        setIsListening(false);
        setActiveVoiceField(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
      console.log('Voice recognition started');
    } catch (err: any) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
      setActiveVoiceField(null);
      window.alert('Feil: ' + err.message);
    }
  };

  const parseNumberFromSpeech = (text: string): number | null => {
    // Direct number
    const directNum = parseInt(text.replace(/\D/g, ''));
    if (!isNaN(directNum)) return directNum;

    // Norwegian number words
    const numberWords: Record<string, number> = {
      'null': 0, 'en': 1, 'ett': 1, 'to': 2, 'tre': 3, 'fire': 4, 'fem': 5,
      'seks': 6, 'syv': 7, 'sju': 7, 'atte': 8, 'ni': 9, 'ti': 10,
      'elleve': 11, 'tolv': 12, 'tretten': 13, 'fjorten': 14, 'femten': 15,
      'seksten': 16, 'sytten': 17, 'atten': 18, 'nitten': 19, 'tjue': 20,
      'tretti': 30, 'forti': 40, 'femti': 50, 'seksti': 60, 'sytti': 70,
      'atti': 80, 'nitti': 90, 'hundre': 100,
    };

    for (const [word, num] of Object.entries(numberWords)) {
      if (text.includes(word)) return num;
    }
    return null;
  };

  useEffect(() => {
    loadLocationsData();
    // Set current time
    const now = new Date();
    setKlokkeslett(now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }));
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadMerds(selectedLocation);
    }
  }, [selectedLocation]);

  const loadLocationsData = async () => {
    try {
      const locs = await fetchLocations();
      setLocations(locs);
      if (locs.length > 0) {
        setSelectedLocation(locs[0].id);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadMerds = async (locationId: string) => {
    try {
      const cages = await fetchCages(locationId);
      const rows: MerdRow[] = cages.map((m: Merd) => ({
        id: m.id,
        navn: m.navn || m.merd_id,
        laks: '0',
        leppefisk: '0',
        arsak: '',
        grunnlag: '',
      }));
      setMerdRows(rows);
    } catch (error) {
      console.error('Error loading merds:', error);
    }
  };

  const updateMerdRow = (index: number, field: keyof MerdRow, value: string) => {
    const updated = [...merdRows];
    updated[index] = { ...updated[index], [field]: value };
    setMerdRows(updated);
  };

  const getTotalLaks = () => merdRows.reduce((sum, r) => sum + (parseInt(r.laks) || 0), 0);
  const getTotalLeppefisk = () => merdRows.reduce((sum, r) => sum + (parseInt(r.leppefisk) || 0), 0);

  const formatDate = (date: Date) => {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDato(selectedDate);
    }
  };

  const openArsakModal = (index: number) => {
    setActiveArsakIndex(index);
    setShowArsakModal(true);
  };

  const selectArsak = (value: string) => {
    if (activeArsakIndex !== null) {
      updateMerdRow(activeArsakIndex, 'arsak', value);
    }
    setShowArsakModal(false);
    setActiveArsakIndex(null);
  };

  const getArsakLabel = (value: string): string => {
    for (const category of Object.values(ARSAK_KATEGORIER)) {
      const found = category.find(a => a.value === value);
      if (found) return found.label;
    }
    return value || 'Velg arsak...';
  };

  const handleSubmit = async () => {
    const rowsWithData = merdRows.filter(r => (parseInt(r.laks) || 0) > 0 || (parseInt(r.leppefisk) || 0) > 0);

    if (rowsWithData.length === 0) {
      Alert.alert('Feil', 'Legg inn minst en dodlighet');
      return;
    }

    setLoading(true);
    try {
      const records = rowsWithData.map(r => ({
        merd_id: r.id,
        user_id: user?.id,
        dato: dato.toISOString().split('T')[0],
        antall_dode: (parseInt(r.laks) || 0) + (parseInt(r.leppefisk) || 0),
        laks: parseInt(r.laks) || 0,
        leppefisk: parseInt(r.leppefisk) || 0,
        arsak: r.arsak || 'Ukjent',
        grunnlag: r.grunnlag || null,
        notat: notat || null,
        temperatur: temperatur ? parseFloat(temperatur) : null,
      }));

      const { error } = await supabase
        .from('mortality_records')
        .insert(records);

      if (error) throw error;

      Alert.alert('Suksess', 'Dodlighet registrert!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error saving mortality:', error);
      Alert.alert('Feil', error.message || 'Kunne ikke lagre');
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
      {/* Velg lokasjon */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Velg lokasjon</Text>
        <Text style={styles.label}>Lokalitet</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedLocation}
            onValueChange={setSelectedLocation}
            style={styles.picker}
            dropdownIconColor="#fff"
          >
            <Picker.Item label="Velg lokalitet..." value="" color="#fff" />
            {locations.map((loc) => (
              <Picker.Item key={loc.id} label={loc.name} value={loc.id} color="#fff" />
            ))}
          </Picker>
        </View>
        <Text style={styles.helpText}>{merdRows.length} merder funnet</Text>
      </View>

      {/* Tidspunkt */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tidspunkt</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Dato</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
              <Text style={styles.dateButtonText}>{formatDate(dato)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dato}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Klokkeslett</Text>
            <TextInput
              style={styles.input}
              value={klokkeslett}
              onChangeText={setKlokkeslett}
              placeholder="HH:MM"
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Temp (C)</Text>
            <TextInput
              style={styles.input}
              value={temperatur}
              onChangeText={setTemperatur}
              placeholder="12.5"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </View>

      {/* Dodelighetregistrering */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Dodelighetregistrering</Text>
          <View style={styles.totals}>
            <Text style={styles.totalText}>Laks: <Text style={styles.totalNumber}>{getTotalLaks()}</Text></Text>
            <Text style={styles.totalText}>Leppefisk: <Text style={styles.totalNumber}>{getTotalLeppefisk()}</Text></Text>
          </View>
        </View>

        {/* Voice status */}
        {isListening && (
          <View style={styles.voiceStatus}>
            <Ionicons name="mic" size={20} color="#ef4444" />
            <Text style={styles.voiceStatusText}>Lytter... Si et tall</Text>
          </View>
        )}

        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.merdCell]}>Merd</Text>
          <Text style={[styles.headerCell, styles.numberCell]}>Laks</Text>
          <Text style={[styles.headerCell, styles.numberCell]}>Leppefisk</Text>
        </View>

        {/* Merd rows */}
        {merdRows.map((row, index) => (
          <View key={row.id} style={styles.merdSection}>
            <View style={styles.tableRow}>
              <Text style={[styles.cell, styles.merdCell]}>{row.navn}</Text>
              <TextInput
                style={[styles.cellInput, styles.numberCell]}
                value={row.laks}
                onChangeText={(v) => updateMerdRow(index, 'laks', v)}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <TextInput
                style={[styles.cellInput, styles.numberCell]}
                value={row.leppefisk}
                onChangeText={(v) => updateMerdRow(index, 'leppefisk', v)}
                keyboardType="number-pad"
                selectTextOnFocus
              />
            </View>
            {/* Quick buttons */}
            <View style={styles.quickButtonsRow}>
              <Text style={styles.quickLabel}>Laks:</Text>
              {[5, 10, 15, 20].map((num) => (
                <TouchableOpacity
                  key={`laks-${num}`}
                  style={styles.quickBtn}
                  onPress={() => updateMerdRow(index, 'laks', ((parseInt(row.laks) || 0) + num).toString())}
                >
                  <Text style={styles.quickBtnText}>+{num}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => updateMerdRow(index, 'laks', '0')}
              >
                <Text style={styles.resetBtnText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voiceBtn, isListening && activeVoiceField?.index === index && activeVoiceField?.field === 'laks' && styles.voiceBtnActive]}
                onPress={() => toggleVoiceInput(index, 'laks')}
              >
                <Ionicons
                  name={isListening && activeVoiceField?.index === index && activeVoiceField?.field === 'laks' ? 'mic' : 'mic-outline'}
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
            <View style={styles.quickButtonsRow}>
              <Text style={styles.quickLabel}>Leppefisk:</Text>
              {[5, 10, 15, 20].map((num) => (
                <TouchableOpacity
                  key={`leppe-${num}`}
                  style={styles.quickBtn}
                  onPress={() => updateMerdRow(index, 'leppefisk', ((parseInt(row.leppefisk) || 0) + num).toString())}
                >
                  <Text style={styles.quickBtnText}>+{num}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => updateMerdRow(index, 'leppefisk', '0')}
              >
                <Text style={styles.resetBtnText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voiceBtn, isListening && activeVoiceField?.index === index && activeVoiceField?.field === 'leppefisk' && styles.voiceBtnActive]}
                onPress={() => toggleVoiceInput(index, 'leppefisk')}
              >
                <Ionicons
                  name={isListening && activeVoiceField?.index === index && activeVoiceField?.field === 'leppefisk' ? 'mic' : 'mic-outline'}
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>

            {/* Arsak og Grunnlag for rader med data */}
            {(parseInt(row.laks) > 0 || parseInt(row.leppefisk) > 0) && (
              <View style={styles.extraFieldsContainer}>
                <TouchableOpacity
                  style={styles.arsakButton}
                  onPress={() => openArsakModal(index)}
                >
                  <Text style={styles.arsakButtonLabel}>Arsak:</Text>
                  <Text style={styles.arsakButtonValue}>{getArsakLabel(row.arsak)}</Text>
                  <Ionicons name="chevron-down" size={16} color="#64748b" />
                </TouchableOpacity>
                <View style={styles.grunnlagContainer}>
                  <Text style={styles.grunnlagLabel}>Grunnlag:</Text>
                  <View style={styles.grunnlagPicker}>
                    <Picker
                      selectedValue={row.grunnlag}
                      onValueChange={(v) => updateMerdRow(index, 'grunnlag', v)}
                      style={styles.smallPicker}
                    >
                      {grunnlagOptions.map((g) => (
                        <Picker.Item key={g} label={g} value={g} color="#fff" />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Summering */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Summering</Text>
        <View style={styles.summaryRow}>
          {merdRows.map((row) => {
            const total = (parseInt(row.laks) || 0) + (parseInt(row.leppefisk) || 0);
            return (
              <View key={row.id} style={styles.summaryBox}>
                <Text style={styles.summaryMerdName}>{row.navn}</Text>
                <Text style={styles.summaryMerdCount}>{total}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.totalSummary}>
          <Text style={styles.totalSummaryLabel}>Totalt</Text>
          <Text style={styles.totalSummaryCount}>{getTotalLaks() + getTotalLeppefisk()}</Text>
        </View>
      </View>

      {/* Notater */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notater (valgfritt)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notat}
          onChangeText={setNotat}
          placeholder="Legg til eventuelle notater om tellingen..."
          placeholderTextColor="#64748b"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Lagre Dodlighet</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Arsak Modal */}
      <Modal
        visible={showArsakModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowArsakModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Velg arsak</Text>
              <TouchableOpacity onPress={() => setShowArsakModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {Object.entries(ARSAK_KATEGORIER).map(([category, causes]) => (
                <View key={category}>
                  <Text style={styles.categoryHeader}>{category}</Text>
                  {causes.map((cause) => (
                    <TouchableOpacity
                      key={cause.value}
                      style={styles.causeItem}
                      onPress={() => selectArsak(cause.value)}
                    >
                      <Text style={styles.causeText}>{cause.label}</Text>
                      {activeArsakIndex !== null && merdRows[activeArsakIndex]?.arsak === cause.value && (
                        <Ionicons name="checkmark" size={20} color="#22c55e" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 6,
  },
  helpText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  pickerContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  picker: {
    color: '#fff',
    backgroundColor: '#0f172a',
    height: 50,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  input: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  dateButton: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  totals: {
    flexDirection: 'row',
    gap: 16,
  },
  totalText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  totalNumber: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  headerCell: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  merdSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 12,
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  quickLabel: {
    color: '#64748b',
    fontSize: 12,
    width: 70,
  },
  quickBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  quickBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resetBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resetBtnText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  voiceBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  voiceBtnActive: {
    backgroundColor: '#ef4444',
  },
  voiceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  voiceStatusText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  cell: {
    color: '#fff',
    fontSize: 16,
  },
  merdCell: {
    flex: 1,
  },
  numberCell: {
    width: 90,
    textAlign: 'center',
  },
  cellInput: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 14,
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 4,
  },
  extraFieldsContainer: {
    marginTop: 12,
    gap: 10,
  },
  arsakButton: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  arsakButtonLabel: {
    color: '#64748b',
    fontSize: 13,
    marginRight: 8,
  },
  arsakButtonValue: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  grunnlagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grunnlagLabel: {
    color: '#64748b',
    fontSize: 13,
    marginRight: 8,
  },
  grunnlagPicker: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  smallPicker: {
    color: '#fff',
    backgroundColor: '#0f172a',
    height: 44,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  summaryBox: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  summaryMerdName: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  summaryMerdCount: {
    color: '#ef4444',
    fontSize: 24,
    fontWeight: 'bold',
  },
  totalSummary: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalSummaryLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  totalSummaryCount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalScroll: {
    padding: 16,
  },
  categoryHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  causeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    marginBottom: 6,
  },
  causeText: {
    color: '#fff',
    fontSize: 15,
  },
});
