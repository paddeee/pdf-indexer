import '@ionic/core';
import { Component, State } from '@stencil/core';
import { Plugins, FilesystemDirectory } from '@capacitor/core';

const { Filesystem } = Plugins;

@Component({
  tag: 'my-app',
  styleUrl: 'my-app.css'
})
export class MyApp {

  @State() directoryStructure: any = [
    { text: "Furniture", type: 'directory', items: [
        { text: "Sofas", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
        { text: "Tables & Chairs", type: 'directory', items: [
            { text: "Tables.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
            { text: "Chairs.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' }
          ]
        },
        { text: "Occasional Furniture", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' }
      ]
    },
    { text: "Kitchen Units.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
    { text: "Decor", type: 'directory', items: [
        { text: "Bed Linen", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
        { text: "Carpets", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
        { text: "Curtains & Blinds", type: 'directory', items: [
            { text: "Curtains.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' },
            { text: "Blinds.pdf", type: 'file', items: [], thumbImage: 'PathOrDataURI.jpg' }
          ]
        }
      ]
    }
  ];

  componentWillLoad() {
    this.sortDirectories(this.directoryStructure);
  }

  // Used recursively to drill down through directories to group directories
  sortDirectories(directories) {
    directories.sort(this.compareDirectoriesHelper.bind(this))
  }

  compareDirectoriesHelper(a, b) {
    if (a.items.length < b.items.length) {
      this.sortDirectories(b.items);
      return 1;
    } else if (a.items.length > b.items.length) {
      this.sortDirectories(a.items);
      return -1;
    }
    return 0;
  }

  async readDirectory() {
    try {
      const ret = await Filesystem.readdir({
        path: 'CPSFiles',
        directory: FilesystemDirectory.Documents
      });
      console.log(ret);
    } catch(e) {
      console.error('Unable to read dir', e);
    }
  }

  createDirectoryTree(directory) {
    const directoryLength = directory.length;

    if(directoryLength > 0) {
      return (
        <ul> {
          directory.map(subDirectory => {
            return (
              <li>
                {subDirectory.text}
                {this.createDirectoryTree(subDirectory.items)}
              </li>
            )
          })
        }
        </ul>
      )
    }
  }

  render() {
    return [
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Home</ion-title>
        </ion-toolbar>
      </ion-header>,
      <ion-content>
        <div class="container">
          <div class="treeview">
            <p>
              <ion-button onClick={() => this.readDirectory()}>Parse Files</ion-button>
            </p>
            {this.createDirectoryTree(this.directoryStructure)}
          </div>
          <div class="preview-image">
            <ion-card class="image-card">Preview Image</ion-card>
          </div>
        </div>
      </ion-content>
    ];
  }
}
