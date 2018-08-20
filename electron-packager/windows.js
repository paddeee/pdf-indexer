import packager from 'electron-packager';
import rebuild from 'electron-rebuild';

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
  },
  'afterCopy': [(buildPath, '2.0.7', 'win32', 'x64') => {
    rebuild({ buildPath, electronVersion, 'x64' })
      .then(() => console.log('Electron Rebuild successful'))
      .catch((error) => console.log(error));
  }]
}

packager(options)
.then(appPaths => {
  console.log(appPaths);
});
