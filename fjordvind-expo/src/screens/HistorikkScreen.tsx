import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { fetchSamples, Sample } from '../services/api';

export default function HistorikkScreen() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchSamples({ limit: 50 });
      setSamples(data);
    } catch (error) {
      console.error('Error loading history:', error);
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

  const getStatusText = (avgLice: number) => {
    if (avgLice >= 0.5) return 'Kritisk';
    if (avgLice >= 0.2) return 'Advarsel';
    return 'OK';
  };

  const renderItem = ({ item }: { item: Sample }) => {
    const avgLice = item.antall_fisk > 0
      ? item.adult_female_lice / item.antall_fisk
      : 0;
    const statusColor = getStatusColor(avgLice);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.location}>{item.location_name}</Text>
            <Text style={styles.cage}>{item.cage_id}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{getStatusText(avgLice)}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.dato}</Text>
            <Text style={styles.statLabel}>Dato</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.antall_fisk}</Text>
            <Text style={styles.statLabel}>Fisk</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: statusColor }]}>
              {avgLice.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Snitt lus</Text>
          </View>
        </View>

        <View style={styles.liceDetails}>
          <Text style={styles.liceText}>
            Voksne hunnlus: {item.adult_female_lice} |
            Bevegelige: {item.mobile_lice} |
            Fastsittende: {item.attached_lice}
          </Text>
        </View>

        {item.notat && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>{item.notat}</Text>
          </View>
        )}
      </View>
    );
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
      <Text style={styles.title}>Historikk</Text>
      <FlatList
        data={samples}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Ingen tellinger funnet</Text>
        }
        contentContainerStyle={samples.length === 0 && styles.emptyContainer}
      />
    </View>
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
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  location: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  cage: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  liceDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  liceText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  noteContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
  },
});
