export interface PokemonCard {
  id: string
  name: string
  image?: string
  set?: {
    name: string
    logo?: string
  }
}

export interface GameState {
  allCards: PokemonCard[]
  hand: PokemonCard[]
  prizes: PokemonCard[]
  deck: PokemonCard[]
  currentCardIndex: number
  timeRemaining: number
  phase: "import" | "playing" | "results"
  selectedCards: Set<string>
  score?: number
}
