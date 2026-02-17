import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

type MenuItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen?: string;
  action?: () => void;
};

export default function InnstillingerScreen() {
  const navigation = useNavigation<any>();
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

  const menuItems: MenuItem[] = [
    {
      id: 'historikk',
      title: 'Tellehistorikk',
      subtitle: 'Se alle lusetellinger',
      icon: 'list',
      screen: 'Historikk',
    },
    {
      id: 'dodlighet',
      title: 'Dødelighet',
      subtitle: 'Oversikt over dødelighet',
      icon: 'stats-chart',
      screen: 'DodlighetOversikt',
    },
    {
      id: 'miljo',
      title: 'Miljødata',
      subtitle: 'Temperatur, oksygen, salinitet',
      icon: 'water',
      screen: 'Miljo',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Funksjoner</Text>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuCard}
            onPress={() => item.screen && navigation.navigate(item.screen)}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name={item.icon} size={22} color="#3b82f6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Account Section */}
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

      {/* About Section */}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
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
  menuCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#64748b',
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
    marginBottom: 40,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
