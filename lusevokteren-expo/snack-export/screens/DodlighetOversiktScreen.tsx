import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LineChart, BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width - 32;

// Demo data
const DEMO_MERDER = [
  { id: '1', navn: 'Merd 1', total: 45 },
  { id: '2', navn: 'Merd 2', total: 32 },
  { id: '3', navn: 'Merd 3', total: 28 },
  { id: '4', navn: 'Merd 4', total: 19 },
];

const DEMO_HISTORY = [
  { id: '1', dato: '2025-02-04', merd: 'Merd 1', laks: 12, leppefisk: 3, arsak: 'Ukjent' },
  { id: '2', dato: '2025-02-04', merd: 'Merd 2', laks: 8, leppefisk: 2, arsak: 'Behandling' },
  { id: '3', dato: '2025-02-03', merd: 'Merd 1', laks: 15, leppefisk: 5, arsak: 'Sykdom' },
  { id: '4', dato: '2025-02-03', merd: 'Merd 3', laks: 6, leppefisk: 1, arsak: 'Ukjent' },
  { id: '5', dato: '2025-02-02', merd: 'Merd 4', laks: 9, leppefisk: 2, arsak: 'Haandtering' },
  { id: '6', dato: '2025-02-02', merd: 'Merd 2', laks: 11, leppefisk: 4, arsak: 'Predator' },
  { id: '7', dato: '2025-02-01', merd: 'Merd 1', laks: 7, leppefisk: 2, arsak: 'Ukjent' },
  { id: '8', dato: '2025-01-31', merd: 'Merd 3', laks: 14, leppefisk: 3, arsak: 'Miljo' },
];

// Generate demo chart data
const generateChartData = (days: number) => {
  const labels: string[] = [];
  const data: number[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (i % (days === 7 ? 1 : days === 14 ? 2 : 5) === 0) {
      labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
    }
    data.push(Math.floor(Math.random() * 30) + 5);
  }

  return { labels, data };
};

type PeriodType = 7 | 14 | 30;
type ChartType = 'line' | 'bar';

const ARSAK_FILTER = ['Alle', 'Ukjent', 'Sykdom', 'Behandling', 'Haandtering', 'Predator', 'Miljo'];

