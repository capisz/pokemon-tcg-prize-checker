import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { FEATURED_DECKS } from '../../lib/featured-decks'

async function openApp(page: Page) {
  await page.addInitScript(() => localStorage.setItem('pcd_has_seen_help', 'true'))
  // Third-party images/advertising are not required to verify the game rules.
  await page.route('https://**/*', route => route.abort())
  await page.goto('/')
  await page.getByRole('button', { name: 'Decline', exact: true }).click()
}
async function importDeck(page: Page) {
  await page.getByRole('textbox', { name: 'Deck list' }).fill(FEATURED_DECKS[0].importText)
  await page.getByRole('button', { name: 'Import Deck', exact: true }).click()
  await expect(page.getByText('Deck ready', { exact: true })).toBeVisible()
}
async function startGame(page: Page) {
  await importDeck(page)
  await page.getByRole('button', { name: 'Start Game', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Guess Prizes', exact: true })).toBeVisible()
}

test('invalid replacement text invalidates the playable deck', async ({page}) => {
  await openApp(page)
  await importDeck(page)
  await page.getByRole('button',{name:'Edit full list'}).click()
  await page.getByRole('textbox', {name:'Deck list'}).fill('invalid deck')
  await expect(page.getByRole('button',{name:'Start Game',exact:true})).toHaveAttribute('aria-disabled','true')
  await page.getByRole('button',{name:'Import Deck',exact:true}).click()
  await expect(page.locator('#deck-import-error')).toBeVisible()
  await expect(page.getByRole('button',{name:'Guess Prizes',exact:true})).toHaveCount(0)
})

test('restart gives a fresh inspection timer after countdown', async ({page}) => {
  await openApp(page)
  await startGame(page)
  await page.getByRole('button',{name:'Restart',exact:true}).click()
  await expect(page.getByRole('button',{name:'Guess Prizes',exact:true})).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Guess Prizes',exact:true})).toBeVisible()
  await expect(page.getByText('2:00',{exact:true})).toBeVisible()
})

test('keyboard selection, summary dismissal, and repeat play work', async ({page}) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await openApp(page)
  await startGame(page)
  await page.getByRole('button',{name:'Guess Prizes',exact:true}).click()
  const guesses = page.getByRole('button', { name: /, copy \d+$/ })
  await expect(guesses).toHaveCount(60)
  for (let i=0; i<6; i++) {
    await guesses.nth(i).focus()
    await page.keyboard.press('Space')
  }
  await expect(page.getByRole('button',{name:'Submit Guesses'})).toBeEnabled()
  await page.getByRole('button',{name:'Submit Guesses'}).click()
  const modal = page.getByRole('dialog',{name:'Practice results'})
  await expect(modal).toBeVisible()
  const savedRank = await page.evaluate(()=>localStorage.getItem('prizeCheckerRankState:v2'))
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(page.getByRole("button",{name:"View Summary"})).toBeFocused()
  await page.getByRole('button',{name:'View Summary'}).click()
  expect(await page.evaluate(()=>localStorage.getItem('prizeCheckerRankState:v2'))).toBe(savedRank)
  await page.getByRole('button',{name:'Play Again'}).click()
  await expect(page.getByRole('button',{name:'Guess Prizes',exact:true})).toBeVisible()
  expect(errors).toEqual([])
})

test('consent does not load advertising before acceptance or after decline', async ({page}) => {
  await page.addInitScript(()=>localStorage.setItem('pcd_has_seen_help','true'))
  await page.route('https://**/*', route=>route.abort())
  await page.goto('/')
  await expect(page.locator('script[src*="adsbygoogle"]')).toHaveCount(0)
  await page.getByRole('button',{name:'Decline',exact:true}).click()
  await page.reload()
  await expect(page.locator('script[src*="adsbygoogle"]')).toHaveCount(0)
  await page.context().clearCookies()
  await page.reload()
  await page.getByRole('button',{name:'Accept',exact:true}).click()
  await expect(page.locator('script[src*="adsbygoogle"]')).toHaveCount(1)
})

test('help dialog supports Escape and accessible controls', async ({page}) => {
  await openApp(page)
  await page.getByRole('button',{name:'How to use PrizeCheck.us',exact:true}).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const result = await new AxeBuilder({page}).include('[role="dialog"]').withRules(['button-name','aria-dialog-name','aria-valid-attr-value']).analyze()
  expect(result.violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button',{name:'How to use PrizeCheck.us',exact:true})).toBeFocused()
})

test('an old lookup response cannot validate edited text', async ({page}) => {
  await openApp(page)
  await importDeck(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  let requested!: () => void
  const requestStarted = new Promise<void>(resolve => { requested = resolve })
  await page.route('**/api/cards', async route => {
    requested()
    await gate
    await route.continue()
  })
  await page.getByRole('button',{name:'Import Deck',exact:true}).click()
  await requestStarted
  await page.getByRole('button',{name:'Edit full list'}).click()
  await page.getByRole('textbox',{name:'Deck list'}).fill(FEATURED_DECKS[1].importText)
  release()
  await expect(page.getByRole('button',{name:'Import Deck',exact:true})).toBeVisible()
  await expect(page.getByText('Deck ready',{exact:true})).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Start Game',exact:true})).toHaveAttribute('aria-disabled','true')
})

test('the import and game screens fit the viewport', async ({page}) => {
  await openApp(page)
  await importDeck(page)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.getByRole('button',{name:'Start Game',exact:true}).click()
  await expect(page.getByRole('button',{name:'Guess Prizes',exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  const carousel = await page.locator('#practice-carousel').boundingBox()
  const arrow = await page.getByRole('button',{name:'Next card',exact:true}).boundingBox()
  expect(arrow!.y + arrow!.height).toBeLessThanOrEqual(carousel!.y + carousel!.height)
  await page.screenshot({path:test.info().outputPath('game.png'),fullPage:true})
})

test('featured cards stay accessible without clipping the first card', async ({page}, testInfo) => {
  await openApp(page)
  const widths = testInfo.project.name === 'mobile' ? [390, 768] : [1024, 1280, 1600]
  for (const width of widths) {
    await page.setViewportSize({width, height:900})
    const strip = page.getByTestId('featured-card-strip')
    const cards = page.getByTestId('featured-card')
    await expect(cards).toHaveCount(5)
    await expect(cards.first()).toHaveAttribute('data-phase','shown')
    // Test the settled layout independently of the deck-change animation.
    await page.addStyleTag({content:'[data-testid="featured-card"] { transition: none !important; transform: none !important; }'})
    await expect.poll(async () => {
      const bounds = (await strip.boundingBox())!
      const first = (await cards.first().boundingBox())!
      return first.x >= bounds.x && first.x + first.width <= bounds.x + bounds.width
    }).toBe(true)
    if (width >= 1024) {
      const bounds = (await strip.boundingBox())!
      for (const card of await cards.all()) {
        const box = (await card.boundingBox())!
        expect(box.x).toBeGreaterThanOrEqual(bounds.x)
        expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width)
      }
      expect(await strip.evaluate(el=>el.scrollWidth <= el.clientWidth)).toBe(true)
    } else {
      await strip.evaluate(el=>{el.scrollLeft=el.scrollWidth})
      const bounds = (await strip.boundingBox())!
      const last = (await cards.last().boundingBox())!
      expect(last.x).toBeGreaterThanOrEqual(bounds.x)
      expect(last.x + last.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1)
      await strip.evaluate(el=>{el.scrollLeft=0})
    }
  }
})

test('completed practice is recorded once and available for review', async ({page}) => {
  await openApp(page)
  await startGame(page)
  await page.getByRole('button',{name:'Guess Prizes',exact:true}).click()
  const guesses = page.getByRole('button', { name: /, copy \d+$/ })
  for (let i=0;i<6;i++) await guesses.nth(i).click()
  await page.getByRole('button',{name:'Submit Guesses'}).click()
  await expect(page.getByRole('dialog',{name:'Practice results'})).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button',{name:'Practice history',exact:true}).click()
  const history = page.getByRole('dialog',{name:'Practice history'})
  await expect(history.getByText('Accuracy',{exact:true})).toBeVisible()
  await expect(history.getByText('Prize frequency',{exact:true})).toBeVisible()
  await history.getByRole('textbox',{name:'Deck name',exact:true}).fill('My tournament deck')
  await history.getByRole('textbox',{name:'Deck name',exact:true}).press('Enter')
  await expect(history.getByRole('button',{name:'History deck',exact:true})).toHaveText('My tournament deck')

  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('prizecheck:practice-history:v1') || '[]').length)).toBe(1)
  await history.getByRole('button',{name:'Close history',exact:true}).click()
  await page.getByRole('button',{name:'View Summary'}).click()
  await page.keyboard.press('Escape')
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('prizecheck:practice-history:v1') || '[]').length)).toBe(1)
  await page.getByRole('button',{name:'Practice history',exact:true}).click()
  await history.getByRole('button',{name:'Clear device history',exact:true}).click()
  await history.getByRole('button',{name:'Confirm clear history',exact:true}).click()
  await expect(history.getByText('Your progress starts with your first round.',{exact:true})).toBeVisible()
})


