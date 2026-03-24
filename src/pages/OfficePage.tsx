import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTeamMembers, TeamMember } from '@/hooks/useTeamMembers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

// ── Room definitions ──────────────────────────────────────────────────────────
interface Room {
  id: string;
  label: string;
  x: number; // % from left
  y: number; // % from top
  w: number; // % width
  h: number; // % height
  color: string;
  border: string;
  roles: string[]; // roles that "live" here
  emoji: string;
}

const ROOMS: Room[] = [
  {
    id: 'reception',
    label: 'Recepção',
    x: 2, y: 2, w: 22, h: 36,
    color: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-300 dark:border-amber-700',
    roles: ['CEO', 'Diretor', 'Gerente'],
    emoji: '🪴',
  },
  {
    id: 'meeting',
    label: 'Sala de Reunião',
    x: 26, y: 2, w: 46, h: 36,
    color: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-300 dark:border-blue-700',
    roles: [],
    emoji: '📋',
  },
  {
    id: 'design',
    label: 'Design',
    x: 74, y: 2, w: 24, h: 36,
    color: 'bg-purple-50 dark:bg-purple-950/20',
    border: 'border-purple-300 dark:border-purple-700',
    roles: ['Designer', 'Design', 'UX', 'UI', 'Criação'],
    emoji: '🎨',
  },
  {
    id: 'content',
    label: 'Conteúdo',
    x: 2, y: 42, w: 30, h: 36,
    color: 'bg-pink-50 dark:bg-pink-950/20',
    border: 'border-pink-300 dark:border-pink-700',
    roles: ['Redator', 'Copywriter', 'Social Media', 'Conteúdo'],
    emoji: '✏️',
  },
  {
    id: 'traffic',
    label: 'Tráfego',
    x: 34, y: 42, w: 30, h: 36,
    color: 'bg-green-50 dark:bg-green-950/20',
    border: 'border-green-300 dark:border-green-700',
    roles: ['Gestor de Tráfego', 'Tráfego', 'Mídia', 'ADS'],
    emoji: '📈',
  },
  {
    id: 'dev',
    label: 'Tecnologia',
    x: 66, y: 42, w: 32, h: 36,
    color: 'bg-cyan-50 dark:bg-cyan-950/20',
    border: 'border-cyan-300 dark:border-cyan-700',
    roles: ['Dev', 'Desenvolvedor', 'Programador', 'Tech'],
    emoji: '💻',
  },
];

