import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>FjordVind</Text>
        <Text style={styles.subtitle}>Lusevokteren</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>3</Text>
          <Text style={styles.statLabel}>Lokaliteter</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Merder</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>247</Text>
          <Text style={styles.statLabel}>Dodlighet (14d)</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('Dodlighet')}
      >
        <Text style={styles.actionButtonText}>+ Registrer Dodlighet</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
        onPress={() => navigation.navigate('DodlighetOversikt')}
      >
        <Text style={styles.actionButtonText}>Se Oversikt</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
