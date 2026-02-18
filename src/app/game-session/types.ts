export type TeamPlayerRow = {
  key: string
  puuid?: string
  championId?: string
  summonerName: string
  assignedPosition?: string
  pickState: 'hover' | 'locked' | 'pending'
  isSelf?: boolean
}
