import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { fetchPredictions, fetchRiskScores, fetchLocations, Prediction, RiskScore } from '../services/api';

const { width } = Dimensions.get('window');

const RISK_COLORS: Record<string, string> = {
  'LOW': '#22c55e',
  'MODERATE': '#f59e0b',
  'MEDIUM': '#f59e0b',
  'HIGH': '#ef4444',
  'CRITICAL': '#dc2626',
};

const RISK_LABELS: Record<string, string> = {
  'LOW': 'Lav',
  'MODERATE': 'Moderat',
  'MEDIUM': 'Middels',
  'HIGH': 'Høy',
  'CRITICAL': 'Kritisk',
};

const ACTION_LABELS: Record<string, string> = {
  'NO_ACTION': 'Ingen handling',
  'MONITOR': 'Overvåk',
  'SCHEDULE_TREATMENT': 'Planlegg behandling',
  'IMMEDIATE_TREATMENT': 'Umiddelbar behandling',
};

export default function PrognoserScreen() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [riskScores, setRiskScores] = useState<RiskScore[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'predictions' | 'risk'>('predictions');

  const loadData = async () => {
    try {
      const [predData, riskData, locData] = await Promise.all([
        fetchPredictions(),
        fetchRiskScores(selectedLocation || undefined),
        fetchLocations(),
      ]);
      setPredictions(predData);
      setRiskScores(riskData);
      setLocations(locData);
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedLocation]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  };

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const today = new Date();
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Prognoser</Text>
      </View>

      {/* Tab selector */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'predictions' && styles.tabActive]}
          onPress={() => setActiveTab('predictions')}
        >
          <Text style={[styles.tabText, activeTab === 'predictions' && styles.tabTextActive]}>
            Luseprognoser
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'risk' && styles.tabActive]}
          onPress={() => setActiveTab('risk')}
        >
          <Text style={[styles.tabText, activeTab === 'risk' && styles.tabTextActive]}>
            Risikoscorer
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location filter */}
      <View style={styles.filterContainer}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedLocation}
            onValueChange={setSelectedLocation}
            style={styles.picker}
            dropdownIconColor="#fff"
          >
            <Picker.Item label="Alle lokaliteter" value="" color="#000" />
            {locations.map((loc) => (
              <Picker.Item key={loc.id} label={loc.name} value={loc.name} color="#000" />
            ))}
          </Picker>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'predictions' ? (
          <>
            {predictions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="trending-up-outline" size={48} color="#3b82f6" />
                <Text style={styles.emptyText}>Ingen prognoser</Text>
                <Text style={styles.emptySubtext}>Prognoser genereres automatisk</Text>
              </View>
            ) : (
              predictions.map((pred) => {
                const daysUntil = getDaysUntil(pred.target_date);
                return (
                  <View key={pred.id} style={styles.predictionCard}>
                    <View style={styles.predictionHeader}>
                      <View>
                        <Text style={styles.predictionMerd}>
                          {(pred as any).merds?.lokalitet} - {(pred as any).merds?.navn}
                        </Text>
                        <Text style={styles.predictionDate}>
                          {formatDate(pred.target_date)} ({daysUntil > 0 ? `om ${daysUntil} dager` : 'i dag'})
                        </Text>
                      </View>
                      <View style={[styles.riskBadge, { backgroundColor: RISK_COLORS[pred.risk_level] || '#64748b' }]}>
                        <Text style={styles.riskBadgeText}>
                          {RISK_LABELS[pred.risk_level] || pred.risk_level}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.predictionStats}>
                      <View style={styles.stat}>
                        <Text style={styles.statLabel}>Nåværende</Text>
                        <Text style={styles.statValue}>{pred.current_lice?.toFixed(2) || '-'}</Text>
                      </View>
                      <View style={styles.statArrow}>
                        <Text style={styles.statArrowText}>→</Text>
                      </View>
                      <View style={styles.stat}>
                        <Text style={styles.statLabel}>Forventet</Text>
                        <Text style={[styles.statValue, { color: RISK_COLORS[pred.risk_level] || '#fff' }]}>
                          {pred.predicted_lice?.toFixed(2) || '-'}
                        </Text>
                      </View>
                      <View style={styles.stat}>
                        <Text style={styles.statLabel}>Konfidensens</Text>
                        <Text style={styles.statValue}>{Math.round((pred.confidence || 0) * 100)}%</Text>
                      </View>
                    </View>

                    {pred.recommended_action && (
                      <View style={styles.actionContainer}>
                        <Text style={styles.actionLabel}>Anbefalt handling:</Text>
                        <Text style={styles.actionText}>
                          {ACTION_LABELS[pred.recommended_action] || pred.recommended_action}
                        </Text>
                      </View>
                    )}

                    {/* Probability bar */}
                    <View style={styles.probabilityContainer}>
                      <Text style={styles.probabilityLabel}>
                        Sannsynlighet for grenseoverskridelse
                      </Text>
                      <View style={styles.probabilityBar}>
                        <View
                          style={[
                            styles.probabilityFill,
                            {
                              width: `${Math.round((pred.probability_exceed_limit || 0) * 100)}%`,
                              backgroundColor: (pred.probability_exceed_limit || 0) > 0.5 ? '#ef4444' : '#f59e0b',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.probabilityValue}>
                        {Math.round((pred.probability_exceed_limit || 0) * 100)}%
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : (
          <>
            {riskScores.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="shield-checkmark-outline" size={48} color="#22c55e" />
                <Text style={styles.emptyText}>Ingen risikoscorer</Text>
                <Text style={styles.emptySubtext}>Scorer beregnes basert på data</Text>
              </View>
            ) : (
              riskScores.map((score) => (
                <View key={score.id} style={styles.riskCard}>
                  <View style={styles.riskHeader}>
                    <View>
                      <Text style={styles.riskMerd}>
                        {(score as any).merds?.lokalitet || score.locality}
                      </Text>
                      <Text style={styles.riskTime}>
                        {new Date(score.calculated_at).toLocaleString('nb-NO')}
                      </Text>
                    </View>
                    <View style={styles.overallScore}>
                      <Text style={[styles.overallScoreValue, { color: RISK_COLORS[score.risk_level] || '#fff' }]}>
                        {score.overall_score}
                      </Text>
                      <Text style={styles.overallScoreLabel}>/ 100</Text>
                    </View>
                  </View>

                  <View style={[styles.riskLevelBar, { backgroundColor: RISK_COLORS[score.risk_level] || '#64748b' }]}>
                    <Text style={styles.riskLevelText}>
                      Risiko: {RISK_LABELS[score.risk_level] || score.risk_level}
                    </Text>
                  </View>

                  {/* Score breakdown */}
                  <View style={styles.scoreBreakdown}>
                    {score.lice_score !== undefined && (
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreItemLabel}>Lus</Text>
                        <View style={styles.scoreItemBar}>
                          <View style={[styles.scoreItemFill, { width: `${score.lice_score}%` }]} />
                        </View>
                        <Text style={styles.scoreItemValue}>{score.lice_score}</Text>
                      </View>
                    )}
                    {score.mortality_score !== undefined && (
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreItemLabel}>Dødelighet</Text>
                        <View style={styles.scoreItemBar}>
                          <View style={[styles.scoreItemFill, { width: `${score.mortality_score}%` }]} />
                        </View>
                        <Text style={styles.scoreItemValue}>{score.mortality_score}</Text>
                      </View>
                    )}
                    {score.environment_score !== undefined && (
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreItemLabel}>Miljø</Text>
                        <View style={styles.scoreItemBar}>
                          <View style={[styles.scoreItemFill, { width: `${score.environment_score}%` }]} />
                        </View>
                        <Text style={styles.scoreItemValue}>{score.environment_score}</Text>
                      </View>
                    )}
                    {score.treatment_score !== undefined && (
                      <View style={styles.scoreItem}>
                        <Text style={styles.scoreItemLabel}>Behandling</Text>
                        <View style={styles.scoreItemBar}>
                          <View style={[styles.scoreItemFill, { width: `${score.treatment_score}%` }]} />
                        </View>
                        <Text style={styles.scoreItemValue}>{score.treatment_score}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
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
    padding: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  pickerContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    height: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
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
  predictionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  predictionMerd: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  predictionDate: {
    fontSize: 14,
    color: '#64748b',
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  riskBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  predictionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statArrow: {
    paddingHorizontal: 8,
  },
  statArrowText: {
    fontSize: 20,
    color: '#64748b',
  },
  actionContainer: {
    backgroundColor: '#334155',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  probabilityContainer: {
    marginTop: 4,
  },
  probabilityLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  probabilityBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  probabilityFill: {
    height: '100%',
    borderRadius: 4,
  },
  probabilityValue: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
  },
  riskCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskMerd: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  riskTime: {
    fontSize: 12,
    color: '#64748b',
  },
  overallScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  overallScoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  overallScoreLabel: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 2,
  },
  riskLevelBar: {
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  riskLevelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scoreBreakdown: {
    gap: 12,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreItemLabel: {
    fontSize: 14,
    color: '#94a3b8',
    width: 80,
  },
  scoreItemBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreItemFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  scoreItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    width: 30,
    textAlign: 'right',
  },
});
