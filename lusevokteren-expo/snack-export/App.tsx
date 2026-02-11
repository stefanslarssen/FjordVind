import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

// Screens
import DashboardScreen from './screens/DashboardScreen';
import DodlighetScreen from './screens/DodlighetScreen';
import DodlighetOversiktScreen from './screens/DodlighetOversiktScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab icon component
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: 'H',
    DodlighetOversikt: 'D',
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
        name="DodlighetOversikt"
        component={DodlighetOversiktScreen}
        options={{ title: 'Dodlighet' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#fff',
          contentStyle: { backgroundColor: '#0f172a' },
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Dodlighet"
          component={DodlighetScreen}
          options={{ title: 'Registrer Dodlighet' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
