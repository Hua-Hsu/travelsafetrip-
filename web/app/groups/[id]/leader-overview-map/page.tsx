'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Users, MapPin, TrendingUp, Clock } from 'lucide-react';
import PushMeetupReminder from '@/components/leader/PushMeetupReminder';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

interface Member {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  is_online: boolean;
  is_sharing_location: boolean;
  last_seen: string | null;
  role: string;
}

interface MeetupPoint {
  latitude: number;
  longitude: number;
  address?: string;
}

export default function LeaderOverviewMap() {
  const params = useParams();
  const groupId = params.id as string;
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  
  const [userId, setUserId] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [meetupPoint, setMeetupPoint] = useState<MeetupPoint | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    sharing: 0,
    avgDistance: 0,
    farthest: 0,
  });

  // Get user ID from session
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get member ID
      const { data: memberData } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', session.user.id)
        .single();

      if (memberData) {
        setUserId(memberData.id);
      }
    };

    getUserId();
  }, [groupId]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-119.4179, 36.7783], // California default
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Fetch group data
  useEffect(() => {
    const fetchData = async () => {
      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('id, name, latitude, longitude, is_online, is_sharing_location, last_seen, role')
        .eq('group_id', groupId);

      if (membersError) {
        console.error('Error fetching members:', membersError);
        return;
      }

      // Fetch meetup point
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('meetup_latitude, meetup_longitude, meetup_address')
        .eq('id', groupId)
        .single();

      if (groupError) {
        console.error('Error fetching group:', groupError);
        return;
      }

      setMembers(membersData || []);
      
      if (groupData?.meetup_latitude && groupData?.meetup_longitude) {
        setMeetupPoint({
          latitude: groupData.meetup_latitude,
          longitude: groupData.meetup_longitude,
          address: groupData.meetup_address,
        });
      }
    };

    fetchData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`leader-overview-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  // Update map markers and stats
  useEffect(() => {
    if (!map.current || members.length === 0) return;

    // Clear existing markers
    Object.values(markers.current).forEach((marker) => marker.remove());
    markers.current = {};

    const bounds = new mapboxgl.LngLatBounds();
    let totalDistance = 0;
    let maxDistance = 0;
    let validDistances = 0;

    // Add meetup point marker
    if (meetupPoint) {
      const meetupMarker = new mapboxgl.Marker({ color: '#8B5CF6' })
        .setLngLat([meetupPoint.longitude, meetupPoint.latitude])
        .setPopup(
          new mapboxgl.Popup().setHTML(`
            <div class="text-black">
              <strong>Meetup Point</strong>
              ${meetupPoint.address ? `<p>${meetupPoint.address}</p>` : ''}
            </div>
          `)
        )
        .addTo(map.current);

      markers.current['meetup'] = meetupMarker;
      bounds.extend([meetupPoint.longitude, meetupPoint.latitude]);
    }

    // Add member markers
    members.forEach((member) => {
      if (member.latitude && member.longitude) {
        const color = member.is_online
          ? member.is_sharing_location
            ? '#10B981'
            : '#F59E0B'
          : '#6B7280';

        const marker = new mapboxgl.Marker({ color })
          .setLngLat([member.longitude, member.latitude])
          .setPopup(
            new mapboxgl.Popup().setHTML(`
              <div class="text-black">
                <strong>${member.name}</strong>
                <p>Role: ${member.role}</p>
                <p>Status: ${member.is_online ? 'Online' : 'Offline'}</p>
                <p>Sharing: ${member.is_sharing_location ? 'Yes' : 'No'}</p>
              </div>
            `)
          )
          .addTo(map.current!);

        markers.current[member.id] = marker;
        bounds.extend([member.longitude, member.latitude]);

        // Calculate distance from meetup point
        if (meetupPoint) {
          const distance = calculateDistance(
            meetupPoint.latitude,
            meetupPoint.longitude,
            member.latitude,
            member.longitude
          );
          totalDistance += distance;
          validDistances++;
          if (distance > maxDistance) {
            maxDistance = distance;
          }
        }
      }
    });

    // Fit map to bounds
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 50 });
    }

    // Update stats
    setStats({
      total: members.length,
      online: members.filter((m) => m.is_online).length,
      sharing: members.filter((m) => m.is_sharing_location).length,
      avgDistance: validDistances > 0 ? totalDistance / validDistances : 0,
      farthest: maxDistance,
    });
  }, [members, meetupPoint]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">Leader Overview Map</h1>
          {userId && (
            <PushMeetupReminder
              groupId={groupId}
              userId={userId}
              meetupPoint={meetupPoint || undefined}
            />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="bg-gray-50 p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">Total Members</span>
          </div>
          <p className="text-2xl font-bold text-black mt-2">{stats.total}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">Online</span>
          </div>
          <p className="text-2xl font-bold text-black mt-2">{stats.online}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-gray-600">Sharing Location</span>
          </div>
          <p className="text-2xl font-bold text-black mt-2">{stats.sharing}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-600">Avg Distance</span>
          </div>
          <p className="text-2xl font-bold text-black mt-2">
            {stats.avgDistance.toFixed(1)} km
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-600" />
            <span className="text-sm text-gray-600">Farthest</span>
          </div>
          <p className="text-2xl font-bold text-black mt-2">
            {stats.farthest.toFixed(1)} km
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />
        
        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg">
          <h3 className="font-semibold text-black mb-2">Legend</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-600"></div>
              <span className="text-black">Meetup Point</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-black">Online & Sharing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500"></div>
              <span className="text-black">Online (Not Sharing)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-500"></div>
              <span className="text-black">Offline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

