// ================================
// Week 4: Location Tracking Component
// components/LocationTracker.tsx
// ================================

'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getCurrentPosition,
  watchPosition,
  clearWatch,
  checkLocationPermission,
  LocationData
} from '@/lib/locationUtils';

interface LocationTrackerProps {
  groupId: string;
  deviceId: string;
  onLocationUpdate?: (location: LocationData) => void;
  updateInterval?: number; // Update frequency (milliseconds)
}

export default function LocationTracker({
  groupId,
  deviceId,
  onLocationUpdate,
  updateInterval = 10000 // Default 10 seconds
}: LocationTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Check location permission
  useEffect(() => {
    checkLocationPermission().then(setPermission);
  }, []);

  // Update location to Supabase
  const updateLocationInDB = async (latitude: number, longitude: number) => {
    try {
      const { error: updateError } = await supabase
        .from('group_members')
        .update({
          latitude,
          longitude,
          location_updated_at: new Date().toISOString()
        })
        .eq('group_id', groupId)
        .eq('device_id', deviceId);

      if (updateError) {
        console.error('Failed to update location:', updateError);
        setError('Unable to update location to server');
      } else {
        setLastUpdate(new Date());
        setError(null);
      }
    } catch (err) {
      console.error('Error updating location:', err);
      setError('An unknown error occurred');
    }
  };

  // Start tracking
  const startTracking = async () => {
    try {
      setError(null);
      
      // Get current position first
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;

      await updateLocationInDB(latitude, longitude);
      
      onLocationUpdate?.({
        latitude,
        longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      });

      setIsTracking(true);
      setPermission('granted');
    } catch (err: any) {
      console.error('Failed to start tracking:', err);
      
      if (err.code === 1) {
        setError('Please allow location access');
        setPermission('denied');
      } else if (err.code === 2) {
        setError('Unable to get location information');
      } else if (err.code === 3) {
        setError('Location request timed out');
      } else {
        setError(err.message || 'Unable to start tracking');
      }
      
      setIsTracking(false);
    }
  };

  // Stop tracking
  const stopTracking = () => {
    setIsTracking(false);
  };

  // Continuous location tracking
  useEffect(() => {
    if (!isTracking) return;

    let watchId: number = -1;
    let lastUpdateTime = Date.now();

    watchId = watchPosition(
      (position) => {
        const now = Date.now();
        
        // Only update after specified interval
        if (now - lastUpdateTime >= updateInterval) {
          const { latitude, longitude } = position.coords;
          
          updateLocationInDB(latitude, longitude);
          
          onLocationUpdate?.({
            latitude,
            longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });

          lastUpdateTime = now;
        }
      },
      (err) => {
        console.error('Location tracking error:', err);
        if (err.code === 1) {
          setError('Location permission denied');
          setIsTracking(false);
        }
      }
    );

    // Cleanup function
    return () => {
      if (watchId !== -1) {
        clearWatch(watchId);
      }
    };
  }, [isTracking, updateInterval, groupId, deviceId]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Location Tracking</h3>
        <div className="flex items-center gap-2">
          {isTracking && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600">Tracking</span>
            </div>
          )}
        </div>
      </div>

      {/* Permission status */}
      {permission === 'denied' && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            ⚠️ Location permission denied. Please enable location access in your browser settings.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">{error}</p>
        </div>
      )}

      {/* Last update time */}
      {lastUpdate && (
        <div className="mb-3 text-sm text-gray-600">
          Last updated: {lastUpdate.toLocaleTimeString('en-US')}
        </div>
      )}

      {/* Control buttons */}
      <div className="flex gap-2">
        {!isTracking ? (
          <button
            onClick={startTracking}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors font-medium"
          >
            Start Tracking
          </button>
        ) : (
          <button
            onClick={stopTracking}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors font-medium"
          >
            Stop Tracking
          </button>
        )}
      </div>

      {/* Description */}
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          💡 Once location tracking is enabled, your location will be automatically updated every {updateInterval / 1000} seconds, and other group members can see your location on the map.
        </p>
      </div>
    </div>
  );
}

