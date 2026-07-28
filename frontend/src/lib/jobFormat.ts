export function formatExperience(min?: number, max?: number): string {
  if (min != null && max != null) return `${min}-${max} Yrs`;
  if (min != null) return `${min}+ Yrs`;
  if (max != null) return `0-${max} Yrs`;
  return 'Fresher';
}

export function formatSalary(min?: number, max?: number, visible?: boolean): string {
  if (!visible || (min == null && max == null)) return 'Not disclosed';
  const fmt = (n: number) => {
    if (n >= 100000) return `₹ ${(n / 100000).toFixed(1)}L`;
    return `₹ ${n.toLocaleString('en-IN')}`;
  };
  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  if (max != null) return `Up to ${fmt(max)}`;
  return 'Not disclosed';
}

export function formatPostedAgo(dateStr?: string): string {
  if (!dateStr) return 'Recently posted';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Posted today';
  if (days === 1) return '1 Day Ago';
  if (days < 30) return `${days} Days Ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 Month Ago' : `${months} Months Ago`;
}

export function formatEmploymentType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function companyInitials(name?: string): string {
  if (!name) return 'CO';
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}
