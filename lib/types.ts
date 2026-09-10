export interface PokemonCard {
  id: string
  name: string
  image?: string
  set?: string | {
    name: string
    logo?: string
  }
}
