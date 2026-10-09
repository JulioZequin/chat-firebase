import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { Loading } from '../components/Loading';
import { NotificationContext } from '../contexts/NotificationContext';
import { useAuth, useCurrentUid } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { GroupFormScreen } from '../screens/GroupFormScreen';
import { GroupMembersScreen } from '../screens/GroupMembersScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { UsersScreen } from '../screens/UsersScreen';
import type { AppStackParamList, AuthStackParamList } from '../types/navigation';
import { colors } from '../theme';
import { navigationRef } from './navigationRef';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const theme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.background, card: colors.surface },
};

const screenOptions = {
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.text, fontWeight: '700' as const },
};

function AuthNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <AuthStack.Navigator screenOptions={screenOptions}>
        <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Criar conta' }} />
      </AuthStack.Navigator>
    </NavigationContainer>
  );
}

/** Só é montado com usuário autenticado; ao fazer logout tudo é desmontado (listeners incluídos). */
function AppNavigator() {
  const uid = useCurrentUid();
  const { status, retryRegistration, flushPending } = useNotifications(uid);
  const notificationValue = useMemo(() => ({ status, retryRegistration }), [retryRegistration, status]);

  return (
    <NotificationContext.Provider value={notificationValue}>
      <NavigationContainer ref={navigationRef} theme={theme} onReady={flushPending}>
        <AppStack.Navigator screenOptions={screenOptions}>
          <AppStack.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Conversas' }} />
          <AppStack.Screen name="Users" component={UsersScreen} />
          <AppStack.Screen name="GroupForm" component={GroupFormScreen} />
          <AppStack.Screen name="Chat" component={ChatScreen} getId={({ params }) => params.conversationId} />
          <AppStack.Screen name="GroupMembers" component={GroupMembersScreen} />
          <AppStack.Screen name="Profile" component={ProfileScreen} />
        </AppStack.Navigator>
      </NavigationContainer>
    </NotificationContext.Provider>
  );
}

export function RootNavigator() {
  const { user, initializing, registering } = useAuth();
  if (initializing) return <Loading message="Recuperando sessão..." />;
  // `key` garante que trocar de usuário recria toda a árvore autenticada.
  return user && !registering ? <AppNavigator key={user.uid} /> : <AuthNavigator />;
}
