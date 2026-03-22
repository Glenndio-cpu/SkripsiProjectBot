import React, { useState, useEffect } from 'react';
import { Info, AlertTriangle, CheckCircle, Bell, X, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  createdAt: string;
}

const typeConfig = {
  info: {
    bg: 'bg-sky-50 border-sky-200',
    text: 'text-sky-800',
    subtext: 'text-sky-600',
    icon: Info,
    iconColor: 'text-sky-500',
    dot: 'bg-sky-500',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    subtext: 'text-amber-600',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    dot: 'bg-amber-500',
  },
  success: {
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-800',
    subtext: 'text-emerald-600',
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
    dot: 'bg-emerald-500',
  },
  urgent: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    subtext: 'text-red-600',
    icon: Bell,
    iconColor: 'text-red-500',
    dot: 'bg-red-500',
  },
};

const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [current, setCurrent] = useState(0);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    api.getPublicAnnouncements()
      .then((data: any) => {
        if (data.announcements?.length) {
          setAnnouncements(data.announcements);
        }
      })
      .catch(() => { /* silent */ });
  }, []);

  // Auto-rotate every 8 seconds when multiple announcements
  useEffect(() => {
    const visible = announcements.filter(a => !dismissed.has(a.id));
    if (visible.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % visible.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [announcements, dismissed]);

  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const safeIndex = current >= visible.length ? 0 : current;
  const ann = visible[safeIndex];
  const cfg = typeConfig[ann.type] || typeConfig.info;
  const Icon = cfg.icon;

  const handleDismiss = (id: number) => {
    setDismissed(prev => new Set(prev).add(id));
    setCurrent(0);
  };

  const goPrev = () => setCurrent(prev => (prev - 1 + visible.length) % visible.length);
  const goNext = () => setCurrent(prev => (prev + 1) % visible.length);

  return (
    <div className={`border-b ${cfg.bg} relative`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${cfg.text}`}>{ann.title}</p>
            <p className={`text-sm ${cfg.subtext} mt-0.5 leading-relaxed`}>{ann.content}</p>
          </div>

          {/* Navigation + Dismiss */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {visible.length > 1 && (
              <>
                <button onClick={goPrev} className={`p-1 rounded hover:bg-white/50 ${cfg.subtext}`} aria-label="Sebelumnya">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className={`text-xs font-medium ${cfg.subtext} tabular-nums`}>
                  {safeIndex + 1}/{visible.length}
                </span>
                <button onClick={goNext} className={`p-1 rounded hover:bg-white/50 ${cfg.subtext}`} aria-label="Berikutnya">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={() => handleDismiss(ann.id)}
              className={`p-1 rounded hover:bg-white/50 ${cfg.subtext} ml-1`}
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dots indicator */}
        {visible.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {visible.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === safeIndex ? `${cfg.dot} w-4` : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementBanner;
