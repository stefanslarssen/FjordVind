import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { supabase } from '../config/supabase';

const screenWidth = Dimensions.get('window').width - 32;

interface MerdSummary {
  merd_id: string;
  merd_navn: string;
  total_dode: number;
}

interface DailyRecord {
  dato: string;
  total: number;
  laks: number;
  leppefisk: number;
}

interface HistoryRecord {
  id: string;
  dato: string;
  merd_navn: string;
  laks: number;
  leppefisk: number;
  arsak: string;
}

type PeriodType = 7 | 14 | 30;
type ChartType = 'line' | 'bar';

// Arsak categories for filtering
const ARSAK_KATEGORIER = [
  'Alle',
  'Naturlig',
  'Ukjent',
  'Sykdom',
  'Behandling',
  'Haandtering',
  'Predator',
  'Miljo',
  'Annet',
];

export default function DodlighetOversiktScreen() {
  const navigation = useNavigation<any>();
  const [summaries, setSummaries] = useState<MerdSummary[]>([]);
  const [dailyData, setDailyData] = useState<DailyRecord[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [allHistory, setAllHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodType>(14);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedMerd, setSelectedMerd] = useState<string>('Alle');
  const [selectedArsak, setSelectedArsak] = useState<string>('Alle');
  const [showFilters, setShowFilters] = useState(false);

  const loadData = async () => {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Get all merds first
      const { data: merdsData } = await supabase
        .from('merds')
        .select('id, merd_id, navn')
        .eq('is_active', true);

      // Get mortality records for period
      const { data: mortalityData } = await supabase
        .from('mortality_records')
        .select('*')
        .gte('dato', startDateStr)
        .order('dato', { ascending: false });

      // Calculate totals per merd
      const totalsMap: Record<string, number> = {};
      (mortalityData || []).forEach((r: any) => {
        totalsMap[r.merd_id] = (totalsMap[r.merd_id] || 0) + (r.antall_dode || 0);
      });

      // Create summaries for all merds
      const summaryList: MerdSummary[] = (merdsData || []).map((m: any) => ({
        merd_id: m.id,
        merd_navn: m.navn || m.merd_id,
        total_dode: totalsMap[m.id] || 0,
      }));

      setSummaries(summaryList);

      // Group by date for chart
      const dailyMap: Record<string, { total: number; laks: number; leppefisk: number }> = {};

      // Initialize all days in period
      for (let i = 0; i < period; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        dailyMap[dateStr] = { total: 0, laks: 0, leppefisk: 0 };
      }

      // Fill in actual data
      (mortalityData || []).forEach((r: any) => {
        const dateStr = r.dato?.split('T')[0] || r.dato;
        if (dailyMap[dateStr]) {
          dailyMap[dateStr].total += r.antall_dode || 0;
          dailyMap[dateStr].laks += r.laks || 0;
          dailyMap[dateStr].leppefisk += r.leppefisk || 0;
        }
      });

      // Convert to array and sort
      const dailyArray: DailyRecord[] = Object.entries(dailyMap)
        .map(([dato, data]) => ({ dato, ...data }))
        .sort((a, b) => a.dato.localeCompare(b.dato));

      setDailyData(dailyArray);

      // Create history list with merd names
      const merdNameMap: Record<string, string> = {};
      (merdsData || []).forEach((m: any) => {
        merdNameMap[m.id] = m.navn || m.merd_id;
      });

      const historyList: HistoryRecord[] = (mortalityData || []).map((r: any) => ({
        id: r.id,
        dato: r.dato,
        merd_navn: merdNameMap[r.merd_id] || 'Ukjent',
        laks: r.laks || 0,
        leppefisk: r.leppefisk || 0,
        arsak: r.arsak || 'Ukjent',
      }));

      setAllHistory(historyList);
      setHistory(historyList);
    } catch (error) {
      console.error('Error loading mortality data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Apply filters to history
  useEffect(() => {
    let filtered = [...allHistory];

    if (selectedMerd !== 'Alle') {
      filtered = filtered.filter(r => r.merd_navn === selectedMerd);
    }

    if (selectedArsak !== 'Alle') {
      filtered = filtered.filter(r => {
        const arsak = r.arsak.toLowerCase();
        const filter = selectedArsak.toLowerCase();
        return arsak.includes(filter) || arsak === filter;
      });
    }

    setHistory(filtered);
  }, [selectedMerd, selectedArsak, allHistory]);

  useEffect(() => {
    loadData();
  }, [period]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getTotal = () => {
    return summaries.reduce((sum, s) => sum + s.total_dode, 0);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const getChartData = () => {
    // Show fewer labels for readability
    const step = period === 7 ? 1 : period === 14 ? 2 : 5;
    const labels = dailyData
      .filter((_, i) => i % step === 0 || i === dailyData.length - 1)
      .map(d => formatDate(d.dato));

    const data = dailyData.map(d => d.total);

    return {
      labels,
      datasets: [{ data: data.length > 0 ? data : [0] }],
    };
  };

  const chartConfig = {
    backgroundColor: '#1e293b',
    backgroundGradientFrom: '#1e293b',
    backgroundGradientTo: '#1e293b',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#ef4444',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#334155',
    },
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
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
        <Text style={styles.filterToggleIcon}>{showFilters ? '−' : '+'}</Text>
      </TouchableOpacity>

      {/* Filter options */}
      {showFilters && (
        <View style={styles.filterCard}>
          <Text style={styles.filterLabel}>Merd</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, selectedMerd === 'Alle' && styles.filterChipActive]}
              onPress={() => setSelectedMerd('Alle')}
            >
              <Text style={[styles.filterChipText, selectedMerd === 'Alle' && styles.filterChipTextActive]}>Alle</Text>
            </TouchableOpacity>
            {summaries.map((s) => (
              <TouchableOpacity
                key={s.merd_id}
                style={[styles.filterChip, selectedMerd === s.merd_navn && styles.filterChipActive]}
                onPress={() => setSelectedMerd(s.merd_navn)}
              >
                <Text style={[styles.filterChipText, selectedMerd === s.merd_navn && styles.filterChipTextActive]}>
                  {s.merd_navn}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.filterLabel, { marginTop: 12 }]}>Arsak</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {ARSAK_KATEGORIER.map((arsak) => (
              <TouchableOpacity
                key={arsak}
                style={[styles.filterChip, selectedArsak === arsak && styles.filterChipActive]}
                onPress={() => setSelectedArsak(arsak)}
              >
                <Text style={[styles.filterChipText, selectedArsak === arsak && styles.filterChipTextActive]}>
                  {arsak}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {(selectedMerd !== 'Alle' || selectedArsak !== 'Alle') && (
            <TouchableOpacity
              style={styles.clearFiltersBtn}
              onPress={() => {
                setSelectedMerd('Alle');
                setSelectedArsak('Alle');
              }}
            >
              <Text style={styles.clearFiltersBtnText}>Nullstill filtere</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Graf */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Dodlighet siste {period} dager</Text>
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

        {dailyData.length > 0 && (
          chartType === 'line' ? (
            <LineChart
              data={getChartData()}
              width={screenWidth}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              fromZero={true}
            />
          ) : (
            <BarChart
              data={getChartData()}
              width={screenWidth}
              height={200}
              chartConfig={chartConfig}
              style={styles.chart}
              withInnerLines={true}
              showValuesOnTopOfBars={false}
              fromZero={true}
              yAxisLabel=""
              yAxisSuffix=""
            />
          )
        )}

        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Total dodlighet</Text>
          </View>
        </View>
      </View>

      {/* Merder i en rad */}
      <Text style={styles.sectionTitle}>Per merd</Text>
      <View style={styles.merdsRow}>
        {summaries.map((s) => (
          <View key={s.merd_id} style={styles.merdCard}>
            <Text style={styles.merdName}>{s.merd_navn}</Text>
            <Text style={styles.merdCount}>{s.total_dode}</Text>
          </View>
        ))}
      </View>

      {/* Oppsummering */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total siste {period} dager</Text>
        <Text style={styles.totalCount}>{getTotal()}</Text>
      </View>

      {/* Historikk */}
      <Text style={styles.sectionTitle}>Historikk</Text>
      <View style={styles.historyCard}>
        {history.length === 0 ? (
          <Text style={styles.noDataText}>Ingen registreringer i perioden</Text>
        ) : (
          history.slice(0, 20).map((record) => (
            <View key={record.id} style={styles.historyRow}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyDate}>{formatDate(record.dato)}</Text>
                <Text style={styles.historyMerd}>{record.merd_navn}</Text>
              </View>
              <View style={styles.historyMiddle}>
                <Text style={styles.historyCause}>{record.arsak}</Text>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyCount}>
                  {record.laks > 0 && <Text style={styles.laksText}>{record.laks} laks</Text>}
                  {record.laks > 0 && record.leppefisk > 0 && ' + '}
                  {record.leppefisk > 0 && <Text style={styles.leppefiskText}>{record.leppefisk} leppef.</Text>}
                </Text>
              </View>
            </View>
          ))
        )}
        {history.length > 20 && (
          <Text style={styles.moreText}>+ {history.length - 20} flere registreringer</Text>
        )}
      </View>

      {/* Statistikk */}
      <Text style={styles.sectionTitle}>Statistikk</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {dailyData.length > 0
              ? Math.round(dailyData.reduce((sum, d) => sum + d.total, 0) / dailyData.length)
              : 0}
          </Text>
          <Text style={styles.statLabel}>Snitt/dag</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {dailyData.length > 0 ? Math.max(...dailyData.map(d => d.total)) : 0}
          </Text>
          <Text style={styles.statLabel}>Maks/dag</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {dailyData.reduce((sum, d) => sum + d.laks, 0)}
          </Text>
          <Text style={styles.statLabel}>Laks totalt</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {dailyData.reduce((sum, d) => sum + d.leppefisk, 0)}
          </Text>
          <Text style={styles.statLabel}>Leppefisk</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 16,
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
    fontWeight: '500',
  },
  chartTypeBtnTextActive: {
    color: '#fff',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    marginTop: 8,
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
    width: 80,
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
  historyCount: {
    fontSize: 13,
    color: '#fff',
  },
  laksText: {
    color: '#f97316',
  },
  leppefiskText: {
    color: '#22c55e',
  },
  noDataText: {
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 20,
  },
  moreText: {
    color: '#64748b',
    textAlign: 'center',
    paddingTop: 12,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    flex: 1,
    minWidth: '45%',
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
    fontWeight: '500',
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
    marginBottom: 16,
  },
  filterLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  filterScroll: {
    flexDirection: 'row',
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
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  clearFiltersBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
  },
  clearFiltersBtnText: {
    color: '#64748b',
    fontSize: 13,
  },
});
