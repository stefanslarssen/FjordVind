import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchDashboardStats, fetchSamples, Sample } from '../services/api';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState({
    totalLocations: 0,
    totalMerds: 0,
    activeAlerts: 0,
  });
  const [recentSamples, setRecentSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const dashStats = await fetchDashboardStats();
      setStats({
        totalLocations: dashStats.totalLocations,
        totalMerds: dashStats.totalMerds,
        activeAlerts: dashStats.activeAlerts,
      });

      const samples = await fetchSamples({ limit: 5 });
      setRecentSamples(samples);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getStatusColor = (avgLice: number) => {
    if (avgLice >= 0.5) return '#ef4444';
    if (avgLice >= 0.2) return '#f59e0b';
    return '#22c55e';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Dashboard</Text>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalLocations}</Text>
          <Text style={styles.statLabel}>Lokaliteter</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalMerds}</Text>
          <Text style={styles.statLabel}>Merder</Text>
        </View>
        <View style={[styles.statCard, stats.activeAlerts > 0 && styles.alertCard]}>
          <Text style={[styles.statNumber, stats.activeAlerts > 0 && styles.alertText]}>
            {stats.activeAlerts}
          </Text>
          <Text style={styles.statLabel}>Varsler</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('NyTelling')}
        >
          <Text style={styles.actionButtonText}>+ Ny Telling</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.mortalityButton]}
          onPress={() => navigation.navigate('Dodlighet')}
        >
          <Text style={styles.actionButtonText}>Dødelighet</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Samples */}
      <Text style={styles.sectionTitle}>Siste tellinger</Text>
      {recentSamples.length === 0 ? (
        <Text style={styles.emptyText}>Ingen tellinger ennå</Text>
      ) : (
        recentSamples.map((sample) => {
          const avgLice = sample.antall_fisk > 0
            ? sample.adult_female_lice / sample.antall_fisk
            : 0;
          return (
            <View key={sample.id} style={styles.sampleCard}>
              <View style={styles.sampleHeader}>
                <Text style={styles.sampleLocation}>{sample.location_name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(avgLice) },
                  ]}
                >
                  <Text style={styles.statusText}>{avgLice.toFixed(2)}</Text>
                </View>
              </View>
              <Text style={styles.sampleDetails}>
                {sample.cage_id} • {sample.dato} • {sample.antall_fisk} fisk
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  alertCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  alertText: {
    color: '#ef4444',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  mortalityButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
  },
  sampleCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sampleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sampleLocation: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
  sampleDetails: {
    fontSize: 14,
    color: '#64748b',
  },
});
