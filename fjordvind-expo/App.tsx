import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import NyTellingScreen from './src/screens/NyTellingScreen';
import HistorikkScreen from './src/screens/HistorikkScreen';
import InnstillingerScreen from './src/screens/InnstillingerScreen';
import DodlighetScreen from './src/screens/DodlighetScreen';
import DodlighetOversiktScreen from './src/screens/DodlighetOversiktScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import BehandlingerScreen from './src/screens/BehandlingerScreen';
import MiljoScreen from './src/screens/MiljoScreen';
import PrognoserScreen from './src/screens/PrognoserScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab icon component
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    Dashboard: 'home',
    Varsler: 'notifications',
    Prognoser: 'trending-up',
    Behandlinger: 'medical',
    Mer: 'menu',
  };
  const iconName = icons[name] || 'help-circle';
  return (
    <Ionicons
      name={focused ? iconName : `${iconName}-outline` as keyof typeof Ionicons.glyphMap}
      size={24}
      color={focused ? '#3b82f6' : '#64748b'}
    />
  );
}

// More stack for nested screens
function MoreStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1e293b' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <Stack.Screen
        name="MerOversikt"
        component={InnstillingerScreen}
        options={{ title: 'Mer' }}
      />
      <Stack.Screen
        name="Historikk"
        component={HistorikkScreen}
        options={{ title: 'Historikk' }}
      />
      <Stack.Screen
        name="DodlighetOversikt"
        component={DodlighetOversiktScreen}
        options={{ title: 'Dødelighet' }}
      />
      <Stack.Screen
        name="Miljo"
        component={MiljoScreen}
        options={{ title: 'Miljødata' }}
      />
    </Stack.Navigator>
  );
}

// Main tab navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Hjem' }}
      />
      <Tab.Screen
        name="Varsler"
        component={AlertsScreen}
        options={{ title: 'Varsler' }}
      />
      <Tab.Screen
        name="Prognoser"
        component={PrognoserScreen}
        options={{ title: 'Prognoser' }}
      />
      <Tab.Screen
        name="Behandlinger"
        component={BehandlingerScreen}
        options={{ title: 'Behandling' }}
      />
      <Tab.Screen
        name="Mer"
        component={MoreStack}
        options={{ title: 'Mer' }}
      />
    </Tab.Navigator>
  );
}

// Root navigator
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <Text style={{ color: '#3b82f6', fontSize: 32, fontWeight: 'bold' }}>FjordVind</Text>
        <Text style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>Laster...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1e293b' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#0f172a' },
      }}
    >
      {user ? (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="NyTelling"
            component={NyTellingScreen}
            options={{ title: 'Ny Lusetelling' }}
          />
          <Stack.Screen
            name="Dodlighet"
            component={DodlighetScreen}
            options={{ title: 'Registrer Dødelighet' }}
          />
          <Stack.Screen
            name="Historikk"
            component={HistorikkScreen}
            options={{ title: 'Tellehistorikk' }}
          />
          <Stack.Screen
            name="DodlighetOversikt"
            component={DodlighetOversiktScreen}
            options={{ title: 'Dødelighet' }}
          />
          <Stack.Screen
            name="Miljo"
            component={MiljoScreen}
            options={{ title: 'Miljødata' }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
