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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from './supabase';

export default function NyTellingScreen() {
  const navigation = useNavigation();

  // Type telling
  const [tellingType, setTellingType] = useState('lus'); // 'lus' eller 'dodlighet'

  // Lokasjon
  const [lokaliteter, setLokaliteter] = useState([]);
  const [merder, setMerder] = useState([]);
  const [selectedLokalitet, setSelectedLokalitet] = useState('');
  const [selectedMerd, setSelectedMerd] = useState('');

  // Tidspunkt
  const [dato, setDato] = useState(new Date().toISOString().split('T')[0]);
  const [klokkeslett, setKlokkeslett] = useState(
    new Date().toTimeString().slice(0, 5)
  );
  const [temperatur, setTemperatur] = useState('');

  // Lusetelling - fiskeobservasjoner
  const [fiskObservasjoner, setFiskObservasjoner] = useState([
    { id: 1, voksneHunnlus: 0, bevegeligeLus: 0, fastsittendeLus: 0 }
  ]);

  // Dødlighet
  const [antallDode, setAntallDode] = useState('0');
  const [arsak, setArsak] = useState('Ukjent');

  // Notater og state
  const [notat, setNotat] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const arsaker = ['Ukjent', 'Sykdom', 'Haandtering', 'Predator', 'Miljoe', 'Behandling', 'Annet'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Hent lokaliteter (unik liste)
      const { data: merdsData } = await supabase
        .from('merds')
        .select('id, merd_id, navn, lokalitet')
        .eq('is_active', true);

      if (merdsData) {
        const uniqueLokaliteter = [...new Set(merdsData.map(m => m.lokalitet).filter(Boolean))];
        setLokaliteter(uniqueLokaliteter);
        setMerder(merdsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMerder = selectedLokalitet
    ? merder.filter(m => m.lokalitet === selectedLokalitet)
    : merder;

  // Lusetelling funksjoner
  const addFisk = () => {
    const newId = fiskObservasjoner.length + 1;
    setFiskObservasjoner([
      ...fiskObservasjoner,
      { id: newId, voksneHunnlus: 0, bevegeligeLus: 0, fastsittendeLus: 0 }
    ]);
  };

  const addMultipleFisk = (count) => {
    const newFisk = [];
    const startId = fiskObservasjoner.length + 1;
    for (let i = 0; i < count; i++) {
      newFisk.push({
        id: startId + i,
        voksneHunnlus: 0,
        bevegeligeLus: 0,
        fastsittendeLus: 0
      });
    }
    setFiskObservasjoner([...fiskObservasjoner, ...newFisk]);
  };

  const updateFiskObservasjon = (index, field, value) => {
    const updated = [...fiskObservasjoner];
    updated[index] = { ...updated[index], [field]: parseInt(value) || 0 };
    setFiskObservasjoner(updated);
  };

  const removeFisk = (index) => {
    if (fiskObservasjoner.length > 1) {
      const updated = fiskObservasjoner.filter((_, i) => i !== index);
      // Re-number the fish
      const renumbered = updated.map((f, i) => ({ ...f, id: i + 1 }));
      setFiskObservasjoner(renumbered);
    }
  };

  // Oppsummering for lusetelling
  const getTotalFisk = () => fiskObservasjoner.length;
  const getTotalVoksneHunnlus = () =>
    fiskObservasjoner.reduce((sum, f) => sum + f.voksneHunnlus, 0);
  const getSnittPerFisk = () => {
    const total = getTotalVoksneHunnlus();
    const fisk = getTotalFisk();
    return fisk > 0 ? (total / fisk).toFixed(2) : '0.00';
  };
  const getStatus = () => {
    const snitt = parseFloat(getSnittPerFisk());
    if (snitt >= 0.5) return { text: 'Over grense', color: '#ef4444' };
    if (snitt >= 0.2) return { text: 'Advarsel', color: '#f59e0b' };
    return { text: 'OK', color: '#22c55e' };
  };

  // Dødlighet funksjoner
  const addDodlighet = (num) => {
    setAntallDode(prev => ((parseInt(prev) || 0) + num).toString());
  };

  const handleSubmit = async () => {
    if (!selectedMerd) {
      Alert.alert('Feil', 'Velg en merd');
      return;
    }

    setSaving(true);

    try {
      if (tellingType === 'lus') {
        // Lagre lusetelling
        const { error } = await supabase
          .from('lice_counts')
          .insert({
            merd_id: selectedMerd,
            dato: dato,
            klokkeslett: klokkeslett,
            temperatur: temperatur ? parseFloat(temperatur) : null,
            fisk_talt: getTotalFisk(),
            voksne_hunnlus: getTotalVoksneHunnlus(),
            snitt_per_fisk: parseFloat(getSnittPerFisk()),
            observasjoner: JSON.stringify(fiskObservasjoner),
            notat: notat || null,
          });

        if (error) throw error;

        Alert.alert(
          'Suksess',
          `Lusetelling lagret!\n\nFisk talt: ${getTotalFisk()}\nVoksne hunnlus: ${getTotalVoksneHunnlus()}\nSnitt: ${getSnittPerFisk()}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // Lagre dødlighet
        const total = parseInt(antallDode) || 0;
        if (total === 0) {
          Alert.alert('Feil', 'Legg inn antall døde');
          setSaving(false);
          return;
        }

        const { error } = await supabase
          .from('mortality_records')
          .insert({
            merd_id: selectedMerd,
            dato: dato,
            antall_dode: total,
            arsak: arsak,
            temperatur: temperatur ? parseFloat(temperatur) : null,
            notat: notat || null,
          });

        if (error) throw error;

        Alert.alert(
          'Suksess',
          `Dødlighet registrert!\n\nAntall: ${total}\nÅrsak: ${arsak}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Feil', 'Kunne ikke lagre: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Laster...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Ny telling</Text>
        <Text style={styles.subtitle}>Registrer lus eller dødlighet for dine merder</Text>
      </View>

      {/* Type velger */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Velg type telling</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              tellingType === 'lus' && styles.toggleButtonActive
            ]}
            onPress={() => setTellingType('lus')}
          >
            <Text style={[
              styles.toggleText,
              tellingType === 'lus' && styles.toggleTextActive
            ]}>Lusetelling</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              tellingType === 'dodlighet' && styles.toggleButtonActive
            ]}
            onPress={() => setTellingType('dodlighet')}
          >
            <Text style={[
              styles.toggleText,
              tellingType === 'dodlighet' && styles.toggleTextActive
            ]}>Dødlighet</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lokasjon */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Velg lokasjon</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.inputLabel}>Lokalitet</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => {
                  // Simple picker - cycle through options
                  const currentIndex = lokaliteter.indexOf(selectedLokalitet);
                  const nextIndex = (currentIndex + 1) % (lokaliteter.length + 1);
                  setSelectedLokalitet(lokaliteter[nextIndex] || '');
                  setSelectedMerd('');
                }}
              >
                <Text style={styles.pickerText}>
                  {selectedLokalitet || 'Velg lokalitet...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.col}>
            <Text style={styles.inputLabel}>Merd</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => {
                  const currentIndex = filteredMerder.findIndex(m => m.id === selectedMerd);
                  const nextIndex = (currentIndex + 1) % (filteredMerder.length + 1);
                  setSelectedMerd(filteredMerder[nextIndex]?.id || '');
                }}
              >
                <Text style={styles.pickerText}>
                  {filteredMerder.find(m => m.id === selectedMerd)?.navn || 'Velg merd...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Tidspunkt */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Tidspunkt</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.inputLabel}>Dato</Text>
            <TextInput
              style={styles.input}
              value={dato}
              onChangeText={setDato}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.inputLabel}>Klokkeslett</Text>
            <TextInput
              style={styles.input}
              value={klokkeslett}
              onChangeText={setKlokkeslett}
              placeholder="HH:MM"
              placeholderTextColor="#64748b"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.inputLabel}>Temperatur (C)</Text>
            <TextInput
              style={styles.input}
              value={temperatur}
              onChangeText={setTemperatur}
              placeholder="f.eks. 12.5"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </View>

      {/* Lusetelling innhold */}
      {tellingType === 'lus' && (
        <>
          {/* Fiskeobservasjoner */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Fiskeobservasjoner ({getTotalFisk()} fisk)</Text>
              <TouchableOpacity style={styles.addButton} onPress={addFisk}>
                <Text style={styles.addButtonText}>+ Legg til fisk</Text>
              </TouchableOpacity>
            </View>

            {/* Table header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>Fisk #</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Voksne hunnlus</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Bevegelige lus</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Fastsittende lus</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.3 }]}></Text>
            </View>

            {/* Fish rows */}
            {fiskObservasjoner.map((fisk, index) => (
              <View key={fisk.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.5 }]}>#{fisk.id}</Text>
                <TextInput
                  style={[styles.tableCellInput, { flex: 1 }]}
                  value={fisk.voksneHunnlus.toString()}
                  onChangeText={(v) => updateFiskObservasjon(index, 'voksneHunnlus', v)}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <TextInput
                  style={[styles.tableCellInput, { flex: 1 }]}
                  value={fisk.bevegeligeLus.toString()}
                  onChangeText={(v) => updateFiskObservasjon(index, 'bevegeligeLus', v)}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <TextInput
                  style={[styles.tableCellInput, { flex: 1 }]}
                  value={fisk.fastsittendeLus.toString()}
                  onChangeText={(v) => updateFiskObservasjon(index, 'fastsittendeLus', v)}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={{ flex: 0.3, alignItems: 'center' }}
                  onPress={() => removeFisk(index)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Quick add buttons */}
            <View style={styles.quickButtonsRow}>
              <Text style={styles.quickLabel}>Hurtiglegg:</Text>
              {[5, 10, 15, 20].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.quickBtn}
                  onPress={() => addMultipleFisk(num)}
                >
                  <Text style={styles.quickBtnText}>+{num} fisk</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Oppsummering Lus */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Oppsummering</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{getTotalFisk()}</Text>
                <Text style={styles.summaryLabel}>Fisk talt</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{getTotalVoksneHunnlus()}</Text>
                <Text style={styles.summaryLabel}>Voksne hunnlus</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                  {getSnittPerFisk()}
                </Text>
                <Text style={styles.summaryLabel}>Snitt per fisk</Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={[styles.statusBadge, { backgroundColor: getStatus().color }]}>
                  <Text style={styles.statusText}>{getStatus().text}</Text>
                </View>
                <Text style={styles.summaryLabel}>Status</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Dødlighet innhold */}
      {tellingType === 'dodlighet' && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Antall døde</Text>
            <TextInput
              style={styles.bigInput}
              value={antallDode}
              onChangeText={setAntallDode}
              keyboardType="number-pad"
              selectTextOnFocus
            />

            {/* Quick add buttons */}
            <View style={styles.quickButtonsRow}>
              <Text style={styles.quickLabel}>Hurtiglegg:</Text>
              {[1, 5, 10, 25, 50, 100].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.quickBtn}
                  onPress={() => addDodlighet(num)}
                >
                  <Text style={styles.quickBtnText}>+{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => setAntallDode('0')}
            >
              <Text style={styles.resetBtnText}>Nullstill</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Årsak</Text>
            <View style={styles.arsakGrid}>
              {arsaker.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[
                    styles.arsakButton,
                    arsak === a && styles.arsakButtonActive
                  ]}
                  onPress={() => setArsak(a)}
                >
                  <Text style={[
                    styles.arsakText,
                    arsak === a && styles.arsakTextActive
                  ]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Oppsummering Dødlighet */}
          <View style={styles.summaryCardRed}>
            <Text style={styles.summaryCardLabel}>Oppsummering</Text>
            <Text style={styles.summaryCardValue}>{antallDode}</Text>
          </View>
        </>
      )}

      {/* Notater */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Notater (valgfritt)</Text>
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

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Avbryt</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Lagre telling</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
  },
  header: {
    padding: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#3b82f6',
  },
  toggleText: {
    color: '#64748b',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
  },
  bigInput: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  pickerText: {
    color: '#fff',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tableHeaderCell: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tableCell: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  tableCellInput: {
    backgroundColor: '#0f172a',
    borderRadius: 6,
    padding: 8,
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quickLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  quickBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  quickBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  resetBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  resetBtnText: {
    color: '#64748b',
    fontSize: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  arsakGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  arsakButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  arsakButtonActive: {
    backgroundColor: '#3b82f6',
  },
  arsakText: {
    color: '#fff',
    fontSize: 14,
  },
  arsakTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  summaryCardRed: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCardLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  summaryCardValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#1e40af',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
