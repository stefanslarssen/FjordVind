import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import NyTellingScreen from './src/screens/NyTellingScreen';
import HistorikkScreen from './src/screens/HistorikkScreen';
import InnstillingerScreen from './src/screens/InnstillingerScreen';
import DodlighetScreen from './src/screens/DodlighetScreen';
import DodlighetOversiktScreen from './src/screens/DodlighetOversiktScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab icon component
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: 'H',
    Historikk: 'L',
    DodlighetOversikt: 'D',
    Innstillinger: 'I',
  };
  return (
    <View style={{
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: focused ? '#3b82f6' : '#334155',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Text style={{ fontSize: 14, color: '#fff', fontWeight: '600' }}>
        {icons[name] || '?'}
      </Text>
    </View>
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
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
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
        name="Historikk"
        component={HistorikkScreen}
        options={{ title: 'Historikk' }}
      />
      <Tab.Screen
        name="DodlighetOversikt"
        component={DodlighetOversiktScreen}
        options={{ title: 'Dodlighet' }}
      />
      <Tab.Screen
        name="Innstillinger"
        component={InnstillingerScreen}
        options={{ title: 'Innstillinger' }}
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
        <Text style={{ color: '#3b82f6', fontSize: 24 }}>FjordVind</Text>
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
            options={{ title: 'Ny Telling' }}
          />
          <Stack.Screen
            name="Dodlighet"
            component={DodlighetScreen}
            options={{ title: 'Registrer Dodlighet' }}
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
