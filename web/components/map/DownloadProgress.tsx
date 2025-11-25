// components/map/DownloadProgress.tsx

'use client';

import { DownloadProgress as DownloadProgressType } from '@/types/offline';
import { Download, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface DownloadProgressProps {
  progress: DownloadProgressType;
  onClose: () => void;
}

export function DownloadProgress({ progress, onClose }: DownloadProgressProps) {
  const { status, percentage, downloadedTiles, totalTiles, error } = progress;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-4 z-50 w-80">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {status === 'preparing' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
          {status === 'downloading' && <Download className="w-5 h-5 text-blue-500" />}
          {status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
          {status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
          
          <span className="font-semibold text-black">
            {status === 'preparing' && 'Preparing Download...'}
            {status === 'downloading' && 'Downloading'}
            {status === 'completed' && 'Download Complete'}
            {status === 'failed' && 'Download Failed'}
          </span>
        </div>

        {(status === 'completed' || status === 'failed') && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* 進度條 */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              status === 'failed' ? 'bg-red-500' : 
              status === 'completed' ? 'bg-green-500' : 
              'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* 詳細資訊 */}
      <div className="text-sm text-black space-y-1">
        {status === 'downloading' && (
          <>
            <p>{percentage}% Complete</p>
            <p>Downloaded {downloadedTiles} / {totalTiles} tiles</p>
          </>
        )}

        {status === 'completed' && (
          <p className="text-green-600 font-medium">
            ✓ Successfully downloaded {totalTiles} tiles
          </p>
        )}

        {status === 'failed' && error && (
          <p className="text-red-600">
            Error: {error}
          </p>
        )}
      </div>
    </div>
  );
}

