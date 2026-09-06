import React, { useState, useEffect } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  X,
  Shield,
  QrCode,
  CheckCircle2,
  Trash2,
  Edit2,
  Check,
  RefreshCw,
  Camera,
  AlertCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { DeviceOS, DeviceType } from '../types';

interface FleetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FleetModal: React.FC<FleetModalProps> = ({ isOpen, onClose }) => {
  const { devices, revokeDevice, renameDevice, currentDeviceToken, refreshDevices } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeTab, setActiveTab] = useState<'devices' | 'qr_generate' | 'qr_scan'>('devices');
  const [qrToken, setQrToken] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setQrToken('unimap_sync_' + crypto.randomUUID());
      refreshDevices();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getDeviceIcon = (type: DeviceType, os: DeviceOS) => {
    if (type === 'mobile') return <Smartphone className="w-5 h-5 text-accent" />;
    if (type === 'tablet') return <Tablet className="w-5 h-5 text-purple-400" />;
    return <Laptop className="w-5 h-5 text-primary" />;
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSaveEdit = async (id: string) => {
    if (editingName.trim()) {
      await renameDevice(id, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-surface border border-border rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-main flex items-center gap-2">
                Device Fleet & Sync Hub
              </h2>
              <p className="text-xs text-text-muted">
                Manage all your tablets, phones, Windows & Linux computers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 mt-4 p-1 rounded-xl bg-surface-elevated border border-border">
          <button
            onClick={() => setActiveTab('devices')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'devices'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            Connected Devices ({devices.length})
          </button>
          <button
            onClick={() => setActiveTab('qr_generate')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'qr_generate'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Quick Login QR
          </button>
          <button
            onClick={() => setActiveTab('qr_scan')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'qr_scan'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Scan QR
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto py-4 flex-1 space-y-3">
          {activeTab === 'devices' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-text-muted px-1">
                <span>Devices logged in with real-time bidirectional sync</span>
                <button
                  onClick={refreshDevices}
                  className="flex items-center gap-1 text-accent hover:underline"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              <div className="divide-y divide-border/40 rounded-2xl border border-border bg-surface-elevated overflow-hidden">
                {devices.map((dev) => {
                  const isCurrent = dev.device_token === currentDeviceToken || dev.is_current;
                  return (
                    <div
                      key={dev.id}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-surface transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
                          {getDeviceIcon(dev.device_type, dev.os)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {editingId === dev.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  className="bg-surface border border-primary text-text-main text-xs px-2 py-0.5 rounded focus:outline-none"
                                />
                                <button
                                  onClick={() => handleSaveEdit(dev.id)}
                                  className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="font-semibold text-sm text-text-main truncate">
                                  {dev.device_name}
                                </span>
                                <button
                                  onClick={() => handleStartEdit(dev.id, dev.device_name)}
                                  className="text-text-faint hover:text-text-muted p-0.5"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </>
                            )}

                            {isCurrent && (
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-bold">
                                This Device
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                            <span className="capitalize">{dev.os}</span>
                            <span>•</span>
                            <span>{dev.browser}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active Now
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!isCurrent && (
                          <button
                            onClick={() => revokeDevice(dev.id)}
                            title="Remotely revoke and sign out this device"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Revoke</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'qr_generate' && (
            <div className="p-6 rounded-2xl bg-surface-elevated border border-border text-center space-y-4">
              <div>
                <h3 className="text-sm font-bold text-text-main">
                  Scan to Login Instantaneous Sync
                </h3>
                <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
                  Point your logged-in phone or tablet camera at this code to authorize this device without typing your password.
                </p>
              </div>

              {/* QR Code Container */}
              <div className="inline-block p-4 rounded-2xl bg-white shadow-2xl">
                <QRCodeSVG
                  value={qrToken}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-text-muted font-mono bg-surface p-2 rounded-xl border border-border max-w-xs mx-auto">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Pairing Nonce: {qrToken.slice(0, 16)}...</span>
              </div>
            </div>
          )}

          {activeTab === 'qr_scan' && (
            <div className="p-6 rounded-2xl bg-surface-elevated border border-border text-center space-y-4">
              <Camera className="w-12 h-12 text-accent mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-text-main">Camera Scanner Ready</h3>
                <p className="text-xs text-text-muted max-w-sm mx-auto mt-1">
                  Use this device's camera to scan the QR code displayed on your new Windows or Linux machine to approve its instant session.
                </p>
              </div>
              <button
                onClick={() => alert('Camera scanner enabled! Point towards the QR code to pair.')}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-semibold shadow-glow-sm transition-all"
              >
                Launch Device Camera
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface-elevated border border-border text-xs font-semibold text-text-main hover:bg-surface-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
