import type { BuildResult, ChampionProfile, ChampionSummary } from '@/app/types'
import { fallbackChar } from '@/app/main/utils'
import { useI18n } from '@/app/i18n'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type Props = {
  champion: ChampionSummary | null
  profile: ChampionProfile | null
  build: BuildResult | null
}

function tierFlagTone(tier: number): string {
  if (tier <= 1) return 'bg-amber-500 text-amber-950'
  if (tier === 2) return 'bg-slate-300 text-slate-900'
  if (tier === 3) return 'bg-orange-600 text-orange-50'
  return 'bg-slate-600 text-slate-50'
}

export function HeroBannerProfile({ champion, profile, build }: Props) {
  const { t } = useI18n()
  const skills = [profile?.passive, ...(profile?.spells ?? [])].filter(
    (s): s is NonNullable<typeof s> & { iconUrl: string } => !!s?.iconUrl,
  )

  return (
    <div className="flex min-w-0 flex-1 items-start gap-4">
      <div className="relative shrink-0">
        <Avatar className="size-24 border border-border/50 bg-background/40 shadow-sm">
          <AvatarImage
            src={profile?.imageUrl || champion?.iconUrl}
            alt={champion?.name ?? ''}
            className="object-cover"
            loading="lazy"
          />
          <AvatarFallback className="text-3xl font-semibold text-muted-foreground">
            {fallbackChar(champion?.name ?? '')}
          </AvatarFallback>
        </Avatar>
        {build?.summary?.tier != null ? (
          <span
            className={`pointer-events-none absolute bottom-0 right-0 inline-flex h-6 w-5 items-start justify-center pt-0.5 text-[10px] font-bold shadow-sm [clip-path:polygon(0_0,100%_0,100%_74%,50%_100%,0_74%)] ${tierFlagTone(Math.max(1, Math.round(build.summary.tier)))}`}
          >
            {Math.max(1, Math.round(build.summary.tier))}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <div className="truncate font-display text-4xl font-semibold tracking-tight">{champion?.name}</div>
          <div className="truncate text-xl text-muted-foreground">
            {profile?.title || t('hero.defaultTitle')}
          </div>
        </div>

        <div className="line-clamp-2 max-w-3xl text-sm text-muted-foreground">
          {profile?.blurb ||
            t('hero.defaultBlurb', { name: champion?.name ?? t('header.selectedChampionFallback') })}
        </div>

        {skills.length ? (
          <div className="flex flex-wrap items-center gap-1">
            {skills.slice(0, 5).map((skill, idx) => (
              <Tooltip key={`${skill.key}-${idx}`}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="relative size-9 overflow-hidden rounded-lg border border-border/60 bg-background/50"
                  >
                    <img
                      src={skill.iconUrl}
                      alt={skill.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="space-y-1 rounded-md border-border/60 bg-popover">
                  <div className="text-sm font-semibold">
                    {skill.key} {skill.name}
                  </div>
                  <div className="max-w-[360px] whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {skill.description || skill.tooltip || t('hero.noDescription')}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
