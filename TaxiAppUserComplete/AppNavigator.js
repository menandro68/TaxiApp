@"
import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { TripProvider } from '../context/TripContext';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Importar las pantallas
import App from '../../App.tsx';
import TripHistoryScreen from '../screens/TripHistoryScreen';
import TripDetailsScreen from '../screens/TripDetailsScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import FavoriteAddressesScreen from '../screens/FavoriteAddressesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SupportScreen from '../screens/SupportScreen';

const Stack = createStackNavigator();

// Crear un wrapper para el App principal
const MainScreen = ({ navigation }) => {
  return <App navigation={navigation} />;
};

const AppNavigator = () => {
  return (
    <AuthProvider>
      <TripProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Main"
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen
              name="Main"
              component={MainScreen}
            />
            
            <Stack.Screen
              name="TripHistory"
              component={TripHistoryScreen}
              options={{ presentation: 'modal' }}
            />
            
            <Stack.Screen
              name="TripDetails"
              component={TripDetailsScreen}
              options={{ presentation: 'card' }}
            />

            <Stack.Screen
              name="PaymentMethods"
              component={PaymentMethodsScreen}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="FavoriteAddresses"
              component={FavoriteAddressesScreen}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ headerShown: false }}
            />
            
            <Stack.Screen
              name="Support"
              component={SupportScreen}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </TripProvider>
    </AuthProvider>
  );
};

export default AppNavigator;
"@ | Out-File -FilePath src\navigation\AppNavigator.js -Encoding UTF8