import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  AlertTriangle, Bell, Building2, ChevronRight, Flame,
  Globe, Instagram, Kanban, MapPin, Phone, Star, Users, XCircle,
} from 'lucide-react';
import { type CrossedLead } from '@/hooks/useCrossedLeads';
import { STATUS_COLORS } from '@/hooks/useInstagramProspects';
import { GMB_STATUS_COLORS } from '@/hooks/useGmbLeads';

export function getFollowupStatus(followupAt: string | null | undefined): 'overdue' | 'today' | 'upcoming' | null {
  if (!followupAt) return null;
  const due = new Date(followupAt);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  if (due < todayStart) return 'overdue';
  if (due < todayEnd) return 'today';
  return 'upcoming';
}

export function formatFollowupDate(followupAt: string): string {
  const d = new Date(followupAt);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

interface LeadCardProps {
  lead: CrossedLead;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export function LeadCard({ lead, onClick, draggable, onDragStart }: LeadCardProps) {
  const ig = lead.instagram_prospect;
  const gmb = lead.gmb_lead;
  const isUnified = !!(ig && gmb);
  const issues = ig?.website_issues || gmb?.website_issues;
  const followupAt = ig?.followup_at || gmb?.followup_at;
  const followupStatus = getFollowupStatus(followupAt);

  return (
    <Card
      draggable={draggable}
      onDragStart={onDragStart}
      className={`border border-border/60 hover:border-primary/40 transition-colors ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          {/* Avatar + nome */}
          <div className="flex items-center gap-2 min-w-0">
            {isUnified ? (
              <div className="w-8 h-8 rounded-full flex-shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-orange-400 to-blue-500" />
                <Users className="absolute inset-0 w-4 h-4 m-auto text-white" />
              </div>
            ) : ig ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                <Instagram className="w-4 h-4 text-white" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{lead.lead_name}</p>
              {ig && <p className="text-xs text-muted-foreground truncate">@{ig.username}</p>}
              {!ig && gmb?.endereco && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />{gmb.endereco}
                </p>
              )}
            </div>
          </div>

          {/* Badges de status */}
          <div className="flex flex-col gap-1 items-end flex-shrink-0">
            {ig && (
              <Badge className={`${STATUS_COLORS[ig.status]} text-white text-xs px-1.5 py-0`}>
                {ig.status}
              </Badge>
            )}
            {gmb && (
              <Badge className={`${GMB_STATUS_COLORS[gmb.status]} text-white text-xs px-1.5 py-0`}>
                {gmb.status}
              </Badge>
            )}
          </div>
        </div>

        {/* Badges de fonte + heat score */}
        <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
          {ig && (
            <span className="flex items-center gap-1 bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-full px-2 py-0.5 font-medium">
              <Instagram className="w-3 h-3" /> Instagram
            </span>
          )}
          {gmb && (
            <span className="flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full px-2 py-0.5 font-medium">
              <MapPin className="w-3 h-3" /> Google Maps
            </span>
          )}
          {isUnified && (
            <span className="flex items-center gap-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full px-2 py-0.5 font-medium">
              <Flame className="w-3 h-3" /> {lead.heat_score}
            </span>
          )}
        </div>

        {/* Métricas */}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {ig?.followers_count && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />{ig.followers_count.toLocaleString('pt-BR')}
            </span>
          )}
          {gmb?.rating && (
            <span className="flex items-center gap-1 text-yellow-500">
              <Star className="w-3 h-3 fill-current" />{gmb.rating}
              {gmb.reviews && <span className="text-muted-foreground">({gmb.reviews.toLocaleString('pt-BR')})</span>}
            </span>
          )}
          {lead.phone && <span className="flex items-center gap-1 text-green-600"><Phone className="w-3 h-3" />WhatsApp</span>}
          {(ig?.pipeline_lead_id || gmb?.pipeline_lead_id) && (
            <span className="flex items-center gap-1 text-violet-600"><Kanban className="w-3 h-3" />Pipeline</span>
          )}
        </div>

        {/* Badges de diagnóstico */}
        {issues && (
          <div className="flex gap-1 flex-wrap mt-1">
            {(issues.critical?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs bg-red-500/15 text-red-600 dark:text-red-400 rounded-full px-2 py-0.5">
                <XCircle className="w-3 h-3" /> {issues.critical.length} crítico{issues.critical.length > 1 ? 's' : ''}
              </span>
            )}
            {(issues.warnings?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 rounded-full px-2 py-0.5">
                <AlertTriangle className="w-3 h-3" /> {issues.warnings.length} alerta{issues.warnings.length > 1 ? 's' : ''}
              </span>
            )}
            {issues.score !== undefined && (
              <span className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${issues.score >= 70 ? 'bg-green-500/15 text-green-600' : issues.score >= 40 ? 'bg-yellow-500/15 text-yellow-600' : 'bg-red-500/15 text-red-600'}`}>
                <Globe className="w-3 h-3" /> Site {issues.score}/100
              </span>
            )}
          </div>
        )}

        {/* Badge de follow-up */}
        {followupStatus && followupAt && (
          <div className={`flex items-center gap-1.5 mt-1 text-xs font-medium rounded-full px-2 py-0.5 w-fit ${
            followupStatus === 'overdue' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
            followupStatus === 'today'   ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' :
                                          'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          }`}>
            <Bell className="w-3 h-3" />
            {followupStatus === 'overdue' && `Follow-up vencido (${formatFollowupDate(followupAt)})`}
            {followupStatus === 'today'   && 'Follow-up hoje!'}
            {followupStatus === 'upcoming' && `Follow-up em ${formatFollowupDate(followupAt)}`}
          </div>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-3">
        <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1 text-muted-foreground pointer-events-none">
          <ChevronRight className="w-3 h-3" /> Ver detalhes
        </Button>
      </CardContent>
    </Card>
  );
}
