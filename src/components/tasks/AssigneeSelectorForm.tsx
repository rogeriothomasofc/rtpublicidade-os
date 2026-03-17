import { TeamMember } from '@/hooks/useTeamMembers';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface AssigneeSelectorFormProps {
  selectedIds: string[];
  teamMembers: TeamMember[];
  onChange: (memberIds: string[]) => void;
}

export function AssigneeSelectorForm({ 
  selectedIds, 
  teamMembers, 
  onChange 
}: AssigneeSelectorFormProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (memberId: string) => {
    if (selectedIds.includes(memberId)) {
      onChange(selectedIds.filter(id => id !== memberId));
    } else {
      onChange([...selectedIds, memberId]);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const selectedMembers = teamMembers.filter(m => selectedIds.includes(m.id));

  return (
    <div className="space-y-2">
      <Label>Responsável</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            role="combobox"
            className="w-full justify-between font-normal"
          >
            {selectedMembers.length > 0 ? (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="flex -space-x-1">
                  {selectedMembers.slice(0, 3).map((member) => (
                    <Avatar key={member.id} className="h-5 w-5 border border-background">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="truncate text-sm">
                  {selectedMembers.length === 1 
                    ? selectedMembers[0].name 
                    : `${selectedMembers.length} selecionados`}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Selecionar responsável
              </span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm">{member.name}</span>
                        {member.role && (
                          <span className="text-xs text-muted-foreground">{member.role}</span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
