// src/history/TripHistoryStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'trip_history_v1';

export async function addTripToHistory(trip) {
  // trip: { id, origin, destination, distance, duration, price, vehicleType, driver, createdAt, paymentMethod, rating }
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    // al inicio para ver el más reciente primero
    const updated = [{ ...trip, id: trip.id || `trip_${Date.now()}` }, ...list];
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
    return updated[0];
  } catch (e) {
    console.error('addTripToHistory error', e);
    throw e;
  }
}

export async function getTripHistory(limit = 100, offset = 0) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.slice(offset, offset + limit);
  } catch (e) {
    console.error('getTripHistory error', e);
    return [];
  }
}

export async function clearTripHistory() {
  try {
    await AsyncStorage.removeItem(KEY);
    return true;
  } catch (e) {
    console.error('clearTripHistory error', e);
    return false;
  }
}

export async function deleteTripFromHistory(tripId) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(t => t.id !== tripId);
    await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
    return filtered;
  } catch (e) {
    console.error('deleteTripFromHistory error', e);
    throw e;
  }
}
