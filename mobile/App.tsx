import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import HomeScreen from './src/screens/HomeScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import JoinGroupScreen from './src/screens/JoinGroupScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const linking = {
    prefixes: ['myapp://'],
    config: {
      screens: {
        Home: '',
        CreateGroup: 'create',
        JoinGroup: 'join',
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ title: '群組專案' }}
        />
        <Stack.Screen 
          name="CreateGroup" 
          component={CreateGroupScreen}
          options={{ title: '建立群組' }}
        />
        <Stack.Screen 
          name="JoinGroup" 
          component={JoinGroupScreen}
          options={{ title: '加入群組' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}