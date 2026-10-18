"use client";

import { QRCodeSVG } from "qrcode.react";

export function QrCode({ value, size = 120 }: { value: string; size?: number }) {
  return <QRCodeSVG value={value} size={size} level="M" includeMargin bgColor="#ffffff" fgColor="#0b2a5b" />;
}
