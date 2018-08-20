import packager from 'electron-packager';
import rebuild from 'electron-rebuild';

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
  'version': electronVersion,
  'afterCopy': [(buildPath, '2.0.7', 'darwin', 'all') => {
    rebuild({ buildPath, electronVersion, 'all' })
      .then(() => {
        console.log('Electron Rebuild successful');
      })
      .catch(error => console.log(error));
  }]
}

packager(options)
.then(appPaths => {
  console.log(appPaths);
});
