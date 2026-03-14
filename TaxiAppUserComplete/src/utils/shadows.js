import { Platform } from 'react-native';

// Helper de sombras compatible con iOS y Android
export const shadow = (elevation = 2) => {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: elevation / 2 },
      shadowOpacity: 0.1 + (elevation * 0.02),
      shadowRadius: elevation,
    };
  }
  return {
    elevation,
  };
};

// Sombras predefinidas más usadas
export const shadows = {
  sm: shadow(2),
  md: shadow(3),
  lg: shadow(5),
  xl: shadow(10),
  xxl: shadow(20),
};