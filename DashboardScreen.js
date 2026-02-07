import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>FjordVind</Text>
        <Text style={styles.subtitle}>Lusevokteren</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="location-outline" size={24} color="#3b82f6" />
          <Text style={styles.statValue}>3</Text>
          <Text style={styles.statLabel}>Lokaliteter</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="grid-outline" size={24} color="#3b82f6" />
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Merder</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trending-down-outline" size={24} color="#ef4444" />
          <Text style={[styles.statValue, { color: '#ef4444' }]}>247</Text>
          <Text style={styles.statLabel}>Dodlighet</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Dodlighet')}>
        <Ionicons name="add-circle-outline" size={24} color="#fff" />
        <Text style={styles.btnText}>Registrer Dodlighet</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, styles.btnSecondary]}
        onPress={() => navigation.navigate('DodlighetOversikt')}
      >
        <Ionicons name="stats-chart-outline" size={24} color="#3b82f6" />
        <Text style={[styles.btnText, styles.btnTextSecondary]}>Se Oversikt</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: { marginBottom: 24, marginTop: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#3b82f6' },
  subtitle: { fontSize: 18, color: '#64748b' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#3b82f6', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  btn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  btnSecondary: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnTextSecondary: { color: '#3b82f6' },
});