// ── Avatar helpers ────────────────────────────────────────────────────────────
function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = [
  'bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-lime-400',
  'bg-emerald-400', 'bg-teal-400', 'bg-sky-400', 'bg-indigo-400',
  'bg-violet-400', 'bg-pink-400',
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function assignRoom(member: TeamMember): string {
  const role = (member.role ?? '').toLowerCase();
  for (const room of ROOMS) {
    if (room.roles.some(r => role.includes(r.toLowerCase()))) return room.id;
  }
  // Fallback: distribute by name hash across non-reception rooms
  const fallbacks = ['content', 'traffic', 'design', 'dev'];
  let h = 0;
  for (let i = 0; i < member.name.length; i++) h = (h * 31 + member.name.charCodeAt(i)) & 0xffffff;
  return fallbacks[Math.abs(h) % fallbacks.length];
}

// ── Avatar component ──────────────────────────────────────────────────────────
interface AvatarProps {
  member: TeamMember;
  onClick: (m: TeamMember) => void;
  index: number;
}

function MemberAvatar({ member, onClick, index }: AvatarProps) {
  // Spread avatars inside their room using a simple spiral pattern
  const col = index % 3;
  const row = Math.floor(index / 3);
  const offsetX = 12 + col * 28; // % inside room
  const offsetY = 18 + row * 35; // % inside room

  return (
    <button
      onClick={() => onClick(member)}
      className="absolute flex flex-col items-center gap-0.5 group"
      style={{ left: `${offsetX}%`, top: `${offsetY}%` }}
      title={member.name}
    >
      {/* Avatar circle */}
      <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md border-2 border-white dark:border-gray-800 transition-transform group-hover:scale-110 group-hover:shadow-lg ${avatarColor(member.name)}`}>
        {member.avatar_url ? (
          <img src={member.avatar_url} alt={member.name} className="w-full h-full rounded-full object-cover" />
        ) : (
          initials(member.name)
        )}
        {/* Online dot */}
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border border-white dark:border-gray-800" />
      </div>
      {/* Name tag */}
      <span className="text-[9px] font-medium text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-black/60 rounded px-1 leading-tight max-w-[60px] text-center truncate shadow-sm">
        {member.name.split(' ')[0]}
      </span>
    </button>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function MemberPanel({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  return (
    <Card className="w-72 shadow-xl border-2 animate-in slide-in-from-right-4 duration-200">
      <CardHeader className="pb-3 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow ${avatarColor(member.name)}`}>
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={member.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              initials(member.name)
            )}
          </div>
          <div>
            <CardTitle className="text-base">{member.name}</CardTitle>
            {member.role && (
              <Badge variant="secondary" className="mt-1 text-xs">{member.role}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {member.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-xs">✉️</span>
            <span className="truncate">{member.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs">🟢</span>
          <span>Online agora</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OfficePage() {
  const { data: members = [], isLoading } = useTeamMembers();
  const [selected, setSelected] = useState<TeamMember | null>(null);

  // Group members by room
  const membersByRoom: Record<string, TeamMember[]> = {};
  for (const m of members) {
    const roomId = assignRoom(m);
    (membersByRoom[roomId] ??= []).push(m);
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-semibold">Escritório Virtual</h1>
            <p className="text-sm text-muted-foreground">
              {members.length} {members.length === 1 ? 'pessoa' : 'pessoas'} na agência
            </p>
          </div>
          <Badge variant="secondary" className="gap-1.5 bg-green-500/15 text-green-700 dark:text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Ao vivo
          </Badge>
        </div>

        {/* Office floor + detail panel */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Floor plan */}
          <div className="flex-1 relative bg-gray-100 dark:bg-gray-900 rounded-xl border overflow-hidden">
            {/* Floor texture */}
            <div className="absolute inset-0 opacity-20 dark:opacity-10"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,#94a3b8 39px,#94a3b8 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,#94a3b8 39px,#94a3b8 40px)' }}
            />

            {/* Loading */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}

            {/* Rooms */}
            {ROOMS.map(room => {
              const roomMembers = membersByRoom[room.id] ?? [];
              return (
                <div
                  key={room.id}
                  className={`absolute border-2 rounded-xl ${room.color} ${room.border} overflow-hidden`}
                  style={{ left: `${room.x}%`, top: `${room.y}%`, width: `${room.w}%`, height: `${room.h}%` }}
                >
                  {/* Room label */}
                  <div className="absolute top-1.5 left-2 flex items-center gap-1 pointer-events-none">
                    <span className="text-sm">{room.emoji}</span>
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      {room.label}
                    </span>
                  </div>

                  {/* Avatars */}
                  {roomMembers.map((m, i) => (
                    <MemberAvatar
                      key={m.id}
                      member={m}
                      index={i}
                      onClick={setSelected}
                    />
                  ))}

                  {/* Empty room hint */}
                  {roomMembers.length === 0 && (
                    <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
                      <span className="text-[10px] text-gray-400 dark:text-gray-600">vazio</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Corridor label */}
            <div className="absolute text-[9px] text-gray-400 dark:text-gray-600 uppercase tracking-widest font-medium pointer-events-none"
              style={{ left: '26%', top: '40%' }}>
              Corredor
            </div>
          </div>

          {/* Side panel */}
          {selected && (
            <div className="shrink-0">
              <MemberPanel member={selected} onClose={() => setSelected(null)} />
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