export default function DodlighetOversiktScreen() {
  const navigation = useNavigation<any>();
  const [period, setPeriod] = useState<PeriodType>(14);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedMerd, setSelectedMerd] = useState('Alle');
  const [selectedArsak, setSelectedArsak] = useState('Alle');
  const [showFilters, setShowFilters] = useState(false);

  const chartData = generateChartData(period);

  const filteredHistory = DEMO_HISTORY.filter(h => {
    if (selectedMerd !== 'Alle' && h.merd !== selectedMerd) return false;
    if (selectedArsak !== 'Alle' && h.arsak !== selectedArsak) return false;
    return true;
  });

  const getTotal = () => DEMO_MERDER.reduce((sum, m) => sum + m.total, 0);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const chartConfig = {
    backgroundColor: '#1e293b',
    backgroundGradientFrom: '#1e293b',
    backgroundGradientTo: '#1e293b',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    propsForBackgroundLines: {
      stroke: '#334155',
    },
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dodlighet</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('Dodlighet')}
        >
          <Text style={styles.addButtonText}>+ Registrer</Text>
        </TouchableOpacity>
      </View>

      {/* Periode-velger */}
      <View style={styles.periodContainer}>
        {([7, 14, 30] as PeriodType[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
              {p} dager
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter toggle */}
      <TouchableOpacity
        style={styles.filterToggle}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Text style={styles.filterToggleText}>
          Filtrer {(selectedMerd !== 'Alle' || selectedArsak !== 'Alle') && '(aktiv)'}
        </Text>
        <Text style={styles.filterToggleIcon}>{showFilters ? '-' : '+'}</Text>
      </TouchableOpacity>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filterCard}>
          <Text style={styles.filterLabel}>Merd</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, selectedMerd === 'Alle' && styles.filterChipActive]}
              onPress={() => setSelectedMerd('Alle')}
            >
              <Text style={[styles.filterChipText, selectedMerd === 'Alle' && styles.filterChipTextActive]}>Alle</Text>
            </TouchableOpacity>
            {DEMO_MERDER.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.filterChip, selectedMerd === m.navn && styles.filterChipActive]}
                onPress={() => setSelectedMerd(m.navn)}
              >
                <Text style={[styles.filterChipText, selectedMerd === m.navn && styles.filterChipTextActive]}>{m.navn}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.filterLabel, { marginTop: 12 }]}>Arsak</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {ARSAK_FILTER.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.filterChip, selectedArsak === a && styles.filterChipActive]}
                onPress={() => setSelectedArsak(a)}
              >
                <Text style={[styles.filterChipText, selectedArsak === a && styles.filterChipTextActive]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {(selectedMerd !== 'Alle' || selectedArsak !== 'Alle') && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => { setSelectedMerd('Alle'); setSelectedArsak('Alle'); }}
            >
              <Text style={styles.clearBtnText}>Nullstill</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Graf */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Siste {period} dager</Text>
          <View style={styles.chartTypeToggle}>
            <TouchableOpacity
              style={[styles.chartTypeBtn, chartType === 'bar' && styles.chartTypeBtnActive]}
              onPress={() => setChartType('bar')}
            >
              <Text style={[styles.chartTypeBtnText, chartType === 'bar' && styles.chartTypeBtnTextActive]}>Stolpe</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartTypeBtn, chartType === 'line' && styles.chartTypeBtnActive]}
              onPress={() => setChartType('line')}
            >
              <Text style={[styles.chartTypeBtnText, chartType === 'line' && styles.chartTypeBtnTextActive]}>Linje</Text>
            </TouchableOpacity>
          </View>
        </View>

        {chartType === 'line' ? (
          <LineChart
            data={{
              labels: chartData.labels,
              datasets: [{ data: chartData.data }],
            }}
            width={screenWidth}
            height={180}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            fromZero
          />
        ) : (
          <BarChart
            data={{
              labels: chartData.labels,
              datasets: [{ data: chartData.data }],
            }}
            width={screenWidth}
            height={180}
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
          />
        )}
      </View>

      {/* Per merd */}
      <Text style={styles.sectionTitle}>Per merd</Text>
      <View style={styles.merdsRow}>
        {DEMO_MERDER.map((m) => (
          <View key={m.id} style={styles.merdCard}>
            <Text style={styles.merdName}>{m.navn}</Text>
            <Text style={styles.merdCount}>{m.total}</Text>
          </View>
        ))}
      </View>

      {/* Total */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total siste {period} dager</Text>
        <Text style={styles.totalCount}>{getTotal()}</Text>
      </View>

      {/* Historikk */}
      <Text style={styles.sectionTitle}>Historikk</Text>
      <View style={styles.historyCard}>
        {filteredHistory.length === 0 ? (
          <Text style={styles.noDataText}>Ingen registreringer</Text>
        ) : (
          filteredHistory.map((record) => (
            <View key={record.id} style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyDate}>{formatDate(record.dato)}</Text>
                <Text style={styles.historyMerd}>{record.merd}</Text>
              </View>
              <View style={styles.historyMiddle}>
                <Text style={styles.historyCause}>{record.arsak}</Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.laksText}>{record.laks} laks</Text>
                <Text style={styles.leppefiskText}>{record.leppefisk} leppef.</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Statistikk */}
      <Text style={styles.sectionTitle}>Statistikk</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{Math.round(getTotal() / period)}</Text>
          <Text style={styles.statLabel}>Snitt/dag</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{Math.max(...chartData.data)}</Text>
          <Text style={styles.statLabel}>Maks/dag</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodBtnActive: {
    backgroundColor: '#3b82f6',
  },
  periodBtnText: {
    color: '#64748b',
    fontWeight: '500',
  },
  periodBtnTextActive: {
    color: '#fff',
  },
  filterToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  filterToggleText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  filterToggleIcon: {
    color: '#3b82f6',
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  filterLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  filterChip: {
    backgroundColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  clearBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
  },
  clearBtnText: {
    color: '#64748b',
  },
  chartCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  chartTypeToggle: {
    flexDirection: 'row',
    backgroundColor: '#334155',
    borderRadius: 6,
    padding: 2,
  },
  chartTypeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  chartTypeBtnActive: {
    backgroundColor: '#3b82f6',
  },
  chartTypeBtnText: {
    color: '#64748b',
    fontSize: 12,
  },
  chartTypeBtnTextActive: {
    color: '#fff',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  merdsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  merdCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  merdName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  merdCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  totalCard: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
  },
  totalCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  historyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  historyLeft: {
    width: 70,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  historyMerd: {
    fontSize: 12,
    color: '#64748b',
  },
  historyMiddle: {
    flex: 1,
    paddingHorizontal: 8,
  },
  historyCause: {
    fontSize: 13,
    color: '#94a3b8',
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  laksText: {
    color: '#f97316',
    fontSize: 12,
  },
  leppefiskText: {
    color: '#22c55e',
    fontSize: 12,
  },
  noDataText: {
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
});
