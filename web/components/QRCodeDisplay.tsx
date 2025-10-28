'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export default function QRCodeDisplay({ value, size = 200 }: QRCodeDisplayProps) {
  return (
    <div className="flex justify-center p-4 bg-white rounded-lg">
      <QRCodeSVG 
        value={value} 
        size={size}
        level="H"
        includeMargin={true}
      />
    </div>
  );
}
