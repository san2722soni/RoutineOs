const { withDangerousMod, withMainApplication, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

module.exports = function withPlacesBridge(config) {
  config = withMainApplication(config, (mod) => {
    if (!mod.modResults.contents.includes('packages.add(PlacesAutocompletePackage())')) {
      mod.modResults.contents = mod.modResults.contents.replace('PackageList(this).packages.apply {', 'PackageList(this).packages.apply {\n            packages.add(PlacesAutocompletePackage())');
    }
    return mod;
  });
  config = withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes('com.google.android.libraries.places:places')) {
      mod.modResults.contents = mod.modResults.contents.replace('dependencies {', 'dependencies {\n    implementation("com.google.android.libraries.places:places:4.4.1")');
    }
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const packageName = config.android.package;
    const target = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/java', ...packageName.split('.'));
    await fs.mkdir(target, { recursive: true });
    for (const name of ['PlacesAutocompleteModule.kt', 'PlacesAutocompletePackage.kt']) {
      const source = await fs.readFile(path.join(mod.modRequest.projectRoot, 'native/android', name), 'utf8');
      await fs.writeFile(path.join(target, name), source.replace('package com.anonymous.RoutineOs', `package ${packageName}`));
    }
    return mod;
  }]);
};
