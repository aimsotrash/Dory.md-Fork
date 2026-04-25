export function retentionToColor(retention: number): string {
  if (retention >= 0.7) return '#7c3aed';
  if (retention >= 0.5) return '#0891b2';
  if (retention >= 0.3) return '#f97316';
  return '#dc2626';
}

export function retentionToGlow(retention: number): string {
  if (retention >= 0.7) return 'rgba(124, 58, 237, 0.4)';
  if (retention >= 0.5) return 'rgba(8, 145, 178, 0.4)';
  if (retention >= 0.3) return 'rgba(249, 115, 22, 0.4)';
  return 'rgba(220, 38, 38, 0.4)';
}

export function retentionToLabel(retention: number): string {
  if (retention >= 0.7) return 'Strong';
  if (retention >= 0.5) return 'Fading';
  if (retention >= 0.3) return 'Weak';
  return 'Critical';
}

export const categoryColors: Record<string, string> = {
  technical: '#7c3aed',
  personal: '#0891b2',
  reference: '#f97316',
  general: '#64748b',
};

export const urgencyColors: Record<string, string> = {
  low: '#22d3ee',
  medium: '#fb923c',
  high: '#f87171',
};

export const urgencyBg: Record<string, string> = {
  low: 'rgba(34, 211, 238, 0.1)',
  medium: 'rgba(251, 146, 60, 0.1)',
  high: 'rgba(248, 113, 113, 0.15)',
};
