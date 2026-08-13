import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import OnboardingModal from './src/components/OnboardingModal';
import Dashboard from './src/screens/Dashboard';
import Assets from './src/screens/Assets';
import History from './src/screens/History';
import Goals from './src/screens/Goals';
import Settings from './src/screens/Settings';
import { SettingsProvider, ThemeProvider, useSettings, useTheme } from './src/contexts';
import { RootTabParamList } from './src/navigation/types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const navigationRef = createNavigationContainerRef<RootTabParamList>();

function AppContent() {
  const { colors, isDarkMode } = useTheme();
  const { settings, updateSettings, isLoading } = useSettings();
  const appStateRef = useRef<AppStateStatus>((AppState.currentState ?? 'active') as AppStateStatus);
  const [showPrivacyScreen, setShowPrivacyScreen] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      setShowPrivacyScreen(settings.privacyScreenEnabled && nextState !== 'active');
    });

    return () => subscription.remove();
  }, [settings.privacyScreenEnabled]);

  useEffect(() => {
    setShowPrivacyScreen(settings.privacyScreenEnabled && appStateRef.current !== 'active');
  }, [settings.privacyScreenEnabled]);

  const navigateTo = (screen: keyof RootTabParamList) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(screen);
    }
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap;

              if (route.name === 'Dashboard') {
                iconName = focused ? 'pie-chart' : 'pie-chart-outline';
              } else if (route.name === 'Assets') {
                iconName = focused ? 'wallet' : 'wallet-outline';
              } else if (route.name === 'History') {
                iconName = focused ? 'time' : 'time-outline';
              } else if (route.name === 'Goals') {
                iconName = focused ? 'flag' : 'flag-outline';
              } else if (route.name === 'Settings') {
                iconName = focused ? 'settings' : 'settings-outline';
              } else {
                iconName = 'help-circle-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.gray400,
            tabBarStyle: {
              backgroundColor: colors.bgPrimary,
              borderTopColor: colors.gray200,
            },
            headerShown: false,
          })}
        >
          <Tab.Screen name="Dashboard" component={Dashboard} />
          <Tab.Screen name="Assets" component={Assets} />
          <Tab.Screen name="History" component={History} />
          <Tab.Screen name="Goals" component={Goals} />
          <Tab.Screen name="Settings" component={Settings} />
        </Tab.Navigator>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {!isLoading && (
          <OnboardingModal
            visible={!settings.onboardingCompleted}
            settings={settings}
            onComplete={updateSettings}
            onAddAsset={() => navigateTo('Assets')}
            onImportBackup={() => navigateTo('Settings')}
          />
        )}
        {showPrivacyScreen && (
          <View style={[styles.privacyOverlay, { backgroundColor: colors.bgPrimary }]}>
            <Ionicons name="lock-closed-outline" size={36} color={colors.primary} />
            <Text style={[styles.privacyTitle, { color: colors.gray900 }]}>Savings hidden</Text>
          </View>
        )}
      </SafeAreaView>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  privacyOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3000,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
});
