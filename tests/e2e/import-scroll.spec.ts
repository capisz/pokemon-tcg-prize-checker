import { test, expect } from '@playwright/test'
import { FEATURED_DECKS } from '../../lib/featured-decks'

for (const method of ['paste', 'featured'] as const) {
  test(`successful ${method} import reveals Start Game on mobile`, async ({page}, info) => {
    test.skip(info.project.name !== 'mobile', 'Mobile guidance')
    await page.emulateMedia({reducedMotion:'reduce'})
    await page.addInitScript(() => localStorage.setItem('pcd_has_seen_help','true'))
    await page.goto('/')
    if (method === 'paste') {
      await page.getByRole('textbox',{name:'Deck list',exact:true}).fill(FEATURED_DECKS[0].importText)
      await page.getByRole('button',{name:'Import Deck',exact:true}).click()
    } else {
      await page.getByRole('button',{name:'Use this deck',exact:true}).click()
    }
    await expect(page.getByText('Deck ready',{exact:true})).toBeVisible()
    const start=page.getByRole('button',{name:'Start Game',exact:true})
    await expect.poll(()=>start.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0 && r.bottom<=window.innerHeight})).toBe(true)
  })
}
