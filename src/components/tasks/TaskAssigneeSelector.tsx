import { Task } from '@/types/database';
import { TeamMember } from '@/hooks/useTeamMembers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TaskAssigneeSelectorProps {
  taskId: string;
  assignees: { id: string; name: string; avatar_url?: string | null }[];
  teamMembers: TeamMember[];
  onAssigneesChange: (taskId: string, memberIds: string[]) => Promise<void>;
  compact?: boolean;
}

export function TaskAssigneeSelector({ 
  taskId, 
  assignees, 
  teamMembers, 
  onAssigneesChange,
  compact = false 
}: TaskAssigneeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(assignees.map(a => a.id));

  const handleToggle = (memberId: string) => {
    setSelectedIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onAssigneesChange(taskId, selectedIds);
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (compact) {
    return (
      <Popover open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          setSelectedIds(assignees.map(a => a.id));
        }
      }}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
            {assignees.length > 0 ? (
              <div className="flex -space-x-1">
                {assignees.slice(0, 3).map((a) => (
                  <Avatar key={a.id} className="h-5 w-5 border border-background">
                    <AvatarImage src={a.avatar_url || undefined} alt={a.name} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {getInitials(a.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {assignees.length > 3 && (
                  <span className="text-xs text-muted-foreground ml-1">+{assignees.length - 3}</span>
                )}
              </div>
            ) : (
              <Users className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0 z-50" align="start">
          <Command>
            <CommandInput placeholder="Buscar membro..." />
            <CommandList>
              <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
              <CommandGroup>
                {teamMembers.map((member) => (
                  <CommandItem
                    key={member.id}
                    onSelect={() => handleToggle(member.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Checkbox 
                        checked={selectedIds.includes(member.id)}
                        className="pointer-events-none"
                      />
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar_url || undefined} alt={member.name} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{member.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="p-2 border-t">
            <Button 
              size="sm" 
              className="w-full" 
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {assignees.map((a) => (
          <Badge key={a.id} variant="secondary" className="gap-1">
            <Avatar className="h-4 w-4">
              <AvatarImage src={a.avatar_url || undefined} alt={a.name} />
              <AvatarFallback className="text-[8px] bg-primary/20">
                {getInitials(a.name)}
              </AvatarFallback>
            </Avatar>
            {a.name}
          </Badge>
        ))}
        {assignees.length === 0 && (
          <span className="text-sm text-muted-foreground">Sem responsável</span>
        )}
      </div>
    </div>
  );
}
