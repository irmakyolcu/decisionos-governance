import { Search, Bell, User } from 'lucide-react';
import { currentUser } from '@/data/mockData';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

export function TopBar() {
  const [search, setSearch] = useState('');

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search internal decisions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
        </button>

        <Badge variant="outline" className="text-xs font-medium bg-accent text-accent-foreground border-primary/20">
          {currentUser.role}
        </Badge>

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground hidden lg:block">{currentUser.name}</span>
        </div>
      </div>
    </header>
  );
}
