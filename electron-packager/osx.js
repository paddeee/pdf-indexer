const packager = require('electron-packager');

const buildVersion = '1.0.0';
const electronVersion = '2.0.7';

const options = {
  'app-version': buildVersion,
  'app-category-type': 'public.app-category.business',
  'asar': true,
  'arch': 'all',
  'dir': './electron',
  'icon': './electron/app/assets/icon/SITFonline.ico.icns',
  'name': 'OpCircus',
  'productName': 'Operation Circus 2 - Evidence Viewer',
  'out': '/Users/ODonnell/OPCircus/Builds',
  'overwrite': true,
  'platform': 'darwin',
  'version': electronVersion
}

packager(options)
.then(appPaths => {
  console.log(appPaths);
});
