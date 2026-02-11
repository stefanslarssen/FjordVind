import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function InnstillingerScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Logg ut',
      'Er du sikker på at du vil logge ut?',
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Logg ut', style: 'destructive', onPress: signOut },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Innstillinger</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Konto</Text>
        <View style={styles.card}>
          <Text style={styles.label}>E-post</Text>
          <Text style={styles.value}>{user?.email || '-'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Navn</Text>
          <Text style={styles.value}>
            {user?.user_metadata?.full_name || '-'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Om appen</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Versjon</Text>
          <Text style={styles.value}>1.0.0</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Utviklet av</Text>
          <Text style={styles.value}>NFS NordFjordSolutions AS</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Logg ut</Text>
      </TouchableOpacity>
    </View>
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
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: '#94a3b8',
  },
  value: {
    fontSize: 16,
    color: '#fff',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
