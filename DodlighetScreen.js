import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from './supabase';

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
  ],
  'Behandling': [
    { value: 'Avlusning_mekanisk', label: 'Avlusning - mekanisk' },
    { value: 'Avlusning_termisk', label: 'Avlusning - termisk' },
    { value: 'Ferskvannsbehandling', label: 'Ferskvannsbehandling' },
  ],
  'Haandtering': [
    { value: 'Trenging', label: 'Trenging' },
    { value: 'Sortering', label: 'Sortering' },
    { value: 'Transport', label: 'Transport' },
  ],
  'Predator': [
    { value: 'Sel', label: 'Sel' },
    { value: 'Oter', label: 'Oter' },
    { value: 'Fugl', label: 'Fugl' },
  ],
  'Miljo': [
    { value: 'Algeoppblomstring', label: 'Algeoppblomstring' },
    { value: 'Oksygenmangel', label: 'Oksygenmangel' },
  ],
};

export default function DodlighetScreen() {
  const navigation = useNavigation();
  const [merder, setMerder] = useState([]);
  const [merdRows, setMerdRows] = useState([]);
  const [dato, setDato] = useState(new Date().toISOString().split('T')[0]);
  const [temperatur, setTemperatur] = useState('');
  const [notat, setNotat] = useState('');
  const [showArsakModal, setShowArsakModal] = useState(false);
  const [activeArsakIndex, setActiveArsakIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMerder();
  }, []);

  const fetchMerder = async () => {
    try {
      const { data, error } = await supabase
        .from('merder')
        .select('*')
        .order('navn');

      if (error) throw error;

      if (data && data.length > 0) {
        setMerder(data);
        setMerdRows(data.map(m => ({
          id: m.id,
          navn: m.navn,
          laks: '0',
          leppefisk: '0',
          arsak: ''
        })));
      } else {
        const demoMerder = [
          { id: '1', navn: 'Merd 1' },
          { id: '2', navn: 'Merd 2' },
          { id: '3', navn: 'Merd 3' },
          { id: '4', navn: 'Merd 4' },
        ];
        setMerder(demoMerder);
        setMerdRows(demoMerder.map(m => ({
          id: m.id,
          navn: m.navn,
          laks: '0',
          leppefisk: '0',
          arsak: ''
        })));
      }
    } catch (error) {
      console.error('Feil ved henting av merder:', error);
      Alert.alert('Feil', 'Kunne ikke hente merder');
    } finally {
      setLoading(false);
    }
  };

  const updateMerdRow = (index, field, value) => {
    const updated = [...merdRows];
    updated[index] = { ...updated[index], [field]: value };
    setMerdRows(updated);
  };

  const getTotalLaks = () => merdRows.reduce((sum, r) => sum + (parseInt(r.laks) || 0), 0);
  const getTotalLeppefisk = () => merdRows.reduce((sum, r) => sum + (parseInt(r.leppefisk) || 0), 0);

  const openArsakModal = (index) => {
    setActiveArsakIndex(index);
    setShowArsakModal(true);
  };

  const selectArsak = (value) => {
    if (activeArsakIndex !== null) {
      updateMerdRow(activeArsakIndex, 'arsak', value);
    }
    setShowArsakModal(false);
    setActiveArsakIndex(null);
  };

  const getArsakLabel = (value) => {
    for (const category of Object.values(ARSAK_KATEGORIER)) {
      const found = category.find(a => a.value === value);
      if (found) return found.label;
    }
    return value || 'Velg arsak...';
  };

  const handleSubmit = async () => {
    const total = getTotalLaks() + getTotalLeppefisk();
    if (total === 0) {
      Alert.alert('Feil', 'Legg inn minst en dodlighet');
      return;
    }

    setSaving(true);

    try {
      const registreringer = merdRows
        .filter(row => (parseInt(row.laks) || 0) > 0 || (parseInt(row.leppefisk) || 0) > 0)
        .map(row => ({
          dato: dato,
          merd_id: row.id,
          merd_navn: row.navn,
          laks: parseInt(row.laks) || 0,
          leppefisk: parseInt(row.leppefisk) || 0,
          antall_dode: (parseInt(row.laks) || 0) + (parseInt(row.leppefisk) || 0),
          arsak: row.arsak || 'Ukjent',
          temperatur: temperatur ? parseFloat(temperatur) : null,
          notat: notat || null,
        }));

      const { data, error } = await supabase
        .from('mortality_records')
        .insert(registreringer);

      if (error) throw error;

      Alert.alert(
        'Suksess',
        `Dodlighet registrert!\n\nLaks: ${getTotalLaks()}\nLeppefisk: ${getTotalLeppefisk()}\nTotal: ${total}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Feil ved lagring:', error);
      Alert.alert('Feil', 'Kunne ikke lagre registrering: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDisplayDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('no-NO');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Henter merder...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tidspunkt</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Dato</Text>
            <View style={styles.dateButton}>
              <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
              <Text style={styles.dateButtonText}>{formatDisplayDate(dato)}</Text>
            </View>
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

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Registrering</Text>
          <View style={styles.totals}>
            <Text style={styles.totalText}>Laks: <Text style={styles.totalNumber}>{getTotalLaks()}</Text></Text>
            <Text style={styles.totalText}>Leppefisk: <Text style={styles.totalNumber}>{getTotalLeppefisk()}</Text></Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.merdCell]}>Merd</Text>
          <Text style={[styles.headerCell, styles.numberCell]}>Laks</Text>
          <Text style={[styles.headerCell, styles.numberCell]}>Leppefisk</Text>
        </View>

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

            <View style={styles.quickButtonsRow}>
              <Text style={styles.quickLabel}>Laks:</Text>
              {[5, 10, 20].map((num) => (
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
            </View>

            <View style={styles.quickButtonsRow}>
              <Text style={styles.quickLabel}>Leppefisk:</Text>
              {[5, 10, 20].map((num) => (
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
            </View>

            {(parseInt(row.laks) > 0 || parseInt(row.leppefisk) > 0) && (
              <TouchableOpacity
                style={styles.arsakButton}
                onPress={() => openArsakModal(index)}
              >
                <Text style={styles.arsakButtonLabel}>Arsak:</Text>
                <Text style={styles.arsakButtonValue}>{getArsakLabel(row.arsak)}</Text>
                <Ionicons name="chevron-down" size={16} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notater</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notat}
          onChangeText={setNotat}
          placeholder="Notater..."
          placeholderTextColor="#64748b"
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, saving && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Lagre Dodlighet</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />

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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 16,
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
  cell: {
    color: '#fff',
    fontSize: 16,
  },
  merdCell: {
    flex: 1,
  },
  numberCell: {
    width: 80,
    textAlign: 'center',
  },
  cellInput: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 4,
  },
  arsakButton: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 12,
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
    minWidth: 70,
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
  submitButtonDisabled: {
    backgroundColor: '#166534',
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
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