test('untimed practice does not expire or change standard rank', async ({page}) => {
  await openApp(page)
  await importDeck(page)
  await page.getByRole('button',{name:'Practice mode'}).click()
  await page.getByRole('option',{name:'Untimed',exact:true}).click()
  await page.getByRole('button',{name:'Start Game',exact:true}).click()
  await expect(page.getByText('Untimed · elapsed',{exact:true})).toBeVisible()
  await page.clock.install()
  await page.clock.fastForward(180000)
  await expect(page.getByRole('button',{name:'Guess Prizes',exact:true})).toBeVisible()
  const before=await page.evaluate(()=>localStorage.getItem('prizeCheckerRankState:v2'))
  await page.getByRole('button',{name:'Guess Prizes',exact:true}).click()
  const guesses=page.getByRole('button',{name:/, copy \d+$/})
  for(let i=0;i<6;i++)await guesses.nth(i).click()
  await page.getByRole('button',{name:'Submit Guesses',exact:true}).click()
  await page.keyboard.press('Escape')
  await expect(page.getByText('Custom practice · standard rank unchanged.',{exact:true})).toBeVisible()
  expect(await page.evaluate(()=>localStorage.getItem('prizeCheckerRankState:v2'))).toBe(before)
})

test('progress filters support keyboard and inline names save or cancel',async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem('prizecheck:practice-history:v1',JSON.stringify([{id:'fixture',deckKey:'deck',deckName:'Fixture',at:1,scoringVersion:2,duration:120,correct:4,seconds:80,missed:[],prizeGroups:[{name:'Dawn',deckCount:4,prizeCount:2,missedCount:1},{name:'Energy',deckCount:10,prizeCount:4,missedCount:1}]}])))
 await openApp(page)
 await page.locator('#deck-library-trigger').click()
 // Guest progress is accessible from a completed round; exercise that standalone view.
 await page.keyboard.press('Escape')
 await startGame(page)
 await page.getByRole('button',{name:'Guess Prizes',exact:true}).click()
 const guesses=page.getByRole('button',{name:/, copy \d+$/})
 for(let i=0;i<6;i++)await guesses.nth(i).click()
 await page.getByRole('button',{name:'Submit Guesses'}).click()
 await page.keyboard.press('Escape')
 await page.getByRole('button',{name:'Practice history',exact:true}).click()
 const picker=page.getByRole('button',{name:'History mode',exact:true})
 await picker.press('ArrowDown')
 await page.keyboard.press('End')
 await page.keyboard.press('Enter')
 await expect(picker).toHaveText('Untimed')
 await picker.press('ArrowDown')
 await page.keyboard.press('Escape')
 await expect(picker).toBeFocused()
 await expect(page.getByRole('dialog')).toHaveCount(1)
 const name=page.getByRole('textbox',{name:'Deck name',exact:true})
 const before=await name.inputValue()
 await name.fill('Discard');await name.press('Escape');await expect(name).toHaveValue(before)
 await name.fill('  ');await name.press('Enter');await expect(page.getByRole('alert')).toContainText('1–80')
 await name.fill('Edited deck');await name.press('Tab');await expect(name).toHaveValue('Edited deck')
 await expect(page.getByRole('button',{name:'History deck',exact:true})).toContainText('Edited deck')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)
 await picker.click();await page.getByRole('option',{name:'2 minutes',exact:true}).click()
 await page.getByRole('dialog').evaluate(el=>{el.scrollTop=0})
 await page.screenshot({path:info.outputPath('progress.png'),fullPage:false})
})
