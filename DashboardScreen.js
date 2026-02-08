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
          <Ionicons name="fish-outline" size={24} color="#22c55e" />
          <Text style={[styles.statValue, { color: '#22c55e' }]}>0.12</Text>
          <Text style={styles.statLabel}>Snitt lus</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('NyTelling')}>
        <Ionicons name="add-circle-outline" size={24} color="#fff" />
        <Text style={styles.btnText}>Ny telling</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, styles.btnSecondary]}
        onPress={() => navigation.navigate('DodlighetOversikt')}
      >
        <Ionicons name="stats-chart-outline" size={24} color="#3b82f6" />
        <Text style={[styles.btnText, styles.btnTextSecondary]}>Se Oversikt</Text>
      </TouchableOpacity>

      {/* Quick status cards */}
      <Text style={styles.sectionTitle}>Siste aktivitet</Text>

      <View style={styles.activityCard}>
        <View style={styles.activityIcon}>
          <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityTitle}>Lusetelling fullført</Text>
          <Text style={styles.activitySubtitle}>Merd 3 - 20 fisk talt</Text>
        </View>
        <Text style={styles.activityTime}>2t siden</Text>
      </View>

      <View style={styles.activityCard}>
        <View style={styles.activityIcon}>
          <Ionicons name="alert-circle" size={24} color="#f59e0b" />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityTitle}>Dødlighet registrert</Text>
          <Text style={styles.activitySubtitle}>Merd 1 - 5 fisk</Text>
        </View>
        <Text style={styles.activityTime}>5t siden</Text>
      </View>
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
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#3b82f6', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 4 },
  btn: {
    backgroundColor: '#3b82f6',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityIcon: {
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  activitySubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  activityTime: {
    color: '#64748b',
    fontSize: 12,
  },
});
