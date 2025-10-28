'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import CodeInput from '@/components/CodeInput';
import QRScanner from '@/components/QRScanner';

function JoinGroupContent() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode) {
      handleJoin(urlCode);
    }
  }, []);

  const generateDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  };

  const handleJoin = async (inviteCode: string) => {
    if (!inviteCode || inviteCode.length !== 6) {
      setError('Please enter a 6-digit invite code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const deviceId = generateDeviceId();
      const deviceName = navigator.userAgent.substring(0, 50);
      
      const { data, error: functionError } = await supabase.functions.invoke('join-group', {
        body: { 
          inviteCode: inviteCode.toUpperCase(), 
          deviceId, 
          deviceName 
        },
      });
      
      if (functionError) throw functionError;
      
      // 直接替換當前頁面
      window.location.replace(`/groups/${data.group.id}`);
      
    } catch (err: any) {
      setError(err.message || 'Failed to join group');
      setLoading(false);
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    try {
      const url = new URL(decodedText);
      const scannedCode = url.searchParams.get('code');
      if (scannedCode) {
        handleJoin(scannedCode);
      }
    } catch {
      setError('Invalid QR Code');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="text-7xl mb-4 animate-pulse">⏳</div>
          <h2 className="text-2xl font-bold text-black">Joining Group...</h2>
          <p className="text-gray-600 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-black">Join Group</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-black">Method 1: Enter Code</h2>
        <CodeInput value={code} onChange={setCode} onSubmit={() => handleJoin(code)} disabled={loading} />
        {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>}
        <button 
          onClick={() => handleJoin(code)} 
          disabled={loading || code.length !== 6} 
          className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
        >
          Join Group
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-black">Method 2: Scan QR Code</h2>
        {!showScanner ? (
          <button 
            onClick={() => setShowScanner(true)} 
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
          >
            Open Camera Scanner
          </button>
        ) : (
          <div>
            <QRScanner onScanSuccess={handleScanSuccess} />
            <button 
              onClick={() => setShowScanner(false)} 
              className="w-full mt-4 bg-gray-600 text-white py-3 rounded-lg font-semibold"
            >
              Close Scanner
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JoinGroupPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <JoinGroupContent />
    </Suspense>
  );
}
