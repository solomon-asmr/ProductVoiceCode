describe('ProductVoiceCode', () => {
  beforeAll(async () => {
    // Launch the app on the emulator
    await device.launchApp();
  });

  beforeEach(async () => {
    // Reload the app before each test
    await device.reloadReactNative();
  });

  it('should show the microphone button on launch', async () => {
    await expect(element(by.text('ProductVoiceCode'))).toBeVisible();
    await expect(element(by.id('mic-button'))).toBeVisible();
    await expect(element(by.text('Tap mic to start'))).toBeVisible();
  });

  it('should show listening text when mic is tapped', async () => {
    // Note: This test only checks the UI state, not real audio.
    await element(by.id('mic-button')).tap();
    await expect(element(by.text('Listening...'))).toBeVisible();

    // Tap again to stop
    await element(by.id('mic-button')).tap();
    await expect(element(by.text('Tap mic to start'))).toBeVisible();
  });
});
