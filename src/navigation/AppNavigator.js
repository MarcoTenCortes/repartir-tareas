// src/navigation/AppNavigator.js
import React, { useContext } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import AppHeader from '../components/AppHeader';
import HomeScreen from '../screens/HomeScreen';
import TasksScreen from '../screens/TasksScreen';
import ShoppingScreen from '../screens/ShoppingScreen';
import RemindersScreen from '../screens/RemindersScreen';
import GroupSearchScreen from '../screens/GroupSearchScreen';
import GroupCreateScreen from '../screens/GroupCreateScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { UserContext } from '../context/UserContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <View style={{ flex: 1 }}>
      <AppHeader />
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName = 'ellipse-outline';
            if (route.name === 'Home') iconName = 'home-outline';
            if (route.name === 'Tareas') iconName = 'checkmark-done-outline';
            if (route.name === 'Compra') iconName = 'cart-outline';
            if (route.name === 'Recordatorios') iconName = 'alarm-outline';
            return (
              <Ionicons
                name={iconName}
                size={size}
                color={color}
                style={{ marginBottom: -6 }}
              />
            );
          },
          tabBarLabelStyle: { paddingBottom: 4 },
          tabBarStyle: { height: 70, paddingBottom: 20 },
          headerShown: false
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Tareas" component={TasksScreen} />
        <Tab.Screen name="Compra" component={ShoppingScreen} />
        <Tab.Screen name="Recordatorios" component={RemindersScreen} />
      </Tab.Navigator>
    </View>
  );
}

export default function AppNavigator() {
  const { user } = useContext(UserContext);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="BuscarGrupo" component={GroupSearchScreen} />
            <Stack.Screen name="CrearGrupo" component={GroupCreateScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
