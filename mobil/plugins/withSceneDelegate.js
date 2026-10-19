// iOS 27 asserts at launch unless the app uses the scene life cycle. Expo ships
// ExpoAppSceneDelegate for this, but the prebuild template still starts React Native from the
// app delegate. This registers the scene delegate in Info.plist and lets it own the window:
// the app delegate only creates the factory and hands it over through
// ExpoReactNativeFactoryProvider.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const START_BLOCK = /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

module.exports = function withSceneDelegate(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' },
        ],
      },
    };
    return config;
  });

  return withAppDelegate(config, (config) => {
    let src = config.modResults.contents;
    if (config.modResults.language !== 'swift') throw new Error('withSceneDelegate expects a Swift AppDelegate');
    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      const conformed = src.replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
      const started = conformed.replace(START_BLOCK, '');
      if (conformed === src || started === conformed) {
        throw new Error('withSceneDelegate: the AppDelegate template changed; update the plugin');
      }
      src = started;
    }
    config.modResults.contents = src;
    return config;
  });
};
