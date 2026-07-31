import { mediaUrl, initials } from '@/lib/media';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<AvatarSize, string> = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: AvatarSize;
  className?: string;
}

export default function UserAvatar({ name, avatarUrl, size = 'md', className = '' }: UserAvatarProps) {
  const src = mediaUrl(avatarUrl);
  const ring = size === 'xl' ? 'ring-4 ring-white shadow-md' : 'ring-2 ring-white/80';

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${SIZE[size]} rounded-full object-cover ${ring} ${className}`}
      />
    );
  }

  return (
    <span
      className={`${SIZE[size]} rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-white flex items-center justify-center font-semibold shrink-0 ${ring} ${className}`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
