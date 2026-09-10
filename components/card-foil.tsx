/** Decorative foil uses the user's supplied Star Particles ex brush. */
export function CardFoil({name}: {name: string}) {
  if (!/\bex\b/i.test(name)) return null
  return <span className="holo-overlay" aria-hidden="true" data-card-foil="ex" />
}
