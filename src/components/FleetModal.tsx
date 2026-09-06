import React, { useState, useEffect } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  X,
  QrCode,
  Trash2,
  Edit2,
  Check,
  Camera,
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

  const getDeviceIcon = (type: DeviceType) => {
    if (type === 'mobile') return <Smartphone className="w-4 h-4 text-accent" />;
    if (type === 'tablet') return <Tablet className="w-4 h-4 text-purple-400" />;
    return <Laptop className="w-4 h-4 text-primary" />;
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-2xl p-6 shadow-xl overflow-hidden max-h-[90vh] flex flex-col space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h2 className="text-base font-semibold text-text-main">Connected Devices</h2>
            <p className="text-xs text-text-muted mt-0.5">Manage sessions across your computers, tablets, and phones</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-faint hover:text-text-main hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Minimal Tab Switcher */}
        <div className="flex p-1 rounded-xl bg-surface-elevated border border-border">
          <button
            onClick={() => setActiveTab('devices')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'devices' ? 'bg-surface text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            Devices ({devices.length})
          </button>
          <button
            onClick={() => setActiveTab('qr_generate')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'qr_generate' ? 'bg-surface text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Pair via QR</span>
          </button>
          <button
            onClick={() => setActiveTab('qr_scan')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'qr_scan' ? 'bg-surface text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan QR</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
          {activeTab === 'devices' && (
            <div className="rounded-xl border border-border bg-surface-elevated/40 divide-y divide-border/60 overflow-hidden">
              {devices.map((dev) => {
                const isCurrent = dev.device_token === currentDeviceToken || dev.is_current;
                return (
                  <div key={dev.id} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-surface-elevated transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                        {getDeviceIcon(dev.device_type)}
                      </div>

                      <div className="min-w-0 flex-1">
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
                              <span className="font-semibold text-text-main text-break-word">
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
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                              This Device
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-text-faint flex items-center gap-1.5 mt-0.5">
                          <span className="capitalize">{dev.os}</span>
                          <span>•</span>
                          <span>{dev.browser}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Online
                          </span>
                        </p>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => revokeDevice(dev.id)}
                        className="text-xs text-text-faint hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'qr_generate' && (
            <div className="p-6 rounded-xl bg-surface-elevated/50 border border-border text-center space-y-4">
              <div>
                <p className="text-xs font-semibold text-text-main">Scan with your logged-in mobile or tablet</p>
                <p className="text-[11px] text-text-muted mt-0.5">Authorize this computer without retyping passwords.</p>
              </div>

              <div className="inline-block p-3 rounded-xl bg-white shadow-sm">
                <QRCodeSVG value={qrToken} size={180} level="H" includeMargin />
              </div>
            </div>
          )}

          {activeTab === 'qr_scan' && (
            <div className="p-8 rounded-xl bg-surface-elevated/50 border border-border text-center space-y-3">
              <Camera className="w-10 h-10 text-text-muted mx-auto" />
              <p className="text-xs font-semibold text-text-main">Camera Scanner</p>
              <p className="text-[11px] text-text-muted max-w-xs mx-auto">
                Scan the pairing QR code on another screen to instantly link devices.
              </p>
              <button
                onClick={() => alert('Camera scanner enabled')}
                className="px-4 py-2 rounded-xl bg-primary text-primary-text text-xs font-semibold shadow-sm"
              >
                Start Camera
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-border/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-xs font-medium text-text-main transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
