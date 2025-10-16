import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';

const ThemeToggle = () => {
  const { isDarkMode, colors, toggleTheme } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={toggleTheme}
    >
      <Icon 
        name={isDarkMode ? 'moon' : 'sunny'} 
        size={24} 
        color={colors.primary} 
      />
      <Text style={[styles.text, { color: colors.text }]}>
        {isDarkMode ? 'Modo Oscuro' : 'Modo Claro'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    margin: 10,
  },
  text: {
    marginLeft: 10,
    fontSize: 16,
  },
});

export default ThemeToggle;
