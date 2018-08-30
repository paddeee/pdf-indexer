const packager = require('electron-packager');

const buildVersion = '1.0.0';
const electronVersion = '2.0.7';

const options = {
  'app-version': buildVersion,
  'asar': true,
  'arch': 'x64',
  'dir': './electron',
  'icon': './electron/app/assets/icon/SITFonline.ico',
  'name': 'OpCircus',
  'productName': 'Operation Circus 2 - Evidence Viewer',
  'out': '/Users/ODonnell/OPCircus/Builds',
  'overwrite': true,
  'platform': 'win32',
  'version': electronVersion,
  'version-string': {
    'CompanyName': 'Evidential Ltd',
    'FileDescription': 'Operation Circus 2',
    'OriginalFilename': 'OpCircus',
    'ProductName': 'OpCircus',
    'InternalName': 'OpCircus'
  }
};

packager(options)
.then(appPaths => {
  console.log(appPaths);
});
