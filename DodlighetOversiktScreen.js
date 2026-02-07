import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import { supabase } from './supabase';

const screenWidth = Dimensions.get('window').width - 32;

const chartConfig = {
  backgroundColor: '#1e293b',
  backgroundGradientFrom: '#1e293b',
  backgroundGradientTo: '#1e293b',
  decimalPlaces: 0,
  color: () => '#ef4444',
  labelColor: () => '#94a3b8',
};

export default function DodlighetOversiktScreen() {
  const navigation = useNavigation();
  const [period, setPeriod] = useState(14);
  const [loading, setLoading] = useState(true);
  const [merder, setMerder] = useState([]);
  const [history, setHistory] = useState([]);
  const [dailyData, setDailyData] = useState([]);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Hent merder
      const merdsResult = await supabase
        .from('merds')
        .select('id, merd_id, navn')
        .eq('is_active', true);

      // Hent mortality records
      const mortalityResult = await supabase
        .from('mortality_records')
        .select('*')
        .gte('dato', startDateStr)
        .order('dato', { ascending: false });

      const merdsData = merdsResult.data || [];
      const mortalityData = mortalityResult.data || [];

      // Beregn totaler per merd
      const totalsMap = {};
      mortalityData.forEach((r) => {
        if (!totalsMap[r.merd_id]) totalsMap[r.merd_id] = 0;
        totalsMap[r.merd_id] += r.antall_dode || 0;
      });

      const merdList = merdsData.map((m) => ({
        id: m.id,
        navn: m.navn || m.merd_id,
        total: totalsMap[m.id] || 0,
      }));
      setMerder(merdList);

      // Grupper per dag for graf
      const dailyMap = {};
      for (let i = 0; i < period; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        dailyMap[dateStr] = 0;
      }

      mortalityData.forEach((r) => {
        const dateStr = r.dato ? r.dato.split('T')[0] : r.dato;
        if (dailyMap[dateStr] !== undefined) {
          dailyMap[dateStr] += r.antall_dode || 0;
        }
      });

      const dailyArray = Object.keys(dailyMap)
        .sort()
        .map((dato) => ({ dato, total: dailyMap[dato] }));
      setDailyData(dailyArray);

      // Historikk med merd-navn
      const merdNameMap = {};
      merdsData.forEach((m) => {
        merdNameMap[m.id] = m.navn || m.merd_id;
      });

      const historyList = mortalityData.slice(0, 10).map((r) => ({
        id: r.id,
        dato: r.dato,
        merd: merdNameMap[r.merd_id] || 'Ukjent',
        laks: r.laks || 0,
        leppefisk: r.leppefisk || 0,
        arsak: r.arsak || 'Ukjent',
      }));
      setHistory(historyList);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const getTotal = () => merder.reduce((sum, m) => sum + m.total, 0);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const getChartData = () => {
    const step = period === 7 ? 1 : period === 14 ? 2 : 5;
    const labels = dailyData
      .filter((_, i) => i % step === 0)
      .map((d) => formatDate(d.dato));
    const data = dailyData.map((d) => d.total);
    if (data.length === 0) data.push(0);
    return { labels, datasets: [{ data }] };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Henter data fra Supabase...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dodlighet</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('Dodlighet')}
        >
          <Text style={styles.addBtnText}>+ Registrer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.periodRow}>
        {[7, 14, 30].map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p} dager
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Siste {period} dager</Text>
        {dailyData.length > 0 && (
          <BarChart
            data={getChartData()}
            width={screenWidth}
            height={180}
            chartConfig={chartConfig}
            style={{ borderRadius: 8 }}
            fromZero={true}
            yAxisLabel=""
            yAxisSuffix=""
          />
        )}
      </View>

      <Text style={styles.sectionTitle}>Per merd</Text>
      <View style={styles.merdsRow}>
        {merder.map((m) => (
          <View key={m.id} style={styles.merdCard}>
            <Text style={styles.merdName}>{m.navn}</Text>
            <Text style={styles.merdCount}>{m.total}</Text>
          </View>
        ))}
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalCount}>{getTotal()}</Text>
      </View>

      <Text style={styles.sectionTitle}>Historikk</Text>
      <View style={styles.historyCard}>
        {history.length === 0 ? (
          <Text style={styles.noDataText}>Ingen registreringer</Text>
        ) : (
          history.map((h) => (
            <View key={h.id} style={styles.historyRow}>
              <View>
                <Text style={styles.historyDate}>{formatDate(h.dato)}</Text>
                <Text style={styles.historyMerd}>{h.merd}</Text>
              </View>
              <Text style={styles.historyArsak}>{h.arsak}</Text>
              <View>
                <Text style={styles.laksText}>{h.laks} laks</Text>
                <Text style={styles.leppefiskText}>{h.leppefisk} leppef.</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: '#64748b', marginTop: 12 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 40,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  addBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '600' },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  periodBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  periodBtnActive: { backgroundColor: '#3b82f6' },
  periodText: { color: '#64748b', fontWeight: '500' },
  periodTextActive: { color: '#fff' },
  chartCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  merdsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  merdCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  merdName: { fontSize: 14, color: '#fff', marginBottom: 4 },
  merdCount: { fontSize: 28, fontWeight: 'bold', color: '#ef4444' },
  totalCard: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  totalLabel: { fontSize: 18, color: '#fff' },
  totalCount: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  historyCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 12 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  historyDate: { fontSize: 14, fontWeight: '600', color: '#fff' },
  historyMerd: { fontSize: 12, color: '#64748b' },
  historyArsak: { fontSize: 13, color: '#94a3b8' },
  laksText: { color: '#f97316', fontSize: 12 },
  leppefiskText: { color: '#22c55e', fontSize: 12 },
  noDataText: { color: '#64748b', textAlign: 'center', paddingVertical: 20 },
});
