import React, { createContext, useState, useContext } from 'react';

const TripContext = createContext({});

export const useTrip = () => useContext(TripContext);

export const TripProvider = ({ children }) => {
  const [currentTrip, setCurrentTrip] = useState(null);
  const [tripStatus, setTripStatus] = useState('idle'); // idle, searching, driver_assigned, in_progress, completed
  const [driver, setDriver] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [estimatedFare, setEstimatedFare] = useState(null);

  const startTripSearch = (originLocation, destinationLocation) => {
    setOrigin(originLocation);
    setDestination(destinationLocation);
    setTripStatus('searching');
    // Aquí iría la lógica para buscar conductor
  };

  const assignDriver = (driverData) => {
    setDriver(driverData);
    setTripStatus('driver_assigned');
  };

  const startTrip = () => {
    setTripStatus('in_progress');
    setCurrentTrip({
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      origin,
      destination,
      driver
    });
  };

  const endTrip = (fareAmount) => {
    setTripStatus('completed');
    setCurrentTrip({
      ...currentTrip,
      endTime: new Date().toISOString(),
      finalFare: fareAmount
    });
  };

  const cancelTrip = () => {
    setCurrentTrip(null);
    setTripStatus('idle');
    setDriver(null);
    setOrigin(null);
    setDestination(null);
    setEstimatedFare(null);
  };

  const value = {
    currentTrip,
    tripStatus,
    driver,
    origin,
    destination,
    estimatedFare,
    startTripSearch,
    assignDriver,
    startTrip,
    endTrip,
    cancelTrip,
    setEstimatedFare,
    isInTrip: tripStatus !== 'idle' && tripStatus !== 'completed'
  };

  return (
    <TripContext.Provider value={value}>
      {children}
    </TripContext.Provider>
  );
};

export default TripContext;
