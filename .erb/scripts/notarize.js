const { notarize } = require('@electron/notarize');
const { build } = require('../../package.json');

exports.default = async function notarizeMacos(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  if (
    !process.env.APPLE_ID ||
    !process.env.APPLE_APP_SPECIFIC_PASSWORD ||
    !process.env.APPLE_TEAM_ID
  ) {
    console.warn(
      'Skipping notarizing step. APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID env variables must be set',
    );
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  console.log('Notarizing macOS app...');
  console.log('appBundleId:', build.appId);
  console.log('appPath:', `${appOutDir}/${appName}.app`);

  await notarize({
    tool: 'notarytool',
    appBundleId: build.appId,
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });

  console.log('Notarization complete.');
};
