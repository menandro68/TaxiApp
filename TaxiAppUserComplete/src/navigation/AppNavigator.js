import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Importar pantallas
import App from '../../App';
import HomeScreen from '../screens/HomeScreen';
import { LostItemReportScreen } from '../screens/LostItems';
import TripHistoryScreen from '../screens/TripHistoryScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import PaymentHistoryScreen from '../screens/PaymentHistoryScreen';
import FavoriteAddressesScreen from '../screens/FavoriteAddressesScreen';
import AddressHistoryScreen from '../screens/AddressHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SupportScreen from '../screens/SupportScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Main"
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="Main" component={App} />
        
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{
            headerShown: true,
            headerTitle: 'Buscar Conductor',
            headerStyle: {
              backgroundColor: '#4A90E2',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        
        <Stack.Screen 
          name="LostItemReport" 
          component={LostItemReportScreen}
          options={{
            headerShown: true,
            headerTitle: 'Objetos Perdidos',
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        
        <Stack.Screen name="TripHistory" component={TripHistoryScreen} />
        <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
        <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
        
        <Stack.Screen 
          name="AddressHistory" 
          component={AddressHistoryScreen}
          options={{
            headerShown: true,
            headerTitle: 'Historial de Destinos',
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        
        <Stack.Screen 
          name="FavoriteAddresses" 
          component={FavoriteAddressesScreen}
          options={{
            headerShown: false
          }}
        />
        
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            headerShown: false
          }}
        />
        
        <Stack.Screen 
          name="Support" 
          component={SupportScreen}
          options={{
            headerShown: false
          }}
        />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;