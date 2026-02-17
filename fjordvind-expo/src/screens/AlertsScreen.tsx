import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchAlerts, markAlertRead, acknowledgeAlert, Alert } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function AlertsScreen() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const loadAlerts = async () => {
    try {
      const data = await fetchAlerts({ unreadOnly: filter === 'unread' });
      setAlerts(data);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAlerts();
  };

  const handleMarkRead = async (alertId: string) => {
    try {
      await markAlertRead(alertId);
      setAlerts(alerts.map(a =>
        a.id === alertId ? { ...a, is_read: true } : a
      ));
    } catch (error) {
      console.error('Error marking alert read:', error);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    if (!user) return;
    try {
      await acknowledgeAlert(alertId, user.id);
      loadAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#ef4444';
      case 'WARNING': return '#f59e0b';
      case 'INFO': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '!';
      case 'WARNING': return '!';
      case 'INFO': return 'i';
      default: return '?';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'LICE_CRITICAL': 'Kritisk lusenivå',
      'LICE_WARNING': 'Høyt lusenivå',
      'LICE_PREDICTION': 'Luseprognose',
      'MORTALITY_HIGH': 'Høy dødelighet',
      'OXYGEN_LOW': 'Lavt oksygen',
      'TEMPERATURE_HIGH': 'Høy temperatur',
      'TREATMENT_DUE': 'Behandling planlagt',
      'DAILY_SUMMARY': 'Daglig oppsummering',
      'WEEKLY_REPORT': 'Ukentlig rapport',
    };
    return labels[type] || type;
  };

  const unreadCount = alerts.filter(a => !a.is_read).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with filter */}
      <View style={styles.header}>
        <Text style={styles.title}>Varsler</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Alle
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            Uleste
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
            <Text style={styles.emptyText}>Ingen varsler</Text>
            <Text style={styles.emptySubtext}>Alt ser bra ut!</Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={[
                styles.alertCard,
                !alert.is_read && styles.alertCardUnread,
              ]}
              onPress={() => handleMarkRead(alert.id)}
            >
              {/* Severity indicator */}
              <View style={[styles.severityBar, { backgroundColor: getSeverityColor(alert.severity) }]} />

              <View style={styles.alertContent}>
                <View style={styles.alertHeader}>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
                    <Text style={styles.severityIcon}>{getSeverityIcon(alert.severity)}</Text>
                  </View>
                  <View style={styles.alertMeta}>
                    <Text style={styles.alertType}>{getAlertTypeLabel(alert.alert_type)}</Text>
                    <Text style={styles.alertTime}>
                      {new Date(alert.created_at).toLocaleDateString('nb-NO')}
                    </Text>
                  </View>
                  {!alert.is_read && <View style={styles.unreadDot} />}
                </View>

                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>

                {/* Action buttons */}
                <View style={styles.alertActions}>
                  {!alert.is_read && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleMarkRead(alert.id)}
                    >
                      <Text style={styles.actionButtonText}>Marker som lest</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acknowledgeButton]}
                    onPress={() => handleAcknowledge(alert.id)}
                  >
                    <Text style={styles.actionButtonText}>Bekreft</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
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
    color: '#22c55e',
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
  alertCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  alertCardUnread: {
    backgroundColor: '#1e3a5f',
  },
  severityBar: {
    width: 4,
  },
  alertContent: {
    flex: 1,
    padding: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  alertMeta: {
    flex: 1,
    marginLeft: 10,
  },
  alertType: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  alertTime: {
    fontSize: 12,
    color: '#64748b',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  acknowledgeButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
