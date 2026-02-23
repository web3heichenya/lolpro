export type OpggStats = {
  win_rate?: number
  pick_rate?: number
  ban_rate?: number
  kda?: number
  tier?: number
  rank?: number
  tier_data?: {
    tier?: number
    rank?: number
  }
}

export type OpggAverageStats = {
  win_rate?: number
  pick_rate?: number
  ban_rate?: number
  kda?: number
  tier?: number
  rank?: number
  tier_data?: {
    tier?: number
    rank?: number
  }
  play?: number
  win?: number
  total_place?: number
  first_place?: number
  kills?: number
  assists?: number
  deaths?: number
}

export type OpggRune = {
  primary_page_id?: number
  secondary_page_id?: number
  primary_rune_ids?: number[]
  secondary_rune_ids?: number[]
  stat_mod_ids?: number[]
  pick_rate?: number
}

export type OpggSpell = {
  ids?: number[]
  pick_rate?: number
  play?: number
  win?: number
}

export type OpggSkillMastery = {
  ids?: string[]
  pick_rate?: number
  play?: number
  win?: number
}

export type OpggSkillOrder = {
  order?: Array<string | number>
  pick_rate?: number
  play?: number
  win?: number
}

export type OpggItemSet = {
  ids?: number[]
  pick_rate?: number
  play?: number
  win?: number
}

export type OpggCounter = {
  champion_id?: number
  play?: number
  win?: number
}

export type OpggPosition = {
  name?: string
  stats?: OpggStats
  runes?: OpggRune[]
  summoner_spells?: OpggSpell[]
  skill_masteries?: OpggSkillMastery[]
  skills?: OpggSkillOrder[]
  starter_items?: OpggItemSet[]
  core_items?: OpggItemSet[]
  boots?: OpggItemSet[]
  last_items?: OpggItemSet[]
  counters?: OpggCounter[]
}

export type OpggArenaAugment = {
  id?: number
  play?: number
  win?: number
  total_place?: number
  first_place?: number
  pick_rate?: number
}

export type OpggArenaAugmentGroup = {
  augments?: OpggArenaAugment[]
}

export type OpggSynergy = {
  champion_id?: number
  play?: number
  win?: number
  total_place?: number
  pick_rate?: number
}

export type OpggChampionData = {
  summary?: {
    average_stats?: OpggAverageStats
  }
  positions?: OpggPosition[]
  runes?: OpggRune[]
  summoner_spells?: OpggSpell[]
  skill_masteries?: OpggSkillMastery[]
  skills?: OpggSkillOrder[]
  starter_items?: OpggItemSet[]
  core_items?: OpggItemSet[]
  boots?: OpggItemSet[]
  last_items?: OpggItemSet[]
  prism_items?: OpggItemSet[]
  counters?: OpggCounter[]
  augment_group?: OpggArenaAugmentGroup[]
  synergies?: OpggSynergy[]
}

export type OpggChampionBuildResponse = {
  meta?: {
    version?: string
  }
  data?: OpggChampionData
}

export type OpggChampionMetaInfo = {
  attack?: number
  defense?: number
  magic?: number
  difficulty?: number
}

export type OpggChampionMetaSkill = {
  key?: string
  name?: string
  description?: string
  tooltip?: string
  image_url?: string
  video_url?: string
  max_rank?: number
  cooldown_burn_float?: number[]
  cost_burn?: number[]
  range_burn?: number[]
}

export type OpggChampionMetaPassive = {
  name?: string
  description?: string
  image_url?: string
  video_url?: string
}

export type OpggChampionMetaData = {
  id?: number
  key?: string
  name?: string
  title?: string
  image_url?: string
  blurb?: string
  lore?: string
  partype?: string
  tags?: string[]
  ally_tips?: string[]
  enemy_tips?: string[]
  info?: OpggChampionMetaInfo
  passive?: OpggChampionMetaPassive
  spells?: OpggChampionMetaSkill[]
}

export type OpggChampionMetaResponse = {
  data?: OpggChampionMetaData[]
}

export type CDragonAugment = {
  id: number
  nameTRA?: string
  augmentSmallIconPath?: string
  rarity?: string
}

export type DDragonItemData = {
  name?: string
  description?: string
  plaintext?: string
}

export type DDragonItemsResponse = {
  data?: Record<string, DDragonItemData>
}

export type DDragonSummonerData = {
  key?: string
  name?: string
  image?: {
    full?: string
  }
}

export type DDragonSummonersResponse = {
  data?: Record<string, DDragonSummonerData>
}

export type CachedValue<T> = {
  value: T
  expiresAt: number
}

export type ItemMeta = {
  name?: string
  description?: string
  iconUrl?: string
}

export type SummonerSpellMeta = {
  id: number
  name?: string
  iconUrl?: string
}

export type PerkMeta = {
  id: number
  name?: string
  iconUrl?: string
}

export type PerkStyleMeta = {
  id: number
  name?: string
  iconUrl?: string
}
