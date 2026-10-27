"""User-flow helpers shared by legacy upgrade and current card regression checks."""
from playwright.sync_api import expect

def expand_guides(page):
    toggle=page.locator('.v-destination-toggle').first
    if not toggle.count():return
    expect(toggle).to_be_enabled()
    if toggle.get_attribute('aria-expanded')=='false':toggle.click()
    page.locator('.v-guide-main').first.wait_for()

def open_guide(page):
    expand_guides(page)
    page.locator('[data-action="open"]').first.click()

def store_button(page,saved=False):
    expand_guides(page)
    if page.locator('.v-guide-save').count():
        button=page.locator('.v-guide-save').first
        expect(button).to_have_attribute('data-save-state','saved' if saved else 'missing')
        return button
    return page.locator('[data-action="delete"]' if saved else '[data-action="manage"]').first

def wait_saved(page):
    if page.locator('.v-guide-save').count():
        page.locator('.v-guide-save[data-save-state="saved"]').wait_for(timeout=60000)
    else:page.get_by_role('button',name='다운로드 완료',exact=True).wait_for(timeout=60000)
