import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportanceStarsProps {
  importance: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const importanceConfig = {
  1: { color: 'text-muted-foreground', label: '低' },
  2: { color: 'text-primary', label: '较低' },
  3: { color: 'text-chart-2', label: '中等' },
  4: { color: 'text-chart-4', label: '较高' },
  5: { color: 'text-destructive', label: '高' }
};

const sizeConfig = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
};

export default function ImportanceStars({ 
  importance, 
  size = 'md',
  showLabel = false 
}: ImportanceStarsProps) {
  const config = importanceConfig[importance as keyof typeof importanceConfig] || importanceConfig[3];
  const sizeClass = sizeConfig[size];

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: importance }).map((_, index) => (
        <Star 
          key={index} 
          className={cn(sizeClass, config.color, 'fill-current')} 
        />
      ))}
      {showLabel && (
        <span className={cn('text-sm ml-1', config.color)}>
          {config.label}
        </span>
      )}
    </div>
  );
}
